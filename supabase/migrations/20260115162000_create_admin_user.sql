-- Criar usuário administrador inicial
-- Email: ferramentas@boranaobra.com.br
-- Senha: ferramentas@boranaobra.com.br

-- Este script cria o usuário no auth.users e configura o perfil como admin

DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Criar usuário no auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'ferramentas@boranaobra.com.br',
    crypt('ferramentas@boranaobra.com.br', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Administrador","display_name":"Admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO user_id;

  -- Atualizar o perfil criado automaticamente pelo trigger
  UPDATE profiles
  SET 
    role = 'admin',
    full_name = 'Administrador',
    display_name = 'Admin',
    is_active = true,
    must_change_password = false
  WHERE id = user_id;

  RAISE NOTICE 'Usuário admin criado com sucesso! ID: %', user_id;
END $$;
