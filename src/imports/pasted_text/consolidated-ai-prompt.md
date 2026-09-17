Claro. Com o PDF como referência das regras de negócio e incorporando **todas as alterações que você definiu depois dele**, eu usaria este como o novo **prompt consolidado para a IA que está construindo o aplicativo**.

---

# PROMPT FINAL — REFINAMENTO E IMPLEMENTAÇÃO COMPLETA DA PLATAFORMA

Quero que você continue o desenvolvimento da plataforma **Centro de Troca de Hortifruti**, preservando as regras de negócio já estabelecidas e implementando as melhorias e correções descritas abaixo.

O objetivo **não é apenas criar uma interface visual**, mas entregar uma aplicação funcional, coerente, responsiva e com estrutura de backend/banco de dados funcional.

As regras de negócio fundamentais do projeto são: conectar restaurantes e comerciantes de hortifruti do Centro de Abastecimento de Feira de Santana para facilitar trocas de alimentos e reduzir desperdícios; os dois tipos de usuários podem tanto pedir quanto oferecer alimentos; cadastros passam por aprovação administrativa; publicações utilizam formulários estruturados; trocas seguem inicialmente a lógica de peso igual; existe registro de pesagem, tolerância de 5%, cuidados de higiene e histórico das operações.  

## 1. OBJETIVO GERAL

Transformar o projeto atual em uma aplicação completa, funcional e visualmente consistente, com:

* frontend responsivo;
* backend funcional;
* banco de dados real;
* autenticação;
* diferentes níveis de acesso;
* painel administrativo;
* publicações;
* ofertas e pedidos;
* negociação;
* chat interno;
* propostas e contrapropostas;
* fechamento formal de acordo;
* acompanhamento do encontro;
* registro da pesagem;
* confirmação da realização da troca;
* checklist sanitário;
* notificações;
* histórico;
* reputação/moderação;
* gerenciamento de alimentos e demais informações pelo administrador.

**Não deixar funcionalidades apenas simuladas visualmente.** Botões, ícones, menus, filtros, notificações, ações de chat, formulários e alterações de status devem possuir comportamento funcional.

---

# 2. CONTEXTO DA PLATAFORMA

A plataforma atende inicialmente estabelecimentos próximos ao Centro de Abastecimento de Feira de Santana, especialmente **Rua Nova, Baraúnas e Queimadinha**.

O problema central é o desencontro entre:

* restaurantes que recebem frutas e verduras ainda verdes e precisam de produtos já maduros;
* comerciantes que possuem frutas e verduras maduras sobrando e correm risco de perder esses alimentos.

A plataforma deve organizar a comunicação e a troca entre esses dois lados.

O projeto começa nessa região, mas sua arquitetura deve ser preparada para **escalar futuramente para outros bairros, regiões e cidades**, sem necessidade de reconstruir toda a aplicação.

---

# 3. TELA INICIAL / HOME

A tela inicial precisa explicar claramente o que é a plataforma.

Não quero uma landing page com aparência de página de vendas.

Ela deve funcionar como uma apresentação institucional simples, visual e didática.

Deve deixar evidente:

### O que é a plataforma

Um sistema para facilitar a troca de alimentos entre restaurantes e comerciantes de hortifruti.

### Onde funciona inicialmente

Mostrar claramente:

**Feira de Santana — BA**

com destaque para os bairros/regiões inicialmente atendidos:

* Rua Nova
* Baraúnas
* Queimadinha

Também deixar claro que a plataforma pode ser expandida futuramente.

### Por que ela existe

Explicar de forma objetiva que a plataforma busca:

* reduzir desperdício de alimentos;
* aproveitar produtos que poderiam ser perdidos;
* aproximar quem precisa de determinado alimento de quem possui esse alimento disponível;
* organizar a negociação;
* dar mais segurança e rastreabilidade ao processo.

### Como funciona

Apresentar visualmente um fluxo simples:

**Publique → Encontre → Converse → Negocie → Feche o acordo → Realize a troca → Confirme**

