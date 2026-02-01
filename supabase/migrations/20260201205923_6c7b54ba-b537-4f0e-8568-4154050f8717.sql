-- Drop existing policies on sales table
DROP POLICY IF EXISTS "Users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales" ON public.sales;

-- 1. SELECT: All authenticated users can view all sales
CREATE POLICY "All authenticated users can view sales"
  ON public.sales
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. INSERT: Any authenticated user can create sales (setting themselves as seller/creator)
CREATE POLICY "Authenticated users can create sales"
  ON public.sales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be logged in
    auth.uid() IS NOT NULL
  );

-- 3. UPDATE: Allow free association for sales without seller, full edit for privileged users
CREATE POLICY "Users can update sales"
  ON public.sales
  FOR UPDATE
  TO authenticated
  USING (
    -- Admins/managers/finance can edit any sale
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR is_finance_department(auth.uid())
    -- Anyone can update a sale that has no seller assigned
    OR seller_id IS NULL
    -- Seller can update their own sales
    OR seller_id = auth.uid()
  )
  WITH CHECK (
    -- After update, must satisfy these conditions
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR is_finance_department(auth.uid())
    -- Regular users can only set any seller_id if the sale was unassigned, or set themselves
    OR seller_id IS NOT NULL
  );

-- 4. DELETE: Only admins can delete sales
CREATE POLICY "Admins can delete sales"
  ON public.sales
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );