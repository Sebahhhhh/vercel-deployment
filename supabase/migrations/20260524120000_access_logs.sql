create table public.access_logs (
  id uuid primary key default gen_random_uuid(),
  path text,
  ip text,
  user_agent text,
  device text,
  browser text,
  os text,
  created_at timestamptz not null default now()
);

create table public.registration_email_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  path text,
  ip text,
  user_agent text,
  device text,
  browser text,
  os text,
  created_at timestamptz not null default now()
);

create index access_logs_created_at_idx on public.access_logs (created_at desc);
create index registration_email_attempts_created_at_idx on public.registration_email_attempts (created_at desc);
create index registration_email_attempts_email_idx on public.registration_email_attempts (lower(email));

alter table public.access_logs enable row level security;
alter table public.registration_email_attempts enable row level security;
