-- Aplica as regras de negócio das reuniões e confirmações de troca.

create or replace function public.guard_meeting_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.proposed_by <> (select auth.uid()) or new.status <> 'proposto' or new.meeting_date < current_date then
      raise exception 'A meeting proposal must be current and submitted by the signed-in participant';
    end if;
    return new;
  end if;
  if public.is_admin() then return new; end if;
  if new.proposal_id is distinct from old.proposal_id or new.created_at is distinct from old.created_at then
    raise exception 'Meeting identity cannot be changed';
  end if;
  if new.status = 'proposto' and old.status in ('proposto', 'recusado', 'aceito') then
    if new.proposed_by <> (select auth.uid()) or new.meeting_date < current_date then
      raise exception 'A meeting proposal must be current and submitted by the signed-in participant';
    end if;
  elsif new.status = 'aceito' and old.status = 'proposto' then
    if new.meeting_date is distinct from old.meeting_date
      or new.meeting_time is distinct from old.meeting_time
      or new.location is distinct from old.location
      or new.changes is distinct from old.changes
      or new.proposed_by is distinct from old.proposed_by then
      raise exception 'Accepting a meeting cannot change its details';
    end if;
    if old.proposed_by = (select auth.uid()) then
      raise exception 'The participant who proposed a meeting cannot accept their own proposal';
    end if;
  elsif new.status in ('recusado', 'cancelado') and old.status in ('proposto', 'aceito') then
    if new.meeting_date is distinct from old.meeting_date
      or new.meeting_time is distinct from old.meeting_time
      or new.location is distinct from old.location
      or new.changes is distinct from old.changes
      or new.proposed_by is distinct from old.proposed_by then
      raise exception 'Changing a meeting status cannot change its details';
    end if;
    null;
  elsif new.status = old.status then
    null;
  else
    raise exception 'Invalid meeting status transition';
  end if;
  return new;
end;
$$;
create trigger meetings_guard_update before insert or update on public.meetings
  for each row execute function public.guard_meeting_update();

create or replace function public.finish_trade_after_second_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer_count integer;
  all_happened boolean;
  all_missed boolean;
  final_status text;
  target_listing_id uuid;
begin
  select count(*), bool_and(response = 'aconteceu'), bool_and(response = 'nao-aconteceu')
    into answer_count, all_happened, all_missed
  from public.meeting_confirmations where proposal_id = new.proposal_id;

  if answer_count >= 2 then
    final_status := case
      when all_happened then 'concluido'
      when all_missed then 'nao-compareceu'
      else 'divergencia'
    end;
    update public.proposals set status = final_status where id = new.proposal_id;
    if final_status = 'concluido' then
      select listing_id into target_listing_id from public.proposals where id = new.proposal_id;
      update public.listings set status = 'concluida' where id = target_listing_id;
    end if;
  end if;
  return new;
end;
$$;
create trigger meeting_confirmations_finish_trade
  after insert on public.meeting_confirmations
  for each row execute function public.finish_trade_after_second_confirmation();
