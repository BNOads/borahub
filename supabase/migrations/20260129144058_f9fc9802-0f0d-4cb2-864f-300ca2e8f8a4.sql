-- Add jump logic columns to quiz_options
ALTER TABLE public.quiz_options 
ADD COLUMN jump_to_question_id uuid REFERENCES public.quiz_questions(id) ON DELETE SET NULL,
ADD COLUMN jump_to_diagnosis_id uuid REFERENCES public.quiz_diagnoses(id) ON DELETE SET NULL;

-- Add index for better performance on lookups
CREATE INDEX idx_quiz_options_jump_question ON public.quiz_options(jump_to_question_id) WHERE jump_to_question_id IS NOT NULL;
CREATE INDEX idx_quiz_options_jump_diagnosis ON public.quiz_options(jump_to_diagnosis_id) WHERE jump_to_diagnosis_id IS NOT NULL;

COMMENT ON COLUMN public.quiz_options.jump_to_question_id IS 'If set, selecting this option will skip to this specific question instead of the next one';
COMMENT ON COLUMN public.quiz_options.jump_to_diagnosis_id IS 'If set, selecting this option will end the quiz and show this specific diagnosis';