
-- Create a function to remove duplicate strategic leads within a session
-- Duplicates are identified by email (case-insensitive) within the same session
-- Keeps the lead with the most advanced stage, or the most recently updated one
CREATE OR REPLACE FUNCTION public.remove_duplicate_strategic_leads(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer := 0;
  stage_priority text[] := ARRAY['venda', 'realizado', 'agendado', 'qualificado', 'lead'];
BEGIN
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY session_id, lower(trim(email))
             ORDER BY 
               array_position(ARRAY['venda','realizado','agendado','qualificado','lead'], stage) ASC NULLS LAST,
               updated_at DESC
           ) AS rn
    FROM strategic_leads
    WHERE session_id = p_session_id
      AND email IS NOT NULL
      AND trim(email) != ''
  ),
  to_delete AS (
    DELETE FROM strategic_leads
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM to_delete;

  -- Also deduplicate by phone for leads without email
  WITH ranked_phone AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY session_id, regexp_replace(phone, '\D', '', 'g')
             ORDER BY 
               array_position(ARRAY['venda','realizado','agendado','qualificado','lead'], stage) ASC NULLS LAST,
               updated_at DESC
           ) AS rn
    FROM strategic_leads
    WHERE session_id = p_session_id
      AND (email IS NULL OR trim(email) = '')
      AND phone IS NOT NULL
      AND trim(phone) != ''
  ),
  to_delete_phone AS (
    DELETE FROM strategic_leads
    WHERE id IN (SELECT id FROM ranked_phone WHERE rn > 1)
    RETURNING id
  )
  SELECT deleted_count + count(*) INTO deleted_count FROM to_delete_phone;

  RETURN deleted_count;
END;
$$;
