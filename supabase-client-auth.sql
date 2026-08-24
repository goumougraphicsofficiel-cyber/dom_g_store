create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    phone,
    role,
    status,
    created_at,
    updated_at
  )
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    'client',
    'actif',
    now(),
    now()
  )
  on conflict (id) do update
  set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    updated_at = now();

  return new;
end;
$$;

revoke execute on function public.handle_new_auth_user()
from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

revoke update on table public.profiles
from authenticated;

grant update (
  first_name,
  last_name,
  phone,
  avatar_url,
  updated_at
) on public.profiles
to authenticated;
