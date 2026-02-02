-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Users can create folders" ON public.document_folders;

-- Create policy allowing any authenticated user to create folders
CREATE POLICY "Any authenticated user can create folders"
ON public.document_folders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure update and delete policies also allow any authenticated user
DROP POLICY IF EXISTS "Users can update folders" ON public.document_folders;
DROP POLICY IF EXISTS "Users can delete folders" ON public.document_folders;

CREATE POLICY "Any authenticated user can update folders"
ON public.document_folders
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Any authenticated user can delete folders"
ON public.document_folders
FOR DELETE
TO authenticated
USING (true);