
-- Storage bucket para anexos de tarefas
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', true);

CREATE POLICY "Authenticated users can upload task attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view task attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can delete task attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);
