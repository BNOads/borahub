-- Create content_settings table for storing diretrizes and other settings
CREATE TABLE IF NOT EXISTS content_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ia_agents table for storing AI agents configurations
CREATE TABLE IF NOT EXISTS ia_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Outro',
    description TEXT,
    link TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_agents ENABLE ROW LEVEL SECURITY;

-- Create policies for content_settings (allow all operations for authenticated users)
CREATE POLICY "Allow all for content_settings" ON content_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Also allow anon for content_settings
CREATE POLICY "Allow anon read content_settings" ON content_settings
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anon insert content_settings" ON content_settings
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon update content_settings" ON content_settings
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- Create policies for ia_agents (allow all operations for authenticated users)
CREATE POLICY "Allow all for ia_agents" ON ia_agents
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Also allow anon for ia_agents
CREATE POLICY "Allow anon read ia_agents" ON ia_agents
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anon insert ia_agents" ON ia_agents
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon update ia_agents" ON ia_agents
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon delete ia_agents" ON ia_agents
    FOR DELETE
    TO anon
    USING (true);
