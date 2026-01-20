-- Permitir seller_id nulo para vendas importadas da Hotmart sem vendedor atribuído
ALTER TABLE public.sales ALTER COLUMN seller_id DROP NOT NULL;