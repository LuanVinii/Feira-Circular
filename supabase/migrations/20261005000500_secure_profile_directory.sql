-- Atualiza a view de perfis para respeitar RLS e restringir documentos pessoais.
-- Executar após a migration 20261005000100_core_schema.sql.

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

drop policy if exists "profiles readable by owner and admins" on public.profiles;
drop policy if exists "approved profiles readable by members" on public.profiles;
create policy "approved profiles readable by members" on public.profiles for select to authenticated
  using (status = 'aprovado' or id = (select auth.uid()) or public.is_admin());

revoke select on public.profiles from public, anon, authenticated;
grant select (id, name, type, email, address, whatsapp, responsible, interests,
  opening_hours, avatar_url, status, created_at, last_activity, rejection_reason, block_reason)
  on public.profiles to authenticated;

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
