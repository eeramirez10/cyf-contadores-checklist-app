alter table public.activity_templates
  add column if not exists scheduled_months smallint[] not null
  default array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]::smallint[];

alter table public.client_activities
  add column if not exists scheduled_months smallint[] not null
  default array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]::smallint[];

alter table public.checklist_entries
  add column if not exists activity_name text,
  add column if not exists area_snapshot text,
  add column if not exists weight_snapshot numeric(5, 2);

update public.client_activities activity
set scheduled_months = template.scheduled_months
from public.activity_templates template
where activity.template_id = template.id;

update public.checklist_entries entry
set activity_name = activity.name,
    area_snapshot = activity.area,
    weight_snapshot = activity.weight
from public.client_activities activity
where activity.client_id = entry.client_id
  and activity.template_id = entry.template_id
  and (
    entry.activity_name is null
    or entry.area_snapshot is null
    or entry.weight_snapshot is null
  );

alter table public.activity_templates
  drop constraint if exists activity_templates_scheduled_months_check,
  add constraint activity_templates_scheduled_months_check
  check (
    cardinality(scheduled_months) > 0
    and scheduled_months <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]::smallint[]
  );

alter table public.client_activities
  drop constraint if exists client_activities_scheduled_months_check,
  add constraint client_activities_scheduled_months_check
  check (
    cardinality(scheduled_months) > 0
    and scheduled_months <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]::smallint[]
  );

create index if not exists checklist_entries_client_month_idx
  on public.checklist_entries (client_id, month);
