-- Remove the old CHECK constraint and add a new one with Youtube
ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_post_type_check;

-- Add the new constraint including Youtube
ALTER TABLE social_posts ADD CONSTRAINT social_posts_post_type_check
    CHECK (post_type IN ('Reels', 'Carrossel', 'Imagem', 'Vídeo', 'Stories', 'Youtube'));
