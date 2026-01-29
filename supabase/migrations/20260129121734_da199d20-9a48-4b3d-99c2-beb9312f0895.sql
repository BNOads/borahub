-- Create function to check if user is in Finance department
CREATE OR REPLACE FUNCTION public.is_finance_department(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND department_id = 'eab14b88-c7d9-4aeb-99a4-3ce6fe193630' -- Finance department ID
      AND is_active = true
  )
$$;

-- Drop existing policies for sales
DROP POLICY IF EXISTS "Sellers can view own sales" ON public.sales;
DROP POLICY IF EXISTS "Finance and Admin can create sales" ON public.sales;
DROP POLICY IF EXISTS "Finance and Admin can update sales" ON public.sales;

-- Recreate sales policies including finance department check
CREATE POLICY "Users can view sales"
ON public.sales FOR SELECT
USING (
  seller_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR is_finance_department(auth.uid())
);

CREATE POLICY "Finance and Admin can create sales"
ON public.sales FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR is_finance_department(auth.uid())
);

CREATE POLICY "Finance and Admin can update sales"
ON public.sales FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR is_finance_department(auth.uid())
);

-- Drop existing policies for installments
DROP POLICY IF EXISTS "Users can view installments of their sales" ON public.installments;
DROP POLICY IF EXISTS "Finance and Admin can manage installments" ON public.installments;

-- Recreate installments policies
CREATE POLICY "Users can view installments"
ON public.installments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = installments.sale_id 
    AND (
      s.seller_id = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role)
      OR is_finance_department(auth.uid())
    )
  )
);

CREATE POLICY "Finance and Admin can manage installments"
ON public.installments FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR is_finance_department(auth.uid())
);

-- Drop existing policies for commissions
DROP POLICY IF EXISTS "Sellers can view own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Finance and Admin can manage commissions" ON public.commissions;

-- Recreate commissions policies
CREATE POLICY "Users can view commissions"
ON public.commissions FOR SELECT
USING (
  seller_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR is_finance_department(auth.uid())
);

CREATE POLICY "Finance and Admin can manage commissions"
ON public.commissions FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR is_finance_department(auth.uid())
);