A home deve explicar o funcionamento sem parecer propaganda comercial.

---

# 4. TIPOS DE USUÁRIO

Existem dois tipos principais:

### Restaurante

Pode:

* cadastrar-se;
* solicitar alimentos;
* oferecer alimentos;
* negociar;
* realizar trocas;
* acompanhar histórico.

### Comerciante

Pode:

* cadastrar-se;
* oferecer alimentos;
* solicitar alimentos;
* negociar;
* realizar trocas;
* acompanhar histórico.

**Não existe papel fixo de "quem oferece" e "quem pede".**

Uma mesma conta pode realizar as duas ações.

### Administrador

Possui acesso administrativo à plataforma e pode:

* aprovar/reprovar cadastros;
* bloquear estabelecimentos;
* gerenciar alimentos;
* gerenciar categorias;
* gerenciar bairros/regiões;
* gerenciar fotos;
* visualizar publicações;
* acompanhar negociações;
* visualizar acordos;
* acompanhar trocas;
* analisar divergências;
* analisar problemas reportados;
* acompanhar histórico;
* gerenciar informações da plataforma.

---

# 5. CADASTRO E APROVAÇÃO

O estabelecimento realiza o próprio cadastro.

Informações:

* nome do estabelecimento;
* CPF ou CNPJ;
* endereço;
* telefone;
* responsável;
* alimentos que costuma buscar;
* alimentos que costuma oferecer;
* horário de funcionamento.

Para restaurantes:

* tipo de estabelecimento;
* número do alvará sanitário.

Para comerciantes:

* número do espaço no Centro de Abastecimento;
* tipo principal de produto comercializado.

Após o cadastro:

**Pendente → Aguardando aprovação administrativa**

Enquanto estiver pendente:

* pode acessar a plataforma;
* pode visualizar conteúdos permitidos;
* **não pode criar pedidos ou ofertas.**

Se for recusado:

* mostrar o motivo;
* permitir correção;
* permitir novo envio.

O administrador também pode bloquear posteriormente uma conta aprovada quando houver problemas recorrentes.

---

# 6. ALIMENTOS — BANCO DE DADOS REAL

Não deixar os alimentos principais dependentes de arrays/mock hardcoded no frontend.

Criar estrutura de banco de dados para alimentos.

O administrador deve conseguir:

* adicionar alimento;
* editar alimento;
* desativar alimento;
* adicionar foto;
* substituir foto;
* organizar categorias;
* definir informações necessárias.

Exemplo:

**Banana**

* nome: Banana
* categoria: Fruta
* imagem: foto de banana

**Tomate**

* nome: Tomate
* categoria: Hortaliça
* imagem: foto de tomate

**Maracujá**

* nome: Maracujá
* categoria: Fruta
* imagem: foto de maracujá

As imagens precisam ser **semanticamente corretas**.

Nunca utilizar uma imagem de banana em uma publicação de tomate apenas porque é um placeholder.

---

# 7. DADOS MOCK / DEMONSTRAÇÃO

Utilizar poucos dados demonstrativos.

Não preencher a aplicação com dezenas de registros falsos.

Os dados mock devem servir somente para demonstrar o funcionamento.

Usar quantidades realistas, por exemplo:

* 700 g;
* 1 kg;
* 1,5 kg;
* 2 kg;
* 3 kg.

Evitar quantidades exageradas como 25 kg quando não houver necessidade para a demonstração.

Os dados demonstrativos devem parecer plausíveis e coerentes com a realidade da plataforma.

---

# 8. PUBLICAÇÕES

Pedidos e ofertas devem utilizar formulário estruturado.

Campos:

* alimento;
* quantidade;
* estado de maturação;
* prazo;
* observação opcional;
* foto obrigatória do alimento.

Estados de maturação:

* Verde
* Meio maduro
* Maduro
* Muito maduro

A classificação fixa deve ser a informação principal.

A observação é complementar.

A foto deve representar exatamente o alimento anunciado.

