create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled note',
  body text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

drop policy if exists "Public notes are readable" on public.notes;
create policy "Public notes are readable"
on public.notes
for select
to anon
using (true);

drop policy if exists "Public notes are insertable" on public.notes;
create policy "Public notes are insertable"
on public.notes
for insert
to anon
with check (true);

drop policy if exists "Public notes are editable" on public.notes;
create policy "Public notes are editable"
on public.notes
for update
to anon
using (true)
with check (true);

drop policy if exists "Public notes are deletable" on public.notes;
create policy "Public notes are deletable"
on public.notes
for delete
to anon
using (true);
