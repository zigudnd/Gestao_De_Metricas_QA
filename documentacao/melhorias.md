usuário admin padrão (admin@tostatos.com / Admin@123)


❯ nao execute ou desenvolva nada no momento, me ajuda com uma duvida, quero exampandir o sistema para que possa     
efetuar comparacao entre sprints, como seguiria com essa nova funcao ? me diga qual melhor abordagem                

⏺ Boa pergunta. Vou analisar o que já existe no sistema e traçar as opções.

  ---
  O que já temos disponível

  - MasterIndex — array de SprintIndexEntry[] no localStorage com: id, title, squad, startDate, endDate, totalTests,
   totalExec, updatedAt, favorite
  - SprintState completo de cada sprint em qaDashboardData_<id> — inclui bugs, features, blockers, KPIs deriváveis
  - useSprintMetrics — hook que já deriva todos os KPIs de um estado

  O sistema já tem toda a matéria-prima. O que falta é uma tela de comparação que carregue dois ou mais estados e os
   exiba lado a lado.

  ---
  Abordagens possíveis

  Opção A — Página de Comparação Dedicada (/sprints/compare)

  Nova rota que permite selecionar 2–3 sprints e exibir um painel comparativo.

  Prós: experiência focada, sem poluir o dashboard atual, fácil de expandir
  Contras: requer nova rota e página

  Fluxo:
  HomePage → botão "Comparar" (seleciona checkboxes) → /sprints/compare?ids=id1,id2
  → carrega SprintState de cada id via loadFromStorage
  → recalcula KPIs com computeFields + lógica do useSprintMetrics
  → renderiza tabela ou cards lado a lado

  ---
  Opção B — Modal de Comparação na HomePage

  Ao selecionar 2+ sprints na lista, abre um modal com o comparativo.

  Prós: sem nova rota, mais leve
  Contras: modal fica grande, difícil exportar/compartilhar

  ---
  Opção C — Aba "Histórico" dentro do Dashboard da Sprint

  Dentro de uma sprint aberta, uma aba que compara com sprints anteriores do mesmo squad.

  Prós: contexto natural ("como fui na sprint passada?")
  Contras: escopo limitado — compara só com o squad atual

  ---
  Minha recomendação: Opção A

  É a mais escalável e alinhada com o que o sistema já faz. Implementação em camadas:

  Fase 1 — Comparação Simples (2 sprints)

  Tabela com KPIs em colunas, uma sprint por coluna:

  ┌─────────────────┬───────────┬───────────┬───────┐
  │       KPI       │ Sprint 12 │ Sprint 13 │   Δ   │
  ├─────────────────┼───────────┼───────────┼───────┤
  │ Health Score    │ 78        │ 85        │ +7    │
  ├─────────────────┼───────────┼───────────┼───────┤
  │ Total de Testes │ 120       │ 145       │ +25   │
  ├─────────────────┼───────────┼───────────┼───────┤
  │ Bugs Abertos    │ 8         │ 3         │ -5    │
  ├─────────────────┼───────────┼───────────┼───────┤
  │ Capacidade Real │ 90%       │ 95%       │ +5%   │
  ├─────────────────┼───────────┼───────────┼───────┤
  │ MTTR            │ 4h        │ 2.5h      │ -1.5h │
  └─────────────────┴───────────┴───────────┴───────┘

  Fase 2 — Tendência (N sprints)

  Gráficos de linha com evolução dos KPIs ao longo das sprints selecionadas.

  Fase 3 — Exportação

  Exportar o comparativo como imagem ou CSV.

  ---
  O que seria criado

  ┌────────────────────────────────────────────────┬─────────────────────────────────────────────┐
  │                    Arquivo                     │                    Papel                    │
  ├────────────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ src/modules/sprints/pages/ComparePage.tsx      │ Tela principal                              │
  ├────────────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ src/modules/sprints/services/compareService.ts │ Carrega N sprints, normaliza e computa KPIs │
  ├────────────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ src/app/routes.tsx                             │ Nova rota /sprints/compare                  │
  ├────────────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ src/modules/sprints/pages/HomePage.tsx         │ Seleção de sprints + botão de comparar      │
  └────────────────────────────────────────────────┴─────────────────────────────────────────────┘

  O compareService basicamente faz o que useSprintMetrics já faz, mas para um array de estados em vez de um só — não
   precisa duplicar lógica, apenas adaptar.

  ---
  Pergunta chave antes de começar

  Qual é o caso de uso principal pra você?

  1. "Quanto evoluí sprint a sprint?" → Fase 2 (tendência) é o foco
  2. "Essa sprint foi melhor que a anterior?" → Fase 1 (comparação direta de 2) já resolve
  3. "Preciso apresentar evolução pro time/gestão" → Fase 2 + exportação

  Isso define por onde começar e qual nível de complexidade faz sentido agora.




1. Autenticação
  O sistema hoje não tem identidade de usuário. Adicionar auth (JWT ou sessão) via Supabase Auth, Auth.js ou Clerk      
  resolve isso sem grandes mudanças no frontend — o sprintId já existe como chave de acesso.
                                                                                                                        
  2. Banco de dados centralizado                                                                                      
  O server.js já tem suporte a Supabase. Com múltiplos usuários, o LocalStorage deixa de funcionar como fonte de verdade
   — cada um teria seus dados isolados no navegador. A migração para Supabase (ou Postgres) seria o principal passo, com
   uma tabela simples: (user_id, project_key, payload jsonb).
                                                                                                                        
  3. Isolamento por workspace                                                                                         
  Hoje o projectKey é a única separação. Com múltiplos usuários, você precisaria de um nível acima: organizacao → 
  usuarios → sprints. Supabase tem Row Level Security (RLS) nativo para isso.                                           
   
  4. Permissões por papel                                                                                               
  QA Lead edita tudo, Stakeholder só visualiza, Dev só vê bugs atribuídos a ele. O sistema de responsibles que já existe
   (PO, TL, Gerente...) pode ser a base para isso — bastaria vincular cada papel a um nível de permissão.               
   
  5. Colaboração em tempo real                                                                                          
  Se dois usuários editam ao mesmo tempo, o PUT /api/dashboard/:key cria conflito (último a salvar ganha). Supabase   
  Realtime ou WebSockets resolveriam isso com sync por evento em vez de substituição total do payload.                  
   
  6. Histórico de alterações                                                                                            
  Hoje não há auditoria — qualquer mudança sobrescreve o estado. Uma tabela de eventos (quem mudou o quê e quando)    
  viabiliza rollback, diff entre versões e accountability.                                                              
   
  ---                                                                                                                   
  Caminho mais simples para começar:                                                                                  
  Supabase resolve autenticação + banco + realtime + RLS em um único serviço, e o server.js já tem o slot para ele. O   
  esforço seria basicamente: habilitar auth no frontend → associar user_id ao projectKey → ativar RLS na tabela.