---

# 9. FOTO DO LOTE

Além da foto principal do alimento, estruturar o sistema para permitir o registro de **foto do lote**, quando aplicável.

A imagem deve ficar vinculada à publicação/lote correspondente no banco de dados.

O sistema deve permitir:

* adicionar foto;
* visualizar foto;
* substituir foto;
* eventualmente adicionar mais de uma foto caso a estrutura definida para o lote permita.

A imagem não deve ser apenas um elemento visual temporário do frontend.

---

# 10. CARDS E PADRONIZAÇÃO VISUAL

Todos os cards devem possuir estrutura visual padronizada.

Problema atual que precisa ser corrigido:

Cards com foto estão maiores que cards sem foto.

Isso não deve acontecer.

Todos os cards de uma mesma categoria/listagem devem possuir:

* mesma altura;
* mesma estrutura;
* mesma área de imagem;
* mesmos espaçamentos;
* títulos alinhados;
* informações alinhadas;
* botões alinhados;
* hierarquia visual consistente.

Quando uma publicação não possuir determinada informação, reservar o espaço necessário ou utilizar uma estrutura que mantenha o alinhamento.

**Não permitir que textos maiores, ausência de foto ou quantidade diferente de informações quebrem a estrutura dos cards.**

Aplicar o mesmo princípio a:

* listas;
* tabelas;
* formulários;
* propostas;
* mensagens;
* notificações;
* histórico;
* componentes de perfil.

A interface deve parecer construída como um sistema único, e não como várias telas independentes.

---

# 11. RESPONSIVIDADE

O projeto é **mobile-first**, mas isso não significa que o desktop possa ser simplesmente uma versão esticada do mobile.

Criar uma experiência realmente responsiva para:

* celular;
* tablet;
* notebook;
* desktop.

No desktop, corrigir especialmente:

* excesso de espaço vazio;
* componentes esticados;
* cards mal dimensionados;
* navegação inadequada;
* formulários estreitos ou excessivamente largos;
* chat mal aproveitado;
* desalinhamentos.

Utilizar grids, containers, espaçamentos e larguras adequadas para cada breakpoint.

A interface deve parecer um aplicativo profissional tanto no celular quanto no computador.

---

# 12. NOTIFICAÇÕES

Alterar completamente o comportamento atual.

As notificações **não devem aparecer permanentemente na tela principal**.

O sino de notificações precisa funcionar de verdade.

Ao clicar no sino:

→ abrir painel/lista de notificações.

Esse painel deve mostrar, por exemplo:

* nova oferta/pedido compatível;
* nova proposta;
* nova contraproposta;
* mudança de status;
* atualização de acordo;
* confirmação pendente;
* outros eventos relevantes.

O sino deve possuir indicação visual quando existirem notificações não lidas.

Não duplicar a mesma informação:

**As notificações normais devem ficar concentradas no sistema de notificações e não espalhadas permanentemente pela interface.**

---

# 13. EXCEÇÃO — AVISO DE CONFIRMAÇÃO DA TROCA

A pergunta:

> **"A troca aconteceu?"**

possui comportamento diferente.

Depois que chegar o dia combinado para o encontro, essa confirmação deve aparecer como **aviso fixo/destacado** para o usuário até que ele responda.

Porém:

**isso NÃO deve bloquear a utilização do aplicativo.**

O usuário pode continuar:

* navegando;
* conversando;
* visualizando publicações;
* utilizando outras funcionalidades.

Mas o aviso permanece visível até a resposta.

---

# 14. CHAT INTERNO — REMOVER WHATSAPP

**Remover o WhatsApp do fluxo da plataforma.**

Não utilizar WhatsApp como mecanismo de comunicação entre as partes.

Criar um **chat interno**, semelhante conceitualmente ao funcionamento de aplicativos como Uber e marketplaces.

O chat deve permitir:

