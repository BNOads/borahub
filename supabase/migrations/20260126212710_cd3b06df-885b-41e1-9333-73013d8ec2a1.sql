-- Add tracking columns to sales table for UTM and source information
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tracking_source TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tracking_source_sck TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tracking_external_code TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN public.sales.tracking_source IS 'Origem do tráfego (ex: HOTMART, GOOGLE, FACEBOOK)';
COMMENT ON COLUMN public.sales.tracking_source_sck IS 'Source SCK da Hotmart (ex: HOTMART_PRODUCT_PAGE, src)';
COMMENT ON COLUMN public.sales.tracking_external_code IS 'Código externo de rastreamento (UTM ou src)';