-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all authenticated users to read courses" ON public.courses;
DROP POLICY IF EXISTS "Allow all authenticated users to insert courses" ON public.courses;
DROP POLICY IF EXISTS "Allow all authenticated users to update courses" ON public.courses;
DROP POLICY IF EXISTS "Allow all authenticated users to delete courses" ON public.courses;

DROP POLICY IF EXISTS "Allow all authenticated users to read lessons" ON public.lessons;
DROP POLICY IF EXISTS "Allow all authenticated users to insert lessons" ON public.lessons;
DROP POLICY IF EXISTS "Allow all authenticated users to update lessons" ON public.lessons;
DROP POLICY IF EXISTS "Allow all authenticated users to delete lessons" ON public.lessons;

-- Create more permissive policies
CREATE POLICY "Enable all access for courses" ON public.courses
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all access for lessons" ON public.lessons
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all access for progress" ON public.user_lesson_progress
    FOR ALL
    USING (true)
    WITH CHECK (true);
