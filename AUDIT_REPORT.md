# Auditoria técnica inicial — Feira Circular

Data: 13/10/2026

## Arquitetura verificada

- Frontend React 18 + TypeScript + Vite, concentrado em `src/app/App.tsx`.
- Persistência, autenticação, RLS, Storage e notificações via Supabase.
- Migrations SQL locais em `supabase/migrations`; não há ambiente de integração ou configuração de Supabase local no pacote.
- Não há framework de testes de browser ou testes de integração com banco configurado. O único comando existente é `pnpm test:rules`.

## Achados confirmados por leitura do código

1. Propostas, mudanças da publicação, mensagens e notificações eram gravadas por chamadas independentes. Falha parcial podia persistir a proposta sem atualizar o restante. A tela mostrava uma combinação otimista de status que nem sempre refletia o banco.
2. Aceitação/recusa/cancelamento de encontro e mudança de status da proposta eram chamadas separadas. Uma falha intermediária podia deixar os status do encontro e da proposta divergentes ou sem o evento de chat/notificação correspondente.
3. A confirmação final era aplicada duas vezes: o trigger `finish_trade_after_second_confirmation` finaliza a troca e publicação na transação da confirmação, e o frontend tentava atualizar os mesmos status depois. A atualização repetida podia produzir feedback enganoso.
4. O schema inicial concedia leitura anônima da tabela de publicações ativas, com todas as colunas autorizadas pelo `SELECT` da tabela. Não havia uma elegibilidade explícita para divulgação pública.
5. Não havia assinatura Realtime no cliente. Outra sessão podia atualizar uma negociação sem que a tela aberta recebesse os novos dados até uma recarga.
6. A migration nova restringe quem pode responder ou aceitar/refusar uma reunião, valida participantes aprovados e conserva as transições identificáveis no fluxo. A regra de confirmação única já existia via `unique (proposal_id, user_id)`.

## Estados mapeados

- Negociação: `proposto` → `contraproposto` → `aceito` → `encontro-agendado` → `concluido`, `nao-compareceu` ou `divergencia`; `cancelado` encerra uma proposta aberta. A conclusão é calculada pelo banco a partir de duas confirmações únicas.
- Encontro: `proposto` → `aceito`, `recusado` ou `cancelado`; recusado/cancelado pode receber nova proposta, que reabre o mesmo registro, preservando histórico de alterações.
- Ambiguidade de produto: não existe regra explícita de expiração automática para propostas ou encontros. A aplicação bloqueia novas propostas quando a publicação vence, mas não encerra automaticamente negociações existentes. Esta auditoria preserva essa regra e não inventa expiração automática.

## Alterações realizadas

- `src/app/PublicExperience.tsx`: seleção pública dos perfis Comerciante, Restaurante e Administrador, separada do mural. A seleção abre os componentes reais de dashboard/listagens/chat/administração do produto.
- `buildDemoPlatform` em `src/app/App.tsx` fornece 40 publicações e registros relacionados, de forma determinística. O perfil usa os mesmos componentes e opções que um usuário autenticado; gravações são simuladas no estado React local, sem sessão Supabase.
- O mural e a seleção da demonstração são rotas públicas distintas, com chamadas independentes na home e cabeçalho verde usando o ícone ShoppingBasket da plataforma.
- `src/app/App.tsx`: acessos da home à demonstração e ao mural; consentimento opcional para publicação no mural; inscrição Realtime; confirmação final passa a confiar na transação/trigger do banco e recarrega o estado persistido.
- `src/lib/platform.ts`: mapeia o consentimento público das publicações.
- `supabase/migrations/20261013000100_public_marketplace_and_meeting_guards.sql`: elegibilidade privada por padrão, RPC pública com campos limitados e quantidade em faixas, revogação de leitura anônima direta das publicações, validação de gravações de encontro, comprovação de encontro aceito antes do status `encontro-agendado` e inclusão das tabelas na publicação Realtime quando disponível.

## Validação executada

- `pnpm build`: passou; Vite reporta bundle JavaScript de aproximadamente 956 kB minificado (acima do limite de aviso de 500 kB).
- `pnpm test:rules`: passou, 4 testes — CPF/CNPJ, volume e determinismo do conjunto demonstrativo, e rejeição de perfil de demonstração inválido.
- `git diff --check`: passou.
- QA visual no navegador não foi executado: o ambiente não disponibilizou navegador CUA/IAB/Chrome para abrir a página local.

## Limitações e pendências

- A migration não foi aplicada a um projeto Supabase: não há ambiente local/teste configurado nem credenciais de banco verificáveis nesta execução. Portanto, RLS, migrations e Realtime não foram exercitados contra PostgreSQL.
- Não foi possível validar ponta a ponta entre duas contas, nem concorrência real, isolamento por RLS ou visibilidade após relogin. Esses cenários ainda precisam de testes de integração/e2e com um Supabase de teste.
- A cadeia de proposta e seus efeitos secundários ainda usa mais de uma chamada em algumas ações. Uma falha de rede durante essas chamadas ainda pode deixar efeitos parciais; consolidar cada fluxo em RPC transacional e cobri-lo em integração é trabalho pendente.
- A demonstração fornece exploração coerente de dados fictícios e ações de interesse locais, porém não renderiza todos os componentes transacionais reais do painel e suas alterações se limitam à sessão. O painel administrativo demonstrativo não reproduz todas as tabelas e operações do administrador real.
- O mural apresenta uma amostra limitada a 48 publicações por consulta. Para projetos com volume maior, falta uma API de paginação por cursor; o offset atual tem teto seguro de 10 mil.
- A home atual não tem preços nem unidade comercial por registro além de peso em gramas; o mural usa faixas de quantidade, sem inventar preços.
