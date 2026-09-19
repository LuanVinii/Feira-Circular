-- Execute no SQL Editor depois das outras migrations.
-- Agendamento de encontro com aceite das duas partes.

alter table public.meetings
  add column if not exists status text not null default 'aceito',
  add column if not exists proposed_by uuid references public.profiles(id);

alter table public.meetings
  drop constraint if exists meetings_status_check;

alter table public.meetings
  add constraint meetings_status_check
  check (status in ('proposto', 'aceito', 'recusado', 'cancelado'));

drop policy if exists "participants can insert meetings" on public.meetings;
create policy "participants can insert meetings"
  on public.meetings for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.proposals p
      join public.listings l on l.id = p.listing_id
      where p.id = proposal_id
        and (p.proposer_id = auth.uid() or l.owner_id = auth.uid())
    )
  );

drop policy if exists "participants can update meetings" on public.meetings;
create policy "participants can update meetings"
  on public.meetings for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.proposals p
      join public.listings l on l.id = p.listing_id
      where p.id = proposal_id
        and (p.proposer_id = auth.uid() or l.owner_id = auth.uid())
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.proposals p
      join public.listings l on l.id = p.listing_id
      where p.id = proposal_id
        and (p.proposer_id = auth.uid() or l.owner_id = auth.uid())
    )
  );
