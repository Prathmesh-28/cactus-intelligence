-- analyses table
create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  company_name text not null,
  company_slug text not null,
  company_profile jsonb,
  competitors jsonb,
  org_charts jsonb,
  talent_insights jsonb,
  investment_signals jsonb,
  status text default 'pending',
  user_id uuid references auth.users(id) on delete cascade
);

-- Row-level security
alter table analyses enable row level security;

create policy "Users can read own analyses"
  on analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own analyses"
  on analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own analyses"
  on analyses for update
  using (auth.uid() = user_id);

create policy "Users can delete own analyses"
  on analyses for delete
  using (auth.uid() = user_id);

-- due_diligence_checks table
create table if not exists due_diligence_checks (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references analyses(id) on delete cascade,
  item_text text,
  completed boolean default false,
  completed_at timestamptz
);

alter table due_diligence_checks enable row level security;

create policy "Users can manage own dd checks"
  on due_diligence_checks for all
  using (
    exists (
      select 1 from analyses
      where analyses.id = due_diligence_checks.analysis_id
        and analyses.user_id = auth.uid()
    )
  );

-- Index for fast slug lookups
create index if not exists analyses_slug_user_idx on analyses(company_slug, user_id, created_at desc);
