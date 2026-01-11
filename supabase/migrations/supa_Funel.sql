-- Garante que a coluna category existe na tabela funnels
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funnels' AND column_name='category') THEN
        ALTER TABLE public.funnels ADD COLUMN category text;
    END IF;
END $$;
-- Atualiza o cache do esquema para que a API reconheça a nova coluna imediatamente
NOTIFY pgrst, 'reload schema';
