# Supabase

## Instalação do zero

Os arquivos em `migrations/` formam a instalação completa para um projeto Supabase novo e vazio. No SQL Editor, execute-os uma vez, nesta ordem:

1. `20261005000100_core_schema.sql` — tabelas, índices, criação do perfil pendente no cadastro, validações e políticas RLS.
2. `20261005000200_trade_workflow.sql` — regras de reunião e confirmação da troca.
3. `20261005000300_listing_photo_storage.sql` — bucket público de fotos e regras de upload por usuário.
4. `20261005000400_starter_catalog.sql` — categorias e alimentos iniciais para habilitar novas publicações.
5. `20261005000500_secure_profile_directory.sql` — view com RLS e leitura segura de perfis.

Os arquivos de migração assumem que as tabelas e funções Supabase padrão (`auth`, `storage`, `anon`, `authenticated`) já existem. Não execute esta sequência sobre um banco existente com dados: ela é para uma instalação nova.

### Primeiro administrador

1. Cadastre a conta do administrador pelo fluxo normal do site. A migration cria o perfil como `pendente`; metadados enviados no signup nunca concedem privilégios de administrador.
2. No SQL Editor do Supabase, promova somente essa conta:

```sql
update public.profiles
set type = 'admin', status = 'aprovado'
where lower(email) = lower('email-do-admin@exemplo.com');
```

Confirme que a consulta alterou exatamente uma linha. Depois entre novamente no site. A aprovação de outras contas pode ser feita pela área administrativa.

### Aplicação

Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env.local` local e no ambiente do deploy. O app também aceita `VITE_SUPABASE_ANON_KEY` para projetos que ainda usam a chave pública legada. Nunca use a `service_role` no frontend. Se a confirmação de e-mail estiver habilitada no Supabase Auth, a pessoa precisa confirmar o endereço antes de entrar.

O catálogo inicial contém somente categorias e alimentos de referência; não cria usuários, publicações, propostas ou conversas de demonstração. Fotos de publicação são JPEGs no bucket `listing-photos`; o banco armazena a URL pública do arquivo. A view de diretório respeita o RLS e não expõe documentos pessoais; a listagem completa fica restrita à função administrativa.

## Projeto com o esquema inicial já instalado

Se as migrations `20261005000100_core_schema.sql` a `20261005000400_starter_catalog.sql` já foram executadas, aplique `20261005000500_secure_profile_directory.sql` para atualizar a view de perfis e restringir a leitura de documentos pessoais. Em um banco existente que não recebeu o esquema inicial desta sequência, não execute as migrations de instalação limpa; é necessária uma atualização compatível com as tabelas e os dados já presentes.
