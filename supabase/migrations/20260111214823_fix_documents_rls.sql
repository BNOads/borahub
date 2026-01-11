-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for authenticated users on documents" ON public.documents;
DROP POLICY IF EXISTS "Enable public access for shared documents" ON public.documents;

-- Create more permissive policies
CREATE POLICY "Enable all access for authenticated users on documents" ON public.documents
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Enable public access for shared documents
CREATE POLICY "Enable public access for shared documents" ON public.documents
    FOR SELECT
    USING (is_public = true);
