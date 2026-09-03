create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (
    char_length(email) between 5 and 254
    and email = lower(btrim(email))
    and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_email_unique
  on public.newsletter_subscribers (lower(email));

alter table public.newsletter_subscribers enable row level security;

revoke all on table public.newsletter_subscribers from anon, authenticated;
grant insert (email) on table public.newsletter_subscribers to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'newsletter_subscribers'
      and policyname = 'Anyone can subscribe to newsletter'
  ) then
    create policy "Anyone can subscribe to newsletter"
      on public.newsletter_subscribers
      for insert
      to anon, authenticated
      with check (
        char_length(email) between 5 and 254
        and email = lower(btrim(email))
        and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
      );
  end if;
end
$$;