* enviar mensagens;
* receber mensagens;
* visualizar histórico;
* identificar a publicação relacionada;
* negociar;
* enviar propostas;
* receber propostas;
* enviar contrapropostas;
* aceitar;
* recusar;
* acompanhar o status do acordo.

A conversa deve ficar armazenada no sistema.

---

# 15. NEGOCIAÇÃO

A negociação não deve depender de conversa informal.

A estrutura deve ser:

**Interesse → proposta → contraproposta → aceite → acordo confirmado**

Uma proposta deve registrar:

* quem propôs;
* o que está oferecendo;
* o que deseja receber;
* quantidade;
* data;
* horário;
* status;
* data/hora da criação.

---

# 16. CONTRAPROPOSTA

A pessoa que recebe uma proposta pode:

### Aceitar

Aceita exatamente os termos propostos.

### Recusar

Recusa a proposta.

### Fazer contraproposta

Pode alterar:

* alimento;
* quantidade;
* data;
* horário.

A contraproposta deve permanecer vinculada à proposta anterior.

O sistema deve manter o histórico:

**Proposta 1 → Contraproposta 1 → Contraproposta 2 → Aceite**

Isso permite acompanhar claramente como a negociação evoluiu.

---

# 17. FECHAMENTO DO ACORDO

Somente quando houver aceite da proposta final é que o sistema deve considerar o acordo **confirmado**.

Importante:

**Acordo confirmado não significa que a troca já aconteceu.**

Significa que ambas as partes concordaram em realizar a troca.

Depois do aceite:

* registrar o acordo no banco de dados;
* registrar participantes;
* alimentos;
* quantidades;
* data;
* horário;
* status;
* histórico da negociação.

O chat continua disponível.

---

# 18. DATA E HORÁRIO DO ACORDO

A proposta de acordo deve permitir selecionar:

* data;
* horário previsto.

Porém, o horário é um **horário combinado**, e não um mecanismo rígido para determinar se a troca aconteceu.

Exemplo:

> Acordo: 17/09 às 15h.

Se as partes realizarem a troca às 17h no mesmo dia, isso continua sendo considerado a troca daquele dia.

Portanto:

**A confirmação da realização deve estar vinculada principalmente à data do encontro, e não ao horário exato.**

A pergunta de confirmação pode ser disponibilizada após o término do dia combinado.

---

# 19. CONFIRMAÇÃO DA REALIZAÇÃO

Após o dia do encontro, cada parte recebe a pergunta:

> **Essa troca aconteceu?**

Opções:

* Sim, aconteceu.
* Não aconteceu.

Cada resposta deve ser registrada separadamente.

### Ambos respondem SIM

Status:

**Troca concluída**

### Ambos respondem NÃO

Status:

**Troca não realizada**

### Respostas diferentes

Exemplo:

Restaurante → Sim

Comerciante → Não

Status:

**Confirmações divergentes**

Isso deve ficar registrado no histórico e disponível para análise administrativa.

**Não aplicar punição ou bloqueio automático por divergência.**

O administrador pode analisar posteriormente.

---

# 20. PUBLICAÇÕES E BLOQUEIO

Não utilizar o bloqueio automático como mecanismo para obrigar uma pessoa a confirmar uma troca.

A confirmação pendente deve gerar:

* aviso persistente;
* indicação de pendência;
* registro no histórico.

Mas **não deve bloquear o aplicativo**.

Especialmente em casos de divergência:

> Divergência registrada ≠ usuário bloqueado.

Qualquer bloqueio deve ser uma decisão administrativa baseada no histórico e nas regras da plataforma.

---

# 21. PESAGEM

No encontro, cada parte pesa o alimento recebido na própria balança.

Registrar:

* peso combinado;
* peso efetivamente recebido;
* diferença;
* percentual de diferença.

Tolerância:

**até 5% de diferença.**

Se estiver dentro dos 5%:

→ permitir continuidade normal.

Se ultrapassar 5%:

→ mostrar alerta antes de finalizar.

As partes podem decidir se aceitam ou não prosseguir.

Foto da balança:

**recomendada, mas não obrigatória.**

