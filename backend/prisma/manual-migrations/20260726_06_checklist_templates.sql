create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  scheduled_months smallint[] not null default array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]::smallint[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint checklist_templates_scheduled_months_check check (
    cardinality(scheduled_months) > 0
    and scheduled_months <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]::smallint[]
  )
);

create table if not exists public.checklist_template_activities (
  checklist_template_id uuid not null references public.checklist_templates(id) on delete cascade,
  activity_template_id uuid not null references public.activity_templates(id) on delete restrict,
  display_order integer not null default 0,
  primary key (checklist_template_id, activity_template_id)
);

create table if not exists public.client_checklist_templates (
  client_id uuid not null references public.clients(id) on delete cascade,
  checklist_template_id uuid not null references public.checklist_templates(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (client_id, checklist_template_id)
);

insert into public.checklist_templates (name)
select concat('Paquete ', area.name)
from public.activity_areas area
on conflict (name) do nothing;

insert into public.checklist_template_activities (
  checklist_template_id,
  activity_template_id,
  display_order
)
select package.id, activity.id, activity.display_order
from public.activity_templates activity
join public.activity_areas area on area.id = activity.area_id
join public.checklist_templates package on package.name = concat('Paquete ', area.name)
on conflict (checklist_template_id, activity_template_id) do nothing;

create index if not exists checklist_template_activities_activity_idx
  on public.checklist_template_activities (activity_template_id);
