-- Relax RLS for social_profiles to allow manual management in dev
DROP POLICY IF EXISTS "Enable read for all" ON public.social_profiles;
DROP POLICY IF EXISTS "Enable all for authenticated profiles" ON public.social_profiles;
CREATE POLICY "Enable all for everyone" ON public.social_profiles FOR ALL USING (true) WITH CHECK (true);

-- Relax RLS for all content-related tables for this dev phase
DROP POLICY IF EXISTS "Enable read for all editorial" ON public.editorial_lines;
DROP POLICY IF EXISTS "Enable all for authenticated editorial" ON public.editorial_lines;
CREATE POLICY "Enable all for everyone editorial" ON public.editorial_lines FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for all posts" ON public.social_posts;
DROP POLICY IF EXISTS "Enable all for authenticated posts" ON public.social_posts;
CREATE POLICY "Enable all for everyone posts" ON public.social_posts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated comments" ON public.post_comments;
CREATE POLICY "Enable all for everyone comments" ON public.post_comments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated history" ON public.post_history;
CREATE POLICY "Enable all for everyone history" ON public.post_history FOR ALL USING (true) WITH CHECK (true);
