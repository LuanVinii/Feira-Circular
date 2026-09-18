-- Execute no SQL Editor do Supabase (depois de schema.sql / migration-cadastro.sql).
-- Libera leitura de catálogo no cadastro, dá visão total ao admin e cria tabelas extras.

alter table public.profiles
  add column if not exists rejection_reason text,
  add column if not exists block_reason text,
  add column if not exists last_activity timestamptz;

alter table public.meetings
  add column if not exists changes jsonb not null default '[]'::jsonb;

create table if not exists public.meeting_confirmations (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  response text not null check (response in ('aconteceu', 'nao-aconteceu')),
  weight_g integer,
  created_at timestamptz not null default now(),
  unique (proposal_id, user_id)
);

alter table public.meeting_confirmations enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and type = 'admin'
  );
$$;

drop policy if exists "authenticated users can read active categories" on public.categories;
drop policy if exists "anyone can read active categories" on public.categories;
create policy "anyone can read active categories"
  on public.categories for select
  using (active = true or public.is_admin());

drop policy if exists "authenticated users can read active foods" on public.foods;
drop policy if exists "anyone can read active foods" on public.foods;
create policy "anyone can read active foods"
  on public.foods for select
  using (active = true or public.is_admin());

drop policy if exists "authenticated users can read approved profiles" on public.profiles;
create policy "authenticated users can read approved profiles"
  on public.profiles for select to authenticated
  using (status = 'aprovado' or id = auth.uid() or public.is_admin());

drop policy if exists "admin can update profiles" on public.profiles;
create policy "admin can update profiles"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin can delete profiles" on public.profiles;
create policy "admin can delete profiles"
  on public.profiles for delete to authenticated
  using (public.is_admin());

drop policy if exists "authenticated users can read listings" on public.listings;
create policy "authenticated users can read listings"
  on public.listings for select to authenticated
  using (true);

drop policy if exists "admin can update listings" on public.listings;
create policy "admin can update listings"
  on public.listings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "authenticated users can read proposals" on public.proposals;
create policy "authenticated users can read proposals"
  on public.proposals for select to authenticated
  using (
    proposer_id = auth.uid()
    or exists (select 1 from public.listings where listings.id = listing_id and listings.owner_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "admin can update proposals" on public.proposals;
create policy "admin can update proposals"
  on public.proposals for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "participants can read meetings" on public.meetings;
create policy "participants can read meetings"
  on public.meetings for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.proposals p
      join public.listings l on l.id = p.listing_id
      where p.id = proposal_id
        and (p.proposer_id = auth.uid() or l.owner_id = auth.uid())
    )
  );

drop policy if exists "participants can read messages" on public.messages;
create policy "participants can read messages"
  on public.messages for select to authenticated
  using (
    public.is_admin()
    or author_id = auth.uid()
    or exists (
      select 1 from public.proposals p
      join public.listings l on l.id = p.listing_id
      where p.id = proposal_id
        and (p.proposer_id = auth.uid() or l.owner_id = auth.uid())
    )
  );

drop policy if exists "users can read their notifications" on public.notifications;
create policy "users can read their notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users can manage their incidents" on public.incidents;
create policy "users can manage their incidents"
  on public.incidents for all to authenticated
  using (reporter_id = auth.uid() or public.is_admin())
  with check (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "participants can read confirmations" on public.meeting_confirmations;
create policy "participants can read confirmations"
  on public.meeting_confirmations for select to authenticated
  using (
    public.is_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.proposals p
      join public.listings l on l.id = p.listing_id
      where p.id = proposal_id
        and (p.proposer_id = auth.uid() or l.owner_id = auth.uid())
    )
  );

drop policy if exists "participants can insert confirmations" on public.meeting_confirmations;
create policy "participants can insert confirmations"
  on public.meeting_confirmations for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.proposals p
      join public.listings l on l.id = p.listing_id
      where p.id = proposal_id
        and (p.proposer_id = auth.uid() or l.owner_id = auth.uid())
    )
  );

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
    coalesce(new.raw_user_meta_data->>'document', new.id::text),
    coalesce(new.raw_user_meta_data->>'document_type', 'cnpj'),
    coalesce(new.raw_user_meta_data->>'address', ''),
    coalesce(new.raw_user_meta_data->>'whatsapp', ''),
    coalesce(new.raw_user_meta_data->>'responsible', ''),
    coalesce(new.email, ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'interests', '[]'::jsonb))), '{}'),
    coalesce(new.raw_user_meta_data->>'opening_hours', ''),
    coalesce(new.raw_user_meta_data->>'status', 'pendente')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
