-- Drop chat tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_conversations CASCADE;
DROP TABLE IF EXISTS public.chat_agent_status CASCADE;
DROP TABLE IF EXISTS public.chat_settings CASCADE;