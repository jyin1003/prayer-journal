create table people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  status text not null check (status in ('frequent', 'longterm', 'archived')),
  created_at timestamptz default now()
);

create table entries (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people(id) on delete cascade not null,
  date date not null,
  points text[] not null,
  created_at timestamptz default now()
);

create table ticks (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people(id) on delete cascade not null,
  entry_date date not null,
  point_index int not null,
  created_at timestamptz default now(),
  unique (person_id, entry_date, point_index)
);

alter table people enable row level security;
alter table entries enable row level security;
alter table ticks enable row level security;

create policy "own people" on people for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own entries" on entries for all using (exists (select 1 from people where people.id = entries.person_id and people.user_id = auth.uid())) with check (exists (select 1 from people where people.id = entries.person_id and people.user_id = auth.uid()));
create policy "own ticks" on ticks for all using (exists (select 1 from people where people.id = ticks.person_id and people.user_id = auth.uid())) with check (exists (select 1 from people where people.id = ticks.person_id and people.user_id = auth.uid()));