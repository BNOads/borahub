-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_folders ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to create and update documents (needed for non-admin folder/doc creation)
DROP POLICY IF EXISTS "Any authenticated user can create documents" ON public.documents;
CREATE POLICY "Any authenticated user can create documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Any authenticated user can update documents" ON public.documents;
CREATE POLICY "Any authenticated user can update documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- (Optional) allow delete only if you later decide; keeping it admin-only by not adding permissive delete policy.
