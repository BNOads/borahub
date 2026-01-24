-- Add index for faster response queries
CREATE INDEX IF NOT EXISTS idx_quiz_responses_session_id ON public.quiz_responses(session_id);

-- Create view for quiz responses with question text (for easier analytics)
CREATE OR REPLACE VIEW public.quiz_responses_with_questions AS
SELECT 
  qr.id,
  qr.session_id,
  qr.question_id,
  qr.selected_option_ids,
  qr.text_response,
  qr.number_response,
  qr.scale_response,
  qr.points_earned,
  qr.tags_collected,
  qr.time_spent_seconds,
  qr.answered_at,
  qq.question_text,
  qq.question_type,
  qs.quiz_id,
  qs.completed_at,
  qs.total_score
FROM public.quiz_responses qr
JOIN public.quiz_questions qq ON qr.question_id = qq.id
JOIN public.quiz_sessions qs ON qr.session_id = qs.id;