---

# 22. HIGIENE SANITÁRIA

Antes de marcar a troca como concluída, apresentar checklist obrigatório.

Confirmar:

* alimento transportado em embalagem adequada;
* alimento sem sinais de contaminação;
* alimento sem sinais aparentes de estar estragado no momento da entrega.

A plataforma não deve afirmar que fiscaliza fisicamente o alimento.

Cada estabelecimento é responsável pelas boas práticas de manuseio e transporte.

---

# 23. PROBLEMAS APÓS A TROCA

Mesmo depois de uma troca ser marcada como concluída, permitir que uma das partes reporte um problema.

Exemplos:

* alimento diferente do anunciado;
* problema de qualidade;
* quantidade inadequada;
* outro problema relacionado à troca.

O sistema deve registrar:

* usuário;
* troca;
* data;
* descrição;
* evidências/fotos, quando aplicável;
* status da análise.

O administrador poderá analisar.

Problemas repetidos podem resultar em bloqueio administrativo.

---

# 24. HISTÓRICO

Registrar no banco de dados todas as etapas importantes:

* pedidos;
* ofertas;
* propostas;
* contrapropostas;
* acordos;
* alterações de status;
* pesagens;
* confirmação da troca;
* não comparecimento;
* respostas divergentes;
* problemas reportados;
* trocas concluídas.

Sempre que possível registrar:

* data;
* horário;
* participantes;
* alimento;
* quantidade;
* status;
* relação com o acordo/publicação.

O histórico deve permitir rastrear uma troca do início ao fim.

---

# 25. REPUTAÇÃO

O histórico deve servir como base para identificar estabelecimentos com bom histórico de utilização e também situações recorrentes de problemas.

Não criar punições automáticas arbitrárias.

A reputação deve ser baseada em eventos reais registrados na plataforma.

O administrador deve conseguir visualizar esse histórico para tomar decisões de moderação.

---

# 26. PAINEL ADMINISTRATIVO

Criar um painel administrativo funcional.

O administrador deve conseguir, sem editar código:

### Usuários

* visualizar;
* aprovar;
* recusar;
* bloquear;
* consultar histórico.

### Alimentos

* adicionar;
* editar;
* desativar;
* adicionar foto;
* editar categoria.

### Categorias

* criar;
* editar;
* desativar.

### Regiões

* cadastrar bairros/regiões;
* editar;
* ativar/desativar.

### Publicações

* visualizar;
* moderar;
* acompanhar status.

### Negociações

* acompanhar propostas;
* contrapropostas;
* acordos.

### Trocas

* visualizar encontros;
* pesagens;
* confirmações;
* divergências;
* problemas.

### Moderação

* visualizar denúncias;
* analisar ocorrências;
* registrar decisão administrativa.

O máximo possível de conteúdo operacional deve ser gerenciável pelo ADM, evitando dependência de alterações diretamente no código.

---

# 27. BANCO DE DADOS

Criar uma estrutura de banco de dados coerente com a aplicação.

As entidades devem possuir relacionamentos adequados, contemplando pelo menos:

* usuários/estabelecimentos;
* administradores;
* alimentos;
* categorias;
* bairros/regiões;
* publicações;
* lotes;
* fotos;
* propostas;
* contrapropostas;
* acordos;
* chats;
* mensagens;
* encontros;
* pesagens;
* confirmações;
* checklist sanitário;
* notificações;
* histórico;
* ocorrências/problemas.

Evitar dados duplicados e estruturas improvisadas.

As mudanças de status devem ser persistidas.

Não depender apenas do estado local do frontend.

---

# 28. ESTADOS DA APLICAÇÃO

Toda funcionalidade importante deve possuir estados claros.

Exemplo de acordo:

**Solicitada**
↓
**Proposta**
↓
**Contraproposta** (se houver)
↓
**Aceita**
↓
**Aguardando encontro**
↓
**Aguardando confirmação**
↓
**Concluída / Não realizada / Confirmações divergentes**

