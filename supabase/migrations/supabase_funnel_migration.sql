-- Execute esse comando no SQL Editor do seu projeto Supabase (xvgermmegyipzmiwewzo)

-- 1. Garantir que a tabela existe (caso ainda não tenha sido criada)
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
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Garantir que a coluna category existe (caso a tabela já existisse sem ela)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funnels' AND column_name='category') THEN
        ALTER TABLE public.funnels ADD COLUMN category text;
    END IF;
END $$;

-- 3. Habilitar segurança a nível de linha (RLS)
alter table public.funnels enable row level security;

-- 4. Criar ou atualizar políticas de acesso
drop policy if exists "Enable read access for all users" on public.funnels;
create policy "Enable read access for all users"
on public.funnels for select
using (true);

drop policy if exists "Enable insert for authenticated users only" on public.funnels;
create policy "Enable insert for authenticated users only"
on public.funnels for insert
with check (auth.role() = 'authenticated');

drop policy if exists "Enable update for authenticated users only" on public.funnels;
create policy "Enable update for authenticated users only"
on public.funnels for update
using (auth.role() = 'authenticated');

-- 5. Notify PostgREST to reload schema (optional but helpful)
NOTIFY pgrst, 'reload schema';
