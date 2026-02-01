-- Drop the restrictive UPDATE policy
DROP POLICY IF EXISTS "Finance and Admin can update sales" ON public.sales;

-- Create a more flexible UPDATE policy that allows:
-- 1. Admin/Manager/Finance to update any sale
-- 2. Any authenticated user to update a sale where seller_id is NULL (associating themselves)
CREATE POLICY "Users can update sales"
  ON public.sales
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR is_finance_department(auth.uid())
    OR seller_id IS NULL
    OR seller_id = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR is_finance_department(auth.uid())
    OR seller_id = auth.uid()
  );