-- Demo da Feira Circular.
-- Execute no SQL Editor DEPOIS de schema.sql, migration-cadastro.sql e migration-plataforma.sql.
-- Recria os usuários de demonstração (apaga os IDs abaixo se já existirem).
--
-- Acessos:
--   admin@centrotroca.feira.ba              / admin123     (administrador)
--   tempero@exemplo.com.br                  / 123456       (restaurante)
--   sao.cristovao@exemplo.com.br            / 123456       (comerciante)
--   sabornordestino@exemplo.com.br          / 123456       (restaurante)
--   mercado.progresso@exemplo.com.br        / 123456       (comerciante)
--   boavista@exemplo.com.br                 / 123456       (restaurante, pendente)
--   raizesdosertao@exemplo.com.br           / 123456       (comerciante, pendente)

create extension if not exists pgcrypto;

create or replace function public.seed_auth_user(
  p_id uuid,
  p_email text,
  p_password text,
  p_meta jsonb
) returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    p_meta,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email',
    p_id::text,
    now(),
    now(),
    now()
  );
end;
$$;

insert into public.categories (id, name, active) values
  ('frutas', 'Frutas', true),
  ('legumes', 'Legumes', true),
  ('verduras', 'Verduras', true),
  ('temperos', 'Temperos', true),
  ('tuberculos', 'Tubérculos', true)
on conflict (id) do update set name = excluded.name, active = true;

