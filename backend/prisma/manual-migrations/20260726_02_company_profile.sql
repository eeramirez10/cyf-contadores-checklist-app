alter table public.clients
  add column if not exists legal_name text,
  add column if not exists rfc varchar(13),
  add column if not exists tax_regime text,
  add column if not exists ekey_reference text,
  add column if not exists address_street text,
  add column if not exists address_ext_no text,
  add column if not exists address_int_no text,
  add column if not exists address_colony text,
  add column if not exists address_postal_code varchar(5),
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_country text not null default 'Mexico';

alter table public.contacts
  add column if not exists position text,
  add column if not exists is_primary boolean not null default false;

create index if not exists clients_rfc_idx on public.clients (rfc);
create index if not exists contacts_client_primary_idx on public.contacts (client_id, is_primary);
