
-- Add lessons to 'Curso da Plataforma BNOapp'
INSERT INTO public.lessons (course_id, title, description, video_url, duration, order_index)
SELECT 
    id, 
    'Como configurar a pasta de criativos de um novo cliente no BNOapp',
    'Nesta aula você aprenderá a organizar a estrutura de pastas do Google Drive para novos clientes.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '10:00',
    1
FROM public.courses WHERE title = 'Curso da Plataforma BNOapp'
LIMIT 1;

INSERT INTO public.lessons (course_id, title, description, video_url, duration, order_index)
SELECT 
    id, 
    'Como subir um novo criativo para um cliente no BNOapp',
    'Saiba como realizar o upload e a nomenclatura correta dos criativos.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '08:30',
    2
FROM public.courses WHERE title = 'Curso da Plataforma BNOapp'
LIMIT 1;

INSERT INTO public.lessons (course_id, title, description, video_url, duration, order_index)
SELECT 
    id, 
    'Como os gestores devem registrar as mensagens semanais no BNOapp',
    'Processo de registro de reports semanais para clientes.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '12:00',
    3
FROM public.courses WHERE title = 'Curso da Plataforma BNOapp'
LIMIT 1;
