-- Cria o esquema inicial, as regras de acesso e as validações da plataforma.
-- Destinada à instalação em um projeto Supabase novo e vazio.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  type text not null default 'comerciante' check (type in ('restaurante', 'comerciante', 'admin')),
  document_type text not null default 'cnpj' check (document_type in ('cpf', 'cnpj')),
  document text not null default '',
  email text not null default '',
  address text not null default '',
  whatsapp text not null default '',
  responsible text not null default '',
  interests text[] not null default '{}',
  opening_hours text not null default '',
  avatar_url text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado', 'bloqueado')),
  created_at timestamptz not null default now(),
  last_activity timestamptz,
  rejection_reason text,
  block_reason text
);
create unique index profiles_document_unique on public.profiles(document_type, document) where document <> '';

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('oferta', 'pedido')),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  quantity_g integer not null check (quantity_g > 0),
  ripeness text not null check (ripeness in ('verde', 'meio-maduro', 'maduro', 'muito-maduro')),
  deadline date not null,
  observation text check (observation is null or char_length(observation) <= 140),
  photo_url text,
  status text not null default 'ativa' check (status in ('ativa', 'em-negociacao', 'concluida', 'cancelada')),
  created_at timestamptz not null default now()
);
create index listings_owner_status_deadline_idx on public.listings(owner_id, status, deadline);
create index listings_food_status_deadline_idx on public.listings(food_id, status, deadline);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  parent_id uuid references public.proposals(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  status text not null default 'proposto' check (status in ('proposto', 'contraproposto', 'aceito', 'encontro-agendado', 'concluido', 'cancelado', 'nao-compareceu', 'divergencia')),
  created_at timestamptz not null default now(),
  proposer_id uuid not null references public.profiles(id) on delete cascade,
  offered jsonb not null check (jsonb_typeof(offered) = 'object'),
  requested jsonb not null check (jsonb_typeof(requested) = 'object')
);
create index proposals_listing_idx on public.proposals(listing_id, created_at);
create index proposals_parent_idx on public.proposals(parent_id);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.proposals(id) on delete cascade,
  meeting_date date not null,
  meeting_time time not null,
  location text not null check (char_length(trim(location)) > 0),
  created_at timestamptz not null default now(),
  changes jsonb not null default '[]'::jsonb check (jsonb_typeof(changes) = 'array'),
  status text not null default 'proposto' check (status in ('proposto', 'aceito', 'recusado', 'cancelado')),
  proposed_by uuid not null references public.profiles(id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'texto' check (kind in ('texto', 'sistema')),
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_proposal_created_idx on public.messages(proposal_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(trim(message)) > 0),
  read_at timestamptz,
  listing_id uuid references public.listings(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  created_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('qualidade', 'quantidade', 'diferente-anunciado', 'outro')),
  description text not null check (char_length(trim(description)) > 0),
  status text not null default 'aberta' check (status in ('aberta', 'em-analise', 'resolvida')),
  created_at timestamptz not null default now()
);
create index incidents_status_created_idx on public.incidents(status, created_at desc);

create table public.meeting_confirmations (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null check (response in ('aconteceu', 'nao-aconteceu')),
  weight_g integer check (weight_g is null or weight_g > 0),
  created_at timestamptz not null default now(),
  unique (proposal_id, user_id)
);

-- Cria contas novas como pendentes e impede a concessão de privilégios pelo cadastro público.
create or replace function public.on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_type text := metadata ->> 'type';
  user_interests text[];
begin
  if coalesce(requested_type, '') not in ('restaurante', 'comerciante') then
    requested_type := 'comerciante';
  end if;
  select coalesce(array_agg(value), '{}') into user_interests
  from jsonb_array_elements_text(
    case when jsonb_typeof(metadata -> 'interests') = 'array' then metadata -> 'interests' else '[]'::jsonb end
  ) as interest(value);

  insert into public.profiles (id, name, type, document_type, document, email, address, whatsapp, responsible, interests, opening_hours, status)
  values (
    new.id,
    coalesce(metadata ->> 'name', ''),
    requested_type,
    case when metadata ->> 'document_type' in ('cpf', 'cnpj') then metadata ->> 'document_type' else 'cnpj' end,
    coalesce(metadata ->> 'document', ''),
    coalesce(new.email, ''),
    coalesce(metadata ->> 'address', ''),
    coalesce(metadata ->> 'whatsapp', ''),
    coalesce(metadata ->> 'responsible', ''),
    user_interests,
    coalesce(metadata ->> 'opening_hours', ''),
    'pendente'
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.on_auth_user_created();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.type = 'admin' and p.status = 'aprovado'
  );
