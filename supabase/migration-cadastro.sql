-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Ele cria os perfis automaticamente quando um usuário é criado no Auth.

alter table public.profiles
  add column if not exists document_type text not null default 'cnpj';

alter table public.profiles
  drop constraint if exists profiles_document_type_check;

alter table public.profiles
  add constraint profiles_document_type_check
  check (document_type in ('cpf', 'cnpj'));

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
