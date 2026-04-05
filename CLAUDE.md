# CLAUDE.md — ToStatos | Hub de Qualidade (Plataforma de Inteligência de Qualidade de Software)

## Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4
- State: Zustand (auth, sprints)
- Routing: React Router DOM v7 (HashRouter)
- Backend: Node.js/Express (`server.js`) — serve SPA + endpoints admin e status-report
- Database: Supabase (PostgreSQL) com RLS, Realtime, Auth (GoTrue)
- Storage: localStorage (primário) + Supabase (sync)
- Alias: `@/*` → `src/*`

## Comandos
```bash
npm install          # instalar dependências
npm run dev:client   # iniciar frontend (Vite, porta 5173)
npm run dev          # iniciar backend (Express, porta 3000)
npm run typecheck    # verificar tipos TypeScript
npm run build        # build de produção
```

## Setup inicial (máquina nova)

### 1. Supabase local
```bash
supabase start                # sobe containers Docker
supabase db push --local      # aplica todas as migrations
```

### 2. Variáveis de ambiente
Criar `.env` na raiz (as keys são geradas pelo `supabase start`):
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<publishable key do supabase status>
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<secret key do supabase status>
```
Para obter as keys: `supabase status`

### 3. Usuário admin padrão
```bash
bash setup-admin.sh
```
O script cria o admin diretamente via Supabase Auth Admin API.
Alternativa manual: criar usuário direto no banco e depois:
`UPDATE profiles SET global_role='admin' WHERE email='admin@tostatos.com';`

> Nota: O endpoint `POST /api/admin/create-user` requer Bearer token de um usuário com `global_role='admin'`. Para o primeiro admin, use o script ou o banco diretamente.

### Credenciais padrão
| | |
|---|---|
| **Admin** | `admin@tostatos.com` / `Admin@123` |
| **Novos usuários** | senha padrão `Mudar@123` (troca obrigatória no primeiro login) |

---

## Ciclo Obrigatório de Qualidade

Após escrever ou modificar qualquer código, **nunca** considere a tarefa concluída sem passar por estas etapas:

### 1. ESCREVA
Implemente o código necessário para a tarefa.

### 2. TESTE
Execute o código de forma real:
- Verifique tipos: `npm run typecheck`
- Verifique se o servidor responde: `curl -s http://localhost:3000/api/health`
- Se o servidor não estiver rodando, inicie: `node server.js &`
- Para mudanças de UI: abra `http://localhost:5173` no browser

### 3. VEJA o resultado real
- Leia a saída do terminal — não assuma que funcionou
- Para erros de JS no browser, observe o console do DevTools
- Para API, leia o JSON retornado

### 4. DETECTE problemas
- Compare o resultado real com o esperado
- Liste qualquer erro, aviso ou comportamento incorreto

### 5. CORRIJA e REPITA
- Se houver qualquer problema, corrija e volte ao passo 2
- Repita até o resultado estar correto e sem erros

> A tarefa só está finalizada quando o teste real confirmar funcionamento.

---

## Estrutura de módulos
```
src/modules/
├── auth/            # Login, registro, perfil, troca de senha obrigatória
├── sprints/         # Dashboard, home, comparação, persistência
├── squads/          # Squads, membros, perfis de acesso, gestão de usuários
└── status-report/   # Status Report semanal (seções, itens, Gantt, export)
```

### auth
- `pages/`: LoginPage, ChangePasswordPage (troca obrigatória no 1o login)
- `store/`: authStore (Zustand) — sessão, profile, must_change_password
- Fluxo: novos usuários criados com `must_change_password: true` → ProtectedRoute redireciona para `/change-password`

### sprints
- `pages/`: HomePage (dashboard filtrado por squad), DashboardPage, ComparePage
- `store/`: sprintsStore (Zustand) — CRUD de sprints, persistência localStorage + Supabase
- Visibilidade: admin vê todas as sprints; demais veem apenas sprints dos seus squads

### squads
- `pages/`: SquadsPage (3 abas: Squads, Perfis de Acesso, Usuários)
- `services/`: squadsService — CRUD squads, membros, permission_profiles, usuários
- Funcionalidades: cores/descrição de squad, perfis de permissão, ativar/desativar usuários

### status-report
- `pages/`: StatusReportHomePage (listagem), StatusReportPage (editor)
- `components/`: SectionManager, SectionCard, ItemRow, ItemFormModal, ItemDetailPanel, StatsBar, ReportPreview, GanttView
- `services/`: statusReportPersistence (Supabase sync + sendBeacon flush), statusReportExport (PDF/clipboard), dateEngine
- `store/`: statusReportStore (Zustand) + seedData
- `types/`: statusReport.types.ts

## API Endpoints (server.js)
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/health` | Não | Health check |
| POST | `/api/admin/create-user` | Bearer + admin | Criar usuário via Supabase Auth Admin |
| POST | `/api/status-report-flush` | Não | Flush de status report via sendBeacon |

## Migrations (supabase/migrations/)
Ordem de aplicação:
1. `000000` — sprints table
2. `000000` — multi_user (profiles, squads, squad_members, RLS)
3. `000001` — fix handle_new_user trigger
4. `000002` — create_squad_with_lead RPC
5. `000003` — fix RLS recursion (security definer functions)
6. `000004` — global_role + permissions JSONB
7. `000005` — seed admin user
8. `000006` — permission_profiles table + defaults
9. `000007` — squad description/color + profiles.active
10. `000008` — fix RPC overload
11. `000009` — FK squad_members → profiles
12. `000010` — status_reports table + RLS + índices
13. `000011` — audit_logs table

## Comando /regressivo
Para executar um ciclo completo de regressão de QA use `/regressivo`.
