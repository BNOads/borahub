-- Create table to store sales product names linked to funnels (for products from Asaas/other sources without product_id)
CREATE TABLE public.funnel_sales_products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(funnel_id, product_name)
);

-- Enable RLS
ALTER TABLE public.funnel_sales_products ENABLE ROW LEVEL SECURITY;

-- Create policies - allow all authenticated users to read
CREATE POLICY "Users can view funnel sales products"
ON public.funnel_sales_products
FOR SELECT
USING (true);

-- Only allow insert/delete for authenticated users
CREATE POLICY "Authenticated users can insert funnel sales products"
ON public.funnel_sales_products
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete funnel sales products"
ON public.funnel_sales_products
FOR DELETE
USING (auth.uid() IS NOT NULL);