$$;

create or replace function public.is_approved_profile(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = _user_id and p.status = 'aprovado');
$$;

create or replace function public.can_access_proposal(_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1
    from public.proposals p
    join public.listings l on l.id = p.listing_id
    where p.id = _proposal_id
      and (p.proposer_id = (select auth.uid()) or l.owner_id = (select auth.uid()))
  );
$$;

create or replace function public.can_access_listing(_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.listings l where l.id = _listing_id and l.owner_id = (select auth.uid())
  ) or exists (
    select 1 from public.proposals p
    join public.listings l on l.id = p.listing_id
    where l.id = _listing_id and (p.proposer_id = (select auth.uid()) or l.owner_id = (select auth.uid()))
  );
$$;

create or replace function public.can_finalize_listing(_listing_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.proposals p
    join public.meeting_confirmations c on c.proposal_id = p.id
    where p.listing_id = _listing_id
    group by p.id
    having count(*) >= 2 and bool_and(c.response = 'aconteceu')
  );
$$;
revoke all on function public.is_approved_profile(uuid) from public, anon;
grant execute on function public.is_approved_profile(uuid) to authenticated, service_role;
revoke all on function public.can_finalize_listing(uuid) from public, anon;
grant execute on function public.can_finalize_listing(uuid) to authenticated, service_role;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() and (
    new.type is distinct from old.type
    or new.document_type is distinct from old.document_type
    or new.document is distinct from old.document
    or new.status is distinct from old.status
    or new.created_at is distinct from old.created_at
    or new.rejection_reason is distinct from old.rejection_reason
    or new.block_reason is distinct from old.block_reason
  ) then
    raise exception 'Protected profile fields can only be changed by an administrator';
  end if;
  return new;
end;
$$;

-- Disponibiliza os dados necessários para identificar e contatar participantes.
-- Restringe documentos pessoais ao próprio titular e à administração.
create or replace view public.member_directory
with (security_invoker = true, security_barrier = true)
as
select id, name, type, email, address, whatsapp, responsible, interests,
  opening_hours, avatar_url, status, created_at, last_activity,
  rejection_reason, block_reason
from public.profiles
where status = 'aprovado' or id = (select auth.uid());
revoke all on public.member_directory from public, anon;
grant select on public.member_directory to authenticated;

create or replace function public.admin_list_profiles()
returns setof public.profiles
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  return query select p.* from public.profiles p order by p.created_at desc;
end;
$$;
revoke all on function public.admin_list_profiles() from public, anon;
grant execute on function public.admin_list_profiles() to authenticated, service_role;
create trigger profiles_guard_update before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_listing_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.owner_id <> (select auth.uid()) or not public.is_approved_profile(new.owner_id) then
      raise exception 'Only approved users can create their own listings';
    end if;
    if new.status <> 'ativa' or new.deadline < current_date then
      raise exception 'New listings must be active and have a current or future deadline';
    end if;
  elsif not public.is_admin() then
    if new.owner_id is distinct from old.owner_id or new.type is distinct from old.type or new.food_id is distinct from old.food_id then
      raise exception 'Listing owner, type, and food cannot be changed';
    end if;
    if new.status = 'em-negociacao' and old.status in ('ativa', 'em-negociacao')
      and new.quantity_g is not distinct from old.quantity_g
      and new.ripeness is not distinct from old.ripeness
      and new.deadline is not distinct from old.deadline
      and new.observation is not distinct from old.observation
      and new.photo_url is not distinct from old.photo_url
      and exists (select 1 from public.proposals p where p.listing_id = old.id and p.proposer_id = (select auth.uid())) then
      return new;
    end if;
    if new.status = 'concluida'
      and new.quantity_g is not distinct from old.quantity_g
      and new.ripeness is not distinct from old.ripeness
      and new.deadline is not distinct from old.deadline
      and new.observation is not distinct from old.observation
      and new.photo_url is not distinct from old.photo_url
      and public.can_finalize_listing(old.id) then
      return new;
    end if;
    if old.owner_id <> (select auth.uid()) then
      raise exception 'Only the listing owner or an eligible trade participant can update this listing';
    end if;
    if new.status = 'concluida' and not public.can_finalize_listing(old.id) then
      raise exception 'A listing can only be completed after both participants confirm the trade';
    end if;
  end if;
  return new;
