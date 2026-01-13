-- Add content fields to social_posts table
ALTER TABLE social_posts
ADD COLUMN IF NOT EXISTS roteiro TEXT,
ADD COLUMN IF NOT EXISTS arquivos_link TEXT,
ADD COLUMN IF NOT EXISTS big_idea TEXT,
ADD COLUMN IF NOT EXISTS campos_extras JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining campos_extras structure
-- campos_extras is an array of objects: [{label: string, value: string}]
