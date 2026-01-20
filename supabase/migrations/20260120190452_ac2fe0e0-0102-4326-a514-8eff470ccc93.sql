-- Add external_installment_id to track individual Asaas payment IDs for each installment
ALTER TABLE installments 
ADD COLUMN IF NOT EXISTS external_installment_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_installments_external_installment_id 
ON installments(external_installment_id);

-- Add comment for documentation
COMMENT ON COLUMN installments.external_installment_id IS 'ID do pagamento individual no Asaas (payment.id)';