create table if not exists public.activity_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.activity_templates
  add column if not exists area_id uuid null;

insert into public.activity_areas (name)
select distinct trim(area)
from public.activity_templates
where coalesce(trim(area), '') <> ''
on conflict (name) do nothing;

update public.activity_templates template
set area_id = area.id
from public.activity_areas area
where template.area_id is null
  and area.name = trim(template.area);

alter table public.activity_templates
  drop constraint if exists activity_templates_area_id_fkey,
  add constraint activity_templates_area_id_fkey
    foreign key (area_id) references public.activity_areas(id) on delete restrict;

create index if not exists activity_templates_area_id_idx
  on public.activity_templates (area_id);