end;
$$;
create trigger listings_guard_write before insert or update on public.listings
  for each row execute function public.guard_listing_write();

create or replace function public.guard_proposal_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_listing public.listings%rowtype;
  parent_proposal public.proposals%rowtype;
begin
  select * into target_listing from public.listings where id = new.listing_id;
  if not found or target_listing.deadline < current_date or target_listing.status not in ('ativa', 'em-negociacao') then
    raise exception 'Listing is unavailable for proposals';
  end if;
  if new.proposer_id <> (select auth.uid()) or not public.is_approved_profile(new.proposer_id) then
    raise exception 'Only approved users can submit proposals as themselves';
  end if;
  if target_listing.owner_id = new.proposer_id then raise exception 'A listing owner cannot propose against their own listing'; end if;
  if new.status <> 'proposto' then raise exception 'New proposals must start as proposed'; end if;
  if new.parent_id is not null then
    select * into parent_proposal from public.proposals where id = new.parent_id;
    if not found or parent_proposal.listing_id <> new.listing_id or parent_proposal.status not in ('proposto', 'contraproposto') then
      raise exception 'Counterproposal must belong to an open proposal on the same listing';
    end if;
  elsif target_listing.status <> 'ativa' then
    raise exception 'A new negotiation requires an active listing';
  end if;
  return new;
end;
$$;
create trigger proposals_guard_insert before insert on public.proposals
  for each row execute function public.guard_proposal_insert();

create or replace function public.guard_proposal_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_owner uuid;
  confirmation_total integer;
  everyone_confirmed boolean;
  everyone_missed boolean;
  expected_final_status text;
begin
  if public.is_admin() then return new; end if;
  if new.listing_id is distinct from old.listing_id
    or new.parent_id is distinct from old.parent_id
    or new.version is distinct from old.version
    or new.proposer_id is distinct from old.proposer_id
    or new.offered is distinct from old.offered
    or new.requested is distinct from old.requested
    or new.created_at is distinct from old.created_at then
    raise exception 'Proposal details cannot be edited after submission';
  end if;
  select owner_id into listing_owner from public.listings where id = old.listing_id;
  if new.status = 'contraproposto' and old.status in ('proposto', 'contraproposto') then
    if not exists (select 1 from public.proposals child where child.parent_id = old.id and child.proposer_id = (select auth.uid())) then
      raise exception 'A counterproposal must be submitted before marking the previous offer';
    end if;
  elsif new.status in ('aceito', 'cancelado') and old.status in ('proposto', 'contraproposto') then
    if listing_owner <> (select auth.uid()) or old.proposer_id = (select auth.uid()) then
      raise exception 'Only the listing owner can accept or reject this proposal';
    end if;
  elsif new.status = 'encontro-agendado' and old.status = 'aceito' then
    null;
  elsif new.status = 'aceito' and old.status in ('encontro-agendado', 'aceito') then
    null;
  elsif new.status in ('concluido', 'nao-compareceu', 'divergencia') then
    select count(*), bool_and(response = 'aconteceu'), bool_and(response = 'nao-aconteceu')
      into confirmation_total, everyone_confirmed, everyone_missed
    from public.meeting_confirmations where proposal_id = old.id;
    expected_final_status := case
      when everyone_confirmed then 'concluido'
      when everyone_missed then 'nao-compareceu'
      else 'divergencia'
    end;
    if confirmation_total < 2 or new.status <> expected_final_status then
      raise exception 'Trade outcome requires two matching confirmations';
    end if;
  else
    raise exception 'Invalid proposal status transition';
  end if;
  return new;
end;
$$;
create trigger proposals_guard_update before update on public.proposals
  for each row execute function public.guard_proposal_update();

-- Define funções auxiliares para as políticas RLS sem recursão entre políticas.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.foods enable row level security;
alter table public.listings enable row level security;
alter table public.proposals enable row level security;
alter table public.meetings enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.incidents enable row level security;
alter table public.meeting_confirmations enable row level security;

create policy "approved profiles readable by members" on public.profiles for select to authenticated
  using (status = 'aprovado' or id = (select auth.uid()) or public.is_admin());
