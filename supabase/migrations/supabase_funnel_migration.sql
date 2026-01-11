-- Execute esse comando no SQL Editor do seu projeto Supabase (xvgermmegyipzmiwewzo)

-- Criação da tabela de funis
create table if not exists public.funnels (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  product_name text,
  predicted_investment numeric,
  drive_link text,
  dashboard_link text,
  briefing_link text,
  status text default 'active' check (status in ('active', 'finished', 'archived')),
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar segurança a nível de linha (RLS)
alter table public.funnels enable row level security;

-- Criar políticas de acesso
create policy "Enable read access for all users"
on public.funnels for select
using (true);

create policy "Enable insert for authenticated users only"
on public.funnels for insert
with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only"
on public.funnels for update
using (auth.role() = 'authenticated');