insert into public.foods (id, name, category_id, active, image_url) values
  ('tomate',    'Tomate',           'legumes',    true, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&h=400&fit=crop'),
  ('cebola',    'Cebola',           'legumes',    true, 'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=600&h=400&fit=crop'),
  ('pimentao',  'Pimentão',         'legumes',    true, null),
  ('quiabo',    'Quiabo',           'legumes',    true, 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=600&h=400&fit=crop'),
  ('jilo',      'Jiló',             'legumes',    true, null),
  ('berinjela', 'Berinjela',        'legumes',    true, null),
  ('maxixe',    'Maxixe',           'legumes',    true, null),
  ('abobora',   'Abóbora',          'legumes',    true, null),
  ('cenoura',   'Cenoura',          'legumes',    true, 'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=600&h=400&fit=crop'),
  ('beterraba', 'Beterraba',        'legumes',    true, null),
  ('alface',    'Alface',           'verduras',   true, null),
  ('repolho',   'Repolho',          'verduras',   true, null),
  ('coentro',   'Coentro',          'verduras',   true, null),
  ('salsa',     'Salsinha',         'verduras',   true, null),
  ('cebolinha', 'Cebolinha',        'verduras',   true, null),
  ('pimenta',   'Pimenta de Cheiro','temperos',   true, null),
  ('batata',    'Batata',           'tuberculos', true, null),
  ('mandioca',  'Mandioca',         'tuberculos', true, null),
  ('inhame',    'Inhame',           'tuberculos', true, null),
  ('macaxeira', 'Macaxeira',        'tuberculos', true, null),
  ('limao',     'Limão',            'frutas',     true, null),
  ('laranja',   'Laranja',          'frutas',     true, 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600&h=400&fit=crop'),
  ('manga',     'Manga',            'frutas',     true, 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&h=400&fit=crop'),
  ('mamao',     'Mamão',            'frutas',     true, 'https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=600&h=400&fit=crop'),
  ('banana',    'Banana',           'frutas',     true, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&h=400&fit=crop'),
  ('melancia',  'Melancia',         'frutas',     true, null),
  ('abacaxi',   'Abacaxi',          'frutas',     true, 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&h=400&fit=crop'),
  ('goiaba',    'Goiaba',           'frutas',     true, null),
  ('acerola',   'Acerola',          'frutas',     true, null),
  ('caju',      'Caju',             'frutas',     true, null)
on conflict (id) do update
  set name = excluded.name,
      category_id = excluded.category_id,
      active = excluded.active,
      image_url = excluded.image_url;

do $$
declare
  v_admin uuid := 'a0000000-0000-4000-8000-000000000001';
  v_u1    uuid := 'a0000000-0000-4000-8000-000000000011';
  v_u2    uuid := 'a0000000-0000-4000-8000-000000000012';
  v_u3    uuid := 'a0000000-0000-4000-8000-000000000013';
  v_u4    uuid := 'a0000000-0000-4000-8000-000000000014';
  v_u5    uuid := 'a0000000-0000-4000-8000-000000000015';
  v_u6    uuid := 'a0000000-0000-4000-8000-000000000016';
  v_l1 uuid := 'b0000000-0000-4000-8000-000000000001';
  v_l2 uuid := 'b0000000-0000-4000-8000-000000000002';
  v_l3 uuid := 'b0000000-0000-4000-8000-000000000003';
  v_l4 uuid := 'b0000000-0000-4000-8000-000000000004';
  v_l5 uuid := 'b0000000-0000-4000-8000-000000000005';
  v_l6 uuid := 'b0000000-0000-4000-8000-000000000006';
  v_l7 uuid := 'b0000000-0000-4000-8000-000000000007';
  v_l8 uuid := 'b0000000-0000-4000-8000-000000000008';
  v_l9 uuid := 'b0000000-0000-4000-8000-000000000009';
  v_p1 uuid := 'c0000000-0000-4000-8000-000000000001';
  v_p2 uuid := 'c0000000-0000-4000-8000-000000000002';
  v_p3 uuid := 'c0000000-0000-4000-8000-000000000003';
  v_p4 uuid := 'c0000000-0000-4000-8000-000000000004';
  v_e1 uuid := 'd0000000-0000-4000-8000-000000000001';
  v_e2 uuid := 'd0000000-0000-4000-8000-000000000002';
begin
  delete from public.notifications
    where user_id in (select id from public.profiles where email in (
      'admin@centrotroca.feira.ba','tempero@exemplo.com.br','sao.cristovao@exemplo.com.br',
      'sabornordestino@exemplo.com.br','mercado.progresso@exemplo.com.br','boavista@exemplo.com.br','raizesdosertao@exemplo.com.br'
    ) union select unnest(array[v_admin, v_u1, v_u2, v_u3, v_u4, v_u5, v_u6]));
  delete from public.listings
    where owner_id in (select id from public.profiles where email in (
      'admin@centrotroca.feira.ba','tempero@exemplo.com.br','sao.cristovao@exemplo.com.br',
      'sabornordestino@exemplo.com.br','mercado.progresso@exemplo.com.br','boavista@exemplo.com.br','raizesdosertao@exemplo.com.br'
    ) union select unnest(array[v_admin, v_u1, v_u2, v_u3, v_u4, v_u5, v_u6]))
    or id in (v_l1, v_l2, v_l3, v_l4, v_l5, v_l6, v_l7, v_l8, v_l9);
  delete from public.profiles
    where id in (v_admin, v_u1, v_u2, v_u3, v_u4, v_u5, v_u6)
       or email in (
         'admin@centrotroca.feira.ba','tempero@exemplo.com.br','sao.cristovao@exemplo.com.br',
         'sabornordestino@exemplo.com.br','mercado.progresso@exemplo.com.br','boavista@exemplo.com.br','raizesdosertao@exemplo.com.br'
       );
  delete from auth.identities
    where user_id in (select id from auth.users where email in (
      'admin@centrotroca.feira.ba','tempero@exemplo.com.br','sao.cristovao@exemplo.com.br',
      'sabornordestino@exemplo.com.br','mercado.progresso@exemplo.com.br','boavista@exemplo.com.br','raizesdosertao@exemplo.com.br'
    ) union select unnest(array[v_admin, v_u1, v_u2, v_u3, v_u4, v_u5, v_u6]));
  delete from auth.users where id in (v_admin, v_u1, v_u2, v_u3, v_u4, v_u5, v_u6)
    or email in (
      'admin@centrotroca.feira.ba',
      'tempero@exemplo.com.br',
      'sao.cristovao@exemplo.com.br',
      'sabornordestino@exemplo.com.br',
      'mercado.progresso@exemplo.com.br',
      'boavista@exemplo.com.br',
      'raizesdosertao@exemplo.com.br'
    );

  perform public.seed_auth_user(v_admin, 'admin@centrotroca.feira.ba', 'admin123', jsonb_build_object(
    'name', 'Administração Central', 'type', 'admin', 'document', '00.000.000/0001-00', 'document_type', 'cnpj',
    'address', 'Centro de Abastecimento, Administração', 'whatsapp', '(75) 99100-0000',
    'responsible', 'Gestão do Sistema', 'interests', '[]'::jsonb, 'opening_hours', '24h', 'status', 'aprovado'
  ));
  perform public.seed_auth_user(v_u1, 'tempero@exemplo.com.br', '123456', jsonb_build_object(
    'name', 'Restaurante Tempero da Roça', 'type', 'restaurante', 'document', '12.345.678/0001-91', 'document_type', 'cnpj',
    'address', 'Rua Nova, Barraca 23-A, Setor C', 'whatsapp', '(75) 99100-0001',
    'responsible', 'Maria das Graças', 'interests', '["tomate","cebola","coentro","pimentao"]'::jsonb,
    'opening_hours', '06:00 às 14:00', 'status', 'aprovado'
  ));
  perform public.seed_auth_user(v_u2, 'sao.cristovao@exemplo.com.br', '123456', jsonb_build_object(
    'name', 'Distribuidora São Cristóvão', 'type', 'comerciante', 'document', '00.000.002/0001-02', 'document_type', 'cnpj',
    'address', 'Baraúnas, Galpão 3, Lote 45', 'whatsapp', '(75) 99100-0002',
    'responsible', 'João Batista Oliveira', 'interests', '["mamao","banana","manga","abacaxi"]'::jsonb,
    'opening_hours', '05:00 às 13:00', 'status', 'aprovado'
  ));
  perform public.seed_auth_user(v_u3, 'sabornordestino@exemplo.com.br', '123456', jsonb_build_object(
    'name', 'Restaurante Sabor Nordestino', 'type', 'restaurante', 'document', '23.456.789/0001-13', 'document_type', 'cnpj',
    'address', 'Queimadinha, Loja 7, Setor B', 'whatsapp', '(75) 99100-0003',
    'responsible', 'Ana Cláudia Costa', 'interests', '["banana","mamao","cenoura","beterraba"]'::jsonb,
    'opening_hours', '06:30 às 15:00', 'status', 'aprovado'
  ));
  perform public.seed_auth_user(v_u4, 'mercado.progresso@exemplo.com.br', '123456', jsonb_build_object(
    'name', 'Mercado Progresso', 'type', 'comerciante', 'document', '00.000.004/0001-24', 'document_type', 'cnpj',
    'address', 'Rua Nova, Barraca 14, Setor A', 'whatsapp', '(75) 99100-0004',
    'responsible', 'Pedro Alves Lima', 'interests', '["tomate","quiabo","maxixe","jilo"]'::jsonb,
    'opening_hours', '04:00 às 12:00', 'status', 'aprovado'
  ));
  perform public.seed_auth_user(v_u5, 'boavista@exemplo.com.br', '123456', jsonb_build_object(
    'name', 'Lanchonete Boa Vista', 'type', 'restaurante', 'document', '34.567.890/0001-55', 'document_type', 'cnpj',
    'address', 'Baraúnas, Loja 2, Corredor Norte', 'whatsapp', '(75) 99100-0005',
    'responsible', 'Carla Ferreira', 'interests', '["alface","tomate","cebolinha"]'::jsonb,
    'opening_hours', '07:00 às 18:00', 'status', 'pendente'
  ));
  perform public.seed_auth_user(v_u6, 'raizesdosertao@exemplo.com.br', '123456', jsonb_build_object(
    'name', 'Hortifrúti Raízes do Sertão', 'type', 'comerciante', 'document', '00.000.006/0001-46', 'document_type', 'cnpj',
    'address', 'Queimadinha, Galpão 1, Dock 8', 'whatsapp', '(75) 99100-0006',
    'responsible', 'Raimundo Nonato', 'interests', '["manga","goiaba","caju"]'::jsonb,
    'opening_hours', '04:30 às 12:30', 'status', 'pendente'
  ));

  update public.profiles p
  set last_activity = now() - interval '2 hours',
      status = x.raw_status
  from (values
    (v_admin, 'aprovado'::text),
    (v_u1, 'aprovado'),
    (v_u2, 'aprovado'),
    (v_u3, 'aprovado'),
    (v_u4, 'aprovado'),
    (v_u5, 'pendente'),
    (v_u6, 'pendente')
  ) as x(id, raw_status)
  where p.id = x.id;

  insert into public.listings (id, owner_id, type, food_id, quantity_g, ripeness, deadline, observation, photo_url, status, created_at) values
    (v_l1, v_u2, 'oferta', 'mamao',   3000, 'muito-maduro', current_date + 3, 'Caixas bem maduras, bom para consumo imediato.', 'https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=600&h=400&fit=crop', 'ativa', now() - interval '12 hours'),
    (v_l2, v_u4, 'oferta', 'tomate',  2000, 'maduro',       current_date + 4, null, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&h=400&fit=crop', 'ativa', now() - interval '11 hours'),
    (v_l3, v_u1, 'pedido', 'banana',  1500, 'maduro',       current_date + 5, 'Preciso para amanhã de manhã.', null, 'ativa', now() - interval '10 hours'),
    (v_l4, v_u2, 'oferta', 'banana',  2000, 'verde',        current_date + 7, 'Boa para uso com prazo.', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&h=400&fit=crop', 'em-negociacao', now() - interval '2 days'),
    (v_l5, v_u3, 'pedido', 'cenoura', 1000, 'maduro',       current_date + 6, null, null, 'ativa', now() - interval '8 hours'),
    (v_l6, v_u4, 'oferta', 'quiabo',   700, 'meio-maduro',  current_date + 4, null, 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=600&h=400&fit=crop', 'ativa', now() - interval '7 hours'),
    (v_l7, v_u4, 'pedido', 'manga',   2500, 'meio-maduro',  current_date + 7, null, null, 'ativa', now() - interval '6 hours'),
    (v_l8, v_u3, 'oferta', 'cebola',  1500, 'maduro',       current_date + 5, 'Colhidas há dois dias.', null, 'concluida', now() - interval '5 days'),
    (v_l9, v_u2, 'oferta', 'abacaxi', 1000, 'maduro',       current_date + 5, null, 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&h=400&fit=crop', 'em-negociacao', now() - interval '4 days')
  on conflict (id) do nothing;

  insert into public.proposals (id, listing_id, parent_id, proposer_id, version, status, offered, requested, created_at) values
    (v_p1, v_l4, null, v_u1, 1, 'contraproposto',
      '{"alimento":"tomate","quantidadeG":2000,"maturacao":"maduro","observacao":"Tomates de ontem."}'::jsonb,
      '{"alimento":"banana","quantidadeG":2000,"maturacao":"verde","observacao":null}'::jsonb,
      now() - interval '2 days'),
    (v_p2, v_l4, v_p1, v_u2, 2, 'proposto',
      '{"alimento":"banana","quantidadeG":1500,"maturacao":"verde","observacao":"Só tenho 1,5 kg disponível."}'::jsonb,
      '{"alimento":"tomate","quantidadeG":1500,"maturacao":"maduro","observacao":null}'::jsonb,
      now() - interval '1 day 12 hours'),
    (v_p3, v_l9, null, v_u1, 1, 'encontro-agendado',
      '{"alimento":"cebola","quantidadeG":1000,"maturacao":"maduro","observacao":null}'::jsonb,
      '{"alimento":"abacaxi","quantidadeG":1000,"maturacao":"maduro","observacao":null}'::jsonb,
      now() - interval '3 days'),
    (v_p4, v_l2, null, v_u1, 1, 'encontro-agendado',
      '{"alimento":"cebola","quantidadeG":2000,"maturacao":"maduro","observacao":"Cebola boa para hoje."}'::jsonb,
      '{"alimento":"tomate","quantidadeG":2000,"maturacao":"maduro","observacao":null}'::jsonb,
      now() - interval '1 day')
  on conflict (id) do nothing;

  insert into public.meetings (id, proposal_id, meeting_date, meeting_time, location, created_at, changes) values
    (v_e1, v_p3, current_date - 1, '06:00', 'Centro de Abastecimento, Rua Nova, Setor C', now() - interval '2 days', '[]'::jsonb),
    (v_e2, v_p4, current_date + 2, '07:30', 'Centro de Abastecimento, Rua Nova, Barraca 14', now() - interval '20 hours', '[]'::jsonb)
  on conflict (id) do nothing;

  insert into public.meeting_confirmations (proposal_id, user_id, response, weight_g, created_at) values
    (v_p3, v_u2, 'aconteceu', 980, now() - interval '4 hours')
  on conflict (proposal_id, user_id) do nothing;

  insert into public.messages (id, proposal_id, author_id, kind, content, read_at, created_at) values
    ('e0000000-0000-4000-8000-000000000001', v_p3, null, 'sistema', 'Restaurante Tempero da Roça enviou uma proposta para a oferta de Abacaxi.', now(), now() - interval '3 days'),
    ('e0000000-0000-4000-8000-000000000002', v_p3, v_u1, 'texto', 'Bom dia! Tenho cebola madura disponível, posso trocar 1 kg.', now(), now() - interval '3 days' + interval '5 minutes'),
    ('e0000000-0000-4000-8000-000000000003', v_p3, v_u2, 'texto', 'Combinado! Me serve. Pode ser amanhã cedo aqui no Setor C?', now(), now() - interval '3 days' + interval '30 minutes'),
    ('e0000000-0000-4000-8000-000000000004', v_p3, v_u1, 'texto', 'Pode ser às 06:00?', now(), now() - interval '3 days' + interval '32 minutes'),
    ('e0000000-0000-4000-8000-000000000005', v_p3, v_u2, 'texto', 'Perfeito.', now(), now() - interval '3 days' + interval '35 minutes'),
    ('e0000000-0000-4000-8000-000000000006', v_p3, null, 'sistema', 'Proposta aceita. Encontro agendado: ontem às 06:00 — Centro de Abastecimento, Rua Nova, Setor C.', now(), now() - interval '2 days'),
    ('e0000000-0000-4000-8000-000000000007', v_p1, null, 'sistema', 'Restaurante Tempero da Roça enviou uma proposta para a oferta de Banana.', now(), now() - interval '2 days'),
    ('e0000000-0000-4000-8000-000000000008', v_p1, v_u1, 'texto', 'Tenho tomate maduro pra trocar pelos seus 2 kg de banana.', now(), now() - interval '2 days' + interval '5 minutes'),
    ('e0000000-0000-4000-8000-000000000009', v_p1, v_u2, 'texto', 'Não tenho os 2 kg, só consigo 1,5 kg. Aceita?', now(), now() - interval '1 day 13 hours'),
    ('e0000000-0000-4000-8000-000000000010', v_p1, null, 'sistema', 'Distribuidora São Cristóvão enviou uma contraproposta.', null, now() - interval '1 day 12 hours'),
    ('e0000000-0000-4000-8000-000000000011', v_p4, null, 'sistema', 'Restaurante Tempero da Roça enviou uma proposta para a oferta de Tomate.', now(), now() - interval '1 day'),
    ('e0000000-0000-4000-8000-000000000012', v_p4, v_u1, 'texto', 'Consigo trocar cebola pelo seu tomate. Combinamos o encontro?', now(), now() - interval '1 day' + interval '10 minutes'),
    ('e0000000-0000-4000-8000-000000000013', v_p4, v_u4, 'texto', 'Fechado. Pode ser depois de amanhã, 07:30 na Barraca 14.', now(), now() - interval '22 hours'),
    ('e0000000-0000-4000-8000-000000000014', v_p4, null, 'sistema', 'Encontro agendado na Barraca 14.', now(), now() - interval '20 hours')
  on conflict (id) do nothing;

  insert into public.notifications (id, user_id, listing_id, proposal_id, message, read_at, created_at) values
    ('f0000000-0000-4000-8000-000000000001', v_u1, v_l4, v_p2, 'João Batista (Distribuidora São Cristóvão) enviou uma contraproposta para Banana. Banana verde • 1,5 kg.', null, now() - interval '1 day 12 hours'),
    ('f0000000-0000-4000-8000-000000000002', v_u1, v_l2, null, 'Pedro Alves (Mercado Progresso) publicou uma nova oferta de Tomate. 2 kg, maduro.', null, now() - interval '11 hours'),
    ('f0000000-0000-4000-8000-000000000003', v_u2, v_l4, v_p1, 'Maria das Graças (Restaurante Tempero da Roça) propôs troca pela sua oferta de Banana.', now(), now() - interval '2 days')
  on conflict (id) do nothing;
end;
$$;