create policy "profiles created by account trigger" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and status = 'pendente' and type in ('restaurante', 'comerciante'));
create policy "users update own profile; admin updates all" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin()) with check (id = (select auth.uid()) or public.is_admin());

create policy "active categories are public" on public.categories for select to anon, authenticated using (active or public.is_admin());
create policy "admins insert categories" on public.categories for insert to authenticated with check (public.is_admin());
create policy "admins update categories" on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "active foods are public" on public.foods for select to anon, authenticated using (
  active and exists (select 1 from public.categories c where c.id = category_id and c.active) or public.is_admin()
);
create policy "admins insert foods" on public.foods for insert to authenticated with check (public.is_admin());
create policy "admins update foods" on public.foods for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "visible listings" on public.listings for select to anon, authenticated using (
  (status = 'ativa' and deadline >= current_date)
  or (select auth.uid()) = owner_id
  or public.can_access_listing(id)
);
create policy "approved users create listings" on public.listings for insert to authenticated with check (
  owner_id = (select auth.uid()) and public.is_approved_profile((select auth.uid()))
);
create policy "owners participants and admins update listings" on public.listings for update to authenticated
  using (owner_id = (select auth.uid()) or public.can_access_listing(id))
  with check (owner_id = (select auth.uid()) or public.can_access_listing(id));

create policy "proposal participants read proposals" on public.proposals for select to authenticated
  using (public.can_access_proposal(id));
create policy "approved members create proposals" on public.proposals for insert to authenticated
  with check (proposer_id = (select auth.uid()) and public.is_approved_profile((select auth.uid())));
create policy "proposal participants update proposals" on public.proposals for update to authenticated
  using (public.can_access_proposal(id)) with check (public.can_access_proposal(id));

create policy "meeting participants read meetings" on public.meetings for select to authenticated
  using (public.can_access_proposal(proposal_id));
create policy "participants create meeting proposals" on public.meetings for insert to authenticated
  with check (public.can_access_proposal(proposal_id) and proposed_by = (select auth.uid()) and status = 'proposto');
create policy "meeting participants update meetings" on public.meetings for update to authenticated
  using (public.can_access_proposal(proposal_id)) with check (public.can_access_proposal(proposal_id));

create policy "trade participants read messages" on public.messages for select to authenticated
  using (public.can_access_proposal(proposal_id));
create policy "trade participants send messages" on public.messages for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_access_proposal(proposal_id));

create policy "users read own notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "trade participants notify counterpart" on public.notifications for insert to authenticated
  with check (
    public.can_access_proposal(proposal_id)
    and exists (select 1 from public.proposals p join public.listings l on l.id = p.listing_id
      where p.id = proposal_id and (user_id = p.proposer_id or user_id = l.owner_id)
      and (notifications.listing_id is null or notifications.listing_id = l.id))
  );
create policy "users mark own notifications read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy "reporters and admins read incidents" on public.incidents for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
create policy "participants report trade incidents" on public.incidents for insert to authenticated
  with check (
    reporter_id = (select auth.uid()) and status = 'aberta'
    and public.can_access_proposal(proposal_id)
    and exists (select 1 from public.proposals p where p.id = proposal_id and p.listing_id = incidents.listing_id)
  );
create policy "admins update incidents" on public.incidents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "trade participants read confirmations" on public.meeting_confirmations for select to authenticated
  using (public.can_access_proposal(proposal_id));
create policy "participants confirm a past accepted meeting" on public.meeting_confirmations for insert to authenticated
  with check (
    user_id = (select auth.uid()) and public.is_approved_profile((select auth.uid()))
    and public.can_access_proposal(proposal_id)
    and exists (select 1 from public.proposals p join public.meetings m on m.proposal_id = p.id
      where p.id = proposal_id and p.status = 'encontro-agendado'
      and m.status = 'aceito' and m.meeting_date < current_date)
  );

revoke select on public.profiles from public, anon, authenticated;
grant select (id, name, type, email, address, whatsapp, responsible, interests,
  opening_hours, avatar_url, status, created_at, last_activity, rejection_reason, block_reason)
  on public.profiles to authenticated;
grant select on public.categories, public.foods, public.listings to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update on public.listings, public.proposals, public.meetings,
  public.messages, public.notifications, public.incidents, public.meeting_confirmations to authenticated;
grant select, insert, update on public.categories, public.foods to authenticated;
