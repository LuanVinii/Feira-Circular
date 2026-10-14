-- Public listing eligibility is explicit and defaults to private.
alter table public.listings
  add column if not exists public_visible boolean not null default false;

create index if not exists listings_public_feed_idx
  on public.listings (created_at desc)
  where public_visible = true and status = 'ativa';

create or replace function public.public_marketplace_listings(p_limit integer default 24, p_offset integer default 0)
returns table (
  id uuid,
  type text,
  food_name text,
  category_name text,
  quantity_band text,
  ripeness text,
  created_at timestamptz,
  region text
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.type, f.name, c.name,
         case when l.quantity_g < 10000 then 'Até 10 kg'
              when l.quantity_g < 25000 then '10–25 kg'
              when l.quantity_g < 50000 then '25–50 kg'
              else '50 kg ou mais' end,
         l.ripeness, l.created_at,
         'Feira de Santana'::text
  from public.listings l
  join public.foods f on f.id = l.food_id and f.active
  join public.categories c on c.id = f.category_id and c.active
  join public.profiles p on p.id = l.owner_id and p.status = 'aprovado'
  where l.public_visible
    and l.status = 'ativa'
    and l.deadline >= current_date
  order by l.created_at desc, l.id
  limit greatest(1, least(coalesce(p_limit, 24), 48))
  offset greatest(0, least(coalesce(p_offset, 0), 10000));
$$;
revoke all on function public.public_marketplace_listings(integer, integer) from public;
grant execute on function public.public_marketplace_listings(integer, integer) to anon, authenticated;
-- Anonymous clients must use the column-limited function above; the previous
-- schema granted table reads for all currently active listings.
revoke select on public.listings from anon;

-- Tighten meeting writes. A response may only be made by the other participant;
-- meeting and proposal state are changed together by the caller transaction.
create or replace function public.guard_meeting_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_owner uuid;
  proposal_proposer uuid;
  actor uuid := (select auth.uid());
  is_participant boolean;
begin
  if tg_op = 'INSERT' then
    if new.proposed_by is distinct from actor or new.status <> 'proposto' or new.meeting_date < current_date then
      raise exception 'A meeting proposal must be current and submitted by the signed-in participant';
    end if;
    select l.owner_id, p.proposer_id into listing_owner, proposal_proposer
      from public.proposals p join public.listings l on l.id = p.listing_id
      where p.id = new.proposal_id and p.status = 'aceito';
    if not found or actor not in (listing_owner, proposal_proposer)
      or not public.is_approved_profile(actor) then
      raise exception 'Only an approved trade participant can propose a meeting for an accepted trade';
    end if;
    return new;
  end if;
  if new.proposal_id is distinct from old.proposal_id or new.created_at is distinct from old.created_at then
    raise exception 'Meeting identity cannot be changed';
  end if;
  select l.owner_id, p.proposer_id into listing_owner, proposal_proposer
    from public.proposals p join public.listings l on l.id = p.listing_id
    where p.id = old.proposal_id;
  is_participant := actor in (listing_owner, proposal_proposer);
  if not coalesce(is_participant, false) or not public.is_approved_profile(actor) then
    raise exception 'Only approved trade participants can change a meeting';
  end if;
  if new.status = 'aceito' and old.status = 'proposto' then
    if old.proposed_by = actor or new.meeting_date is distinct from old.meeting_date
      or new.meeting_time is distinct from old.meeting_time or new.location is distinct from old.location
      or new.changes is distinct from old.changes or new.proposed_by is distinct from old.proposed_by then
      raise exception 'Only the other participant can accept an unchanged meeting proposal';
    end if;
  elsif new.status = 'recusado' and old.status = 'proposto' then
    if old.proposed_by = actor or new.meeting_date is distinct from old.meeting_date
      or new.meeting_time is distinct from old.meeting_time or new.location is distinct from old.location
      or new.changes is distinct from old.changes or new.proposed_by is distinct from old.proposed_by then
      raise exception 'Only the other participant can refuse an unchanged meeting proposal';
    end if;
  elsif new.status = 'cancelado' and old.status in ('proposto', 'aceito') then
    if new.meeting_date is distinct from old.meeting_date or new.meeting_time is distinct from old.meeting_time
      or new.location is distinct from old.location or new.changes is distinct from old.changes
      or new.proposed_by is distinct from old.proposed_by then
      raise exception 'Cancelling a meeting cannot change its details';
    end if;
  elsif new.status = 'proposto' and old.status in ('proposto', 'aceito', 'recusado', 'cancelado') then
    if old.status = 'proposto' and old.proposed_by = actor then
      raise exception 'The other participant must respond before another meeting proposal is submitted';
    end if;
    if new.proposed_by is distinct from actor or new.meeting_date < current_date
      or new.meeting_time is null or length(trim(new.location)) = 0 then
      raise exception 'A new meeting proposal must be valid and submitted by the signed-in participant';
    end if;
  elsif new.status = old.status and new.meeting_date is not distinct from old.meeting_date
    and new.meeting_time is not distinct from old.meeting_time and new.location is not distinct from old.location
    and new.changes is not distinct from old.changes and new.proposed_by is not distinct from old.proposed_by then
    return new;
  else
    raise exception 'Invalid meeting status transition';
  end if;
  return new;
end;
$$;

create or replace function public.require_accepted_meeting_for_scheduled_trade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'encontro-agendado' and old.status = 'aceito' then
    if not exists (
      select 1 from public.meetings m
      where m.proposal_id = new.id
        and m.status = 'aceito'
        and m.proposed_by <> (select auth.uid())
    ) then
      raise exception 'A trade can be scheduled only after the other participant accepts a persisted meeting';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists proposals_require_accepted_meeting on public.proposals;
create trigger proposals_require_accepted_meeting
  before update of status on public.proposals
  for each row execute function public.require_accepted_meeting_for_scheduled_trade();

-- Keep security definer helper outputs out of the public profile surface.
comment on column public.listings.public_visible is
  'Owner opt-in for the anonymized public marketplace feed; false by default.';

-- Enable change events for signed-in participants when Supabase Realtime is
-- installed. Adding only missing tables keeps repeated deployments idempotent.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['listings','proposals','meetings','messages','notifications','meeting_confirmations','incidents'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
