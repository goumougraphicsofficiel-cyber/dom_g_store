begin;

create table if not exists public.order_email_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_key text not null,
  recipient_type text not null check (recipient_type in ('client', 'admin')),
  status_value text null,
  resend_email_id text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint order_email_events_order_event_unique unique (order_id, event_key)
);

alter table public.order_email_events enable row level security;

revoke all on table public.order_email_events from public, anon, authenticated;

create index if not exists order_email_events_order_id_idx
  on public.order_email_events (order_id);

comment on table public.order_email_events is
  'Journal serveur des e-mails transactionnels Resend, utilisé pour empêcher les doublons.';

commit;
