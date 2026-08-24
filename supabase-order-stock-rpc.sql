begin;

create unique index if not exists inventory_one_standard_row_per_product
  on public.inventory (product_id)
  where variant_id is null;

create unique index if not exists inventory_one_row_per_variant
  on public.inventory (product_id, variant_id)
  where variant_id is not null;

create or replace function public.create_order_with_stock(
  p_order_number text,
  p_shipping jsonb,
  p_items jsonb
)
returns table (order_id uuid, order_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_existing_user_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_available integer;
  v_product_name text;
  v_product_sku text;
  v_variant_sku text;
  v_variant_size text;
  v_variant_color text;
  v_variant_found uuid;
  v_unit_price numeric;
  v_subtotal numeric := 0;
  v_shipping_method text;
  v_shipping numeric;
  v_discount numeric := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  if nullif(btrim(p_order_number), '') is null then
    raise exception using errcode = '22023', message = 'ORDER_NUMBER_REQUIRED';
  end if;

  if length(p_order_number) > 100 then
    raise exception using errcode = '22023', message = 'ORDER_NUMBER_TOO_LONG';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = v_user_id
      and profile.role = 'client'
      and profile.status = 'actif'
  ) then
    raise exception using errcode = '42501', message = 'ACTIVE_CLIENT_PROFILE_REQUIRED';
  end if;

  if p_shipping is null
     or jsonb_typeof(p_shipping) <> 'object'
     or nullif(btrim(p_shipping ->> 'first_name'), '') is null
     or nullif(btrim(p_shipping ->> 'last_name'), '') is null
     or nullif(btrim(p_shipping ->> 'phone'), '') is null
     or nullif(btrim(p_shipping ->> 'address'), '') is null
     or nullif(btrim(p_shipping ->> 'city'), '') is null then
    raise exception using errcode = '22023', message = 'INVALID_SHIPPING_ADDRESS';
  end if;

  v_shipping_method := nullif(btrim(p_shipping ->> 'method'), '');
  case v_shipping_method
    when 'Livraison standard' then v_shipping := 50000;
    when 'Livraison express' then v_shipping := 120000;
    when 'Retrait en boutique' then v_shipping := 0;
    else raise exception using errcode = '22023', message = 'INVALID_SHIPPING_METHOD';
  end case;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'ORDER_ITEMS_REQUIRED';
  end if;

  -- Sérialise les doubles clics et tentatives répétées portant la même clé.
  perform pg_advisory_xact_lock(hashtextextended(p_order_number, 0));

  select o.id, o.user_id
    into v_order_id, v_existing_user_id
  from public.orders as o
  where o.order_number = p_order_number;

  if v_order_id is not null then
    if v_existing_user_id is distinct from v_user_id then
      raise exception using errcode = '42501', message = 'ORDER_NUMBER_ALREADY_USED';
    end if;
    return query select v_order_id, p_order_number;
    return;
  end if;

  insert into public.orders (
    user_id,
    order_number,
    status,
    payment_status,
    subtotal,
    discount_amount,
    shipping_amount,
    total_amount,
    shipping_method,
    shipping_first_name,
    shipping_last_name,
    shipping_phone,
    shipping_address,
    shipping_district,
    shipping_city,
    shipping_country,
    tracking_number
  ) values (
    v_user_id,
    p_order_number,
    'en_attente',
    'en_attente',
    0,
    v_discount,
    v_shipping,
    0,
    v_shipping_method,
    nullif(p_shipping ->> 'first_name', ''),
    nullif(p_shipping ->> 'last_name', ''),
    nullif(p_shipping ->> 'phone', ''),
    nullif(p_shipping ->> 'address', ''),
    nullif(p_shipping ->> 'district', ''),
    nullif(p_shipping ->> 'city', ''),
    coalesce(nullif(p_shipping ->> 'country', ''), 'Guinée'),
    null
  )
  returning id into v_order_id;

  -- Ordre stable des verrous pour limiter le risque de deadlock.
  for v_item in
    select item.value
    from jsonb_array_elements(p_items) as item(value)
    order by item.value ->> 'product_id', coalesce(item.value ->> 'variant_id', '')
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_variant_id := nullif(v_item ->> 'variant_id', '')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception using errcode = '22023', message = 'INVALID_ITEM_QUANTITY';
    end if;

    select
      p.name,
      p.sku,
      pv.id,
      pv.sku,
      pv.size,
      pv.color,
      coalesce(pv.price, p.price)
    into
      v_product_name,
      v_product_sku,
      v_variant_found,
      v_variant_sku,
      v_variant_size,
      v_variant_color,
      v_unit_price
    from public.products as p
    left join public.product_variants as pv
      on pv.id = v_variant_id
     and pv.product_id = p.id
    where p.id = v_product_id
      and p.status = 'actif';

    if not found then
      raise exception using errcode = 'P0001', message = 'PRODUCT_UNAVAILABLE';
    end if;

    if v_variant_id is not null and v_variant_found is null then
      raise exception using errcode = 'P0001', message = 'VARIANT_UNAVAILABLE';
    end if;

    select coalesce(i.quantity, 0)
      into v_available
    from public.inventory as i
    where i.product_id = v_product_id
      and i.variant_id is not distinct from v_variant_id
    for update;

    if not found then
      raise exception using errcode = 'P0001', message = 'INVENTORY_NOT_FOUND';
    end if;

    if v_available < v_quantity then
      raise exception using
        errcode = 'P0001',
        message = 'INSUFFICIENT_STOCK',
        detail = format('product_id=%s variant_id=%s available=%s requested=%s', v_product_id, coalesce(v_variant_id::text, 'null'), v_available, v_quantity);
    end if;

    update public.inventory
    set quantity = v_available - v_quantity,
        updated_at = now()
    where product_id = v_product_id
      and variant_id is not distinct from v_variant_id;

    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      product_name,
      product_sku,
      variant_details,
      quantity,
      unit_price,
      total_price
    ) values (
      v_order_id,
      v_product_id,
      v_variant_id,
      v_product_name,
      coalesce(v_variant_sku, v_product_sku),
      case
        when v_variant_id is not null then nullif(concat_ws(' · ', v_variant_color, v_variant_size), '')
        else nullif(v_item ->> 'variant_details', '')
      end,
      v_quantity,
      v_unit_price,
      v_unit_price * v_quantity
    );

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  v_discount := least(v_discount, v_subtotal);

  update public.orders
  set subtotal = v_subtotal,
      discount_amount = v_discount,
      shipping_amount = v_shipping,
      total_amount = greatest(v_subtotal - v_discount + v_shipping, 0),
      updated_at = now()
  where id = v_order_id;

  return query select v_order_id, p_order_number;
end;
$$;

revoke all on function public.create_order_with_stock(text, jsonb, jsonb) from public;
revoke all on function public.create_order_with_stock(text, jsonb, jsonb) from anon;
grant execute on function public.create_order_with_stock(text, jsonb, jsonb) to authenticated;

commit;
