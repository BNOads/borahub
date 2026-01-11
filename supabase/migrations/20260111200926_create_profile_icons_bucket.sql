-- Create the profile_icons storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile_icons',
    'profile_icons',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Allow public read access to profile_icons
CREATE POLICY "Public read access for profile_icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile_icons');

-- Allow authenticated users to upload to profile_icons
CREATE POLICY "Allow uploads to profile_icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile_icons');

-- Allow authenticated users to update their uploads
CREATE POLICY "Allow updates to profile_icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile_icons');

-- Allow authenticated users to delete from profile_icons
CREATE POLICY "Allow deletes from profile_icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile_icons');
