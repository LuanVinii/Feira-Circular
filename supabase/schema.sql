create table public.categories (
  id text primary key,
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.foods (
  id text primary key,
  name text not null unique,
  category_id text not null references public.categories(id),
  active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('restaurante', 'comerciante', 'admin')),
  document text not null unique,
  document_type text not null default 'cnpj' check (document_type in ('cpf', 'cnpj')),
  address text not null,
  whatsapp text not null,
  responsible text not null,
  email text not null,
  password_hash text,
  avatar_url text,
  interests text[] not null default '{}',
  opening_hours text not null,
  opening_time time,
  closing_time time,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado', 'bloqueado')),
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  type text not null check (type in ('oferta', 'pedido')),
  food_id text not null references public.foods(id),
  quantity_g integer not null check (quantity_g > 0),
  ripeness text not null check (ripeness in ('verde', 'meio-maduro', 'maduro', 'muito-maduro')),
  deadline date not null,
  observation text,
  photo_url text,
  status text not null default 'ativa' check (status in ('ativa', 'em-negociacao', 'concluida', 'cancelada')),
  created_at timestamptz not null default now()
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  parent_id uuid references public.proposals(id),
  proposer_id uuid not null references public.profiles(id),
  version integer not null default 1,
  status text not null default 'proposto' check (status in ('proposto', 'contraproposto', 'aceito', 'encontro-agendado', 'concluido', 'cancelado', 'nao-compareceu', 'divergencia')),
  offered jsonb not null,
  requested jsonb not null,
  created_at timestamptz not null default now()
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  meeting_date date not null,
  meeting_time time not null,
  location text not null,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  author_id uuid references public.profiles(id),
  kind text not null default 'texto' check (kind in ('texto', 'sistema')),
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id),
  type text not null check (type in ('qualidade', 'quantidade', 'diferente-anunciado', 'outro')),
  description text not null,
  status text not null default 'aberta' check (status in ('aberta', 'em-analise', 'resolvida')),
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.foods enable row level security;
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.proposals enable row level security;
alter table public.meetings enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.incidents enable row level security;

create policy "authenticated users can read active categories" on public.categories for select to authenticated using (active = true);
create policy "authenticated users can read active foods" on public.foods for select to authenticated using (active = true);
create policy "authenticated users can read approved profiles" on public.profiles for select to authenticated using (status = 'aprovado' or id = auth.uid());
create policy "users can manage their own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, name, type, document, document_type, address, whatsapp,
    responsible, email, interests, opening_hours, status
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'type', 'comerciante'),
    coalesce(new.raw_user_meta_data->>'document', ''),
    coalesce(new.raw_user_meta_data->>'document_type', 'cnpj'),
    coalesce(new.raw_user_meta_data->>'address', ''),
    coalesce(new.raw_user_meta_data->>'whatsapp', ''),
    coalesce(new.raw_user_meta_data->>'responsible', ''),
    new.email,
    coalesce(array(select jsonb_array_elements_text(new.raw_user_meta_data->'interests')), '{}'),
    coalesce(new.raw_user_meta_data->>'opening_hours', ''),
    'pendente'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
create policy "authenticated users can read listings" on public.listings for select to authenticated using (true);
create policy "users can create their own listings" on public.listings for insert to authenticated with check (owner_id = auth.uid());
create policy "owners can update their listings" on public.listings for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "authenticated users can read proposals" on public.proposals for select to authenticated using (proposer_id = auth.uid() or exists (select 1 from public.listings where listings.id = listing_id and listings.owner_id = auth.uid()));
create policy "users can create proposals" on public.proposals for insert to authenticated with check (proposer_id = auth.uid());
create policy "participants can update proposals" on public.proposals for update to authenticated using (proposer_id = auth.uid() or exists (select 1 from public.listings where listings.id = listing_id and listings.owner_id = auth.uid()));
create policy "participants can read meetings" on public.meetings for select to authenticated using (exists (select 1 from public.proposals where proposals.id = proposal_id and proposals.proposer_id = auth.uid()));
create policy "participants can read messages" on public.messages for select to authenticated using (author_id = auth.uid() or exists (select 1 from public.proposals where proposals.id = proposal_id and proposals.proposer_id = auth.uid()));
create policy "users can send messages" on public.messages for insert to authenticated with check (author_id = auth.uid());
create policy "users can read their notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "users can update their notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users can manage their incidents" on public.incidents for all to authenticated using (reporter_id = auth.uid()) with check (reporter_id = auth.uid());

insert into public.categories (id, name) values
  ('frutas', 'Frutas'),
  ('legumes', 'Legumes'),
  ('verduras', 'Verduras'),
  ('temperos', 'Temperos'),
  ('tuberculos', 'Tubérculos')
on conflict (id) do nothing;

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
on conflict (id) do nothing;