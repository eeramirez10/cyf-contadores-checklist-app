begin;

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  alter column id set default gen_random_uuid(),
  add column if not exists email text,
  add column if not exists password_hash text,
  add column if not exists is_active boolean not null default true,
  add column if not exists password_changed_at timestamptz;

update public.profiles as profile
set email = lower(auth_user.email)
from auth.users as auth_user
where profile.id = auth_user.id
  and profile.email is null
  and auth_user.email is not null;

alter table public.profiles
  drop constraint if exists profiles_email_key;

alter table public.profiles
  add constraint profiles_email_key unique (email);

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  refresh_token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auth_sessions_profile_id_idx
  on public.auth_sessions (profile_id);

create index if not exists auth_sessions_expires_at_idx
  on public.auth_sessions (expires_at);

alter table public.auth_sessions enable row level security;

commit;