A interface deve mostrar claramente em qual etapa a negociação está.

---

# 29. UX / EXPERIÊNCIA DO USUÁRIO

A aplicação deve ser:

* didática;
* simples;
* visualmente limpa;
* profissional;
* consistente;
* responsiva;
* fácil de entender.

Evitar excesso de informações.

Cada ação deve possuir feedback adequado.

Implementar, quando aplicável:

* loading;
* estado vazio;
* erro;
* sucesso;
* confirmação;
* estados desabilitados;
* mensagens explicativas;
* feedback de ações.

Não deixar o usuário clicar em algo e não acontecer nada.

**Todo elemento que aparenta ser interativo precisa funcionar.**

---

# 30. PADRÃO VISUAL

Manter uma identidade visual coerente em todo o sistema.

Padronizar:

* tipografia;
* tamanhos;
* espaçamentos;
* bordas;
* ícones;
* botões;
* cards;
* badges;
* estados;
* cores;
* campos;
* modais;
* menus.

Não criar componentes visualmente diferentes para fazer a mesma função em telas diferentes.

Os ícones devem ser intuitivos e consistentes.

---

# 31. DESKTOP E MOBILE

Revisar todas as telas existentes.

Não considerar o projeto finalizado apenas porque funciona no celular.

Testar visualmente:

### Mobile

* navegação;
* cards;
* chat;
* notificações;
* formulários;
* modais;
* botões;
* rolagem.

### Desktop

* largura;
* grids;
* sidebar/header;
* cards;
* chat;
* formulários;
* tabelas;
* painel administrativo.

Nenhuma tela deve parecer "quebrada", vazia demais, esticada ou desalinhada.

---

# 32. PRINCÍPIO FUNDAMENTAL

A aplicação deve transmitir a sensação de um **produto digital completo**, e não de um protótipo composto por telas independentes.

Tudo precisa estar conectado:

**Cadastro → aprovação → publicação → interesse → chat → negociação → contraproposta → acordo → encontro → pesagem → confirmação → histórico → reputação/moderação.**

As informações precisam circular corretamente entre essas etapas e ser persistidas no banco de dados.

---

# 33. REGRA FINAL DE IMPLEMENTAÇÃO

Antes de considerar o projeto concluído:

1. Revisar todas as telas existentes.
2. Corrigir funcionalidades que atualmente são apenas visuais.
3. Conectar frontend ao backend/banco.
4. Remover dependências desnecessárias de dados mock.
5. Manter somente poucos dados demonstrativos.
6. Garantir que imagens correspondam aos alimentos.
7. Corrigir todos os cards para dimensões padronizadas.
8. Corrigir completamente a responsividade desktop.
9. Implementar o chat interno.
10. Remover o WhatsApp do fluxo.
11. Implementar propostas e contrapropostas.
12. Implementar fechamento formal do acordo.
13. Implementar registro de data/horário.
14. Implementar confirmação pós-encontro por dia.
15. Manter a confirmação como aviso persistente até resposta, sem bloquear o aplicativo.
16. Registrar respostas divergentes sem punição automática.
17. Implementar pesagem e tolerância de 5%.
18. Implementar checklist sanitário.
19. Implementar notificações pelo sino.
20. Implementar painel administrativo.
21. Permitir ao ADM gerenciar alimentos, fotos, categorias e demais dados operacionais.
22. Implementar histórico completo.
23. Garantir que todos os elementos interativos funcionem.
24. Revisar a experiência de usuário de ponta a ponta.

**Não adicionar funcionalidades desnecessárias apenas para aumentar a quantidade de recursos. Priorizar coerência, funcionalidade, rastreabilidade, simplicidade e qualidade da experiência.**

O resultado final deve ser uma plataforma funcional e escalável para o **Centro de Troca de Hortifruti**, inicialmente voltada para **Feira de Santana — BA**, especialmente **Rua Nova, Baraúnas e Queimadinha**, mas preparada estruturalmente para expansão futura.
