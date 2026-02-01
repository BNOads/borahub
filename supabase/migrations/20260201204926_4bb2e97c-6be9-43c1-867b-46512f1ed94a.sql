-- Permitir que o próprio vendedor crie a venda quando seller_id/created_by forem dele
-- (mantendo admin/manager/finance com permissão total de criação)

DROP POLICY IF EXISTS "Finance and Admin can create sales" ON public.sales;

CREATE POLICY "Users can create sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR is_finance_department(auth.uid())
  OR (
    seller_id = auth.uid()
    AND created_by = auth.uid()
  )
);
