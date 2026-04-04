# Padrões de Código — Backend ToStatos

---

## 1. Middleware de Autenticação

```typescript
// middlewares/auth.ts
import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role só no backend
);

export interface AuthRequest extends Request {
  user: {
    id: string;              // app_users.id
    authUid: string;         // auth.users.id
    name: string;
    email: string;
    profileName: string;
    isAdmin: boolean;
    permissions: Record<string, boolean>;
  };
}

export async function requireAuth(
  req: Request, res: Response, next: NextFunction
) {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    // Verificar assinatura do JWT via Supabase (nunca decodificar manualmente)
    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
    if (error || !authUser) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Buscar perfil completo na app_users_view
    const { data: appUser, error: userErr } = await supabase
      .from('app_users_view')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .eq('active', true)
      .single();

    if (userErr || !appUser) {
      return res.status(403).json({ error: 'Usuário sem acesso configurado ou inativo' });
    }

    (req as AuthRequest).user = {
      id:           appUser.id,
      authUid:      authUser.id,
      name:         appUser.name,
      email:        appUser.email,
      profileName:  appUser.profile_name,
      isAdmin:      appUser.profile_is_admin ?? false,
      permissions:  appUser.profile_permissions ?? {},
    };

    next();
  } catch (err) {
    console.error('[requireAuth] Falha inesperada:', err);
    return res.status(401).json({ error: 'Falha na autenticação' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(req as AuthRequest).user?.isAdmin) {
    return res.status(403).json({ error: 'Requer perfil Admin' });
  }
  next();
}

export function requirePermission(key: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const perms = (req as AuthRequest).user?.permissions ?? {};
    if (!perms[key]) {
      return res.status(403).json({ error: `Permissão '${key}' necessária` });
    }
    next();
  };
}
```

---

## 2. Error Handler Global

```typescript
// middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log interno completo — nunca enviado ao cliente
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    error: err.message,
    stack: err.stack,
    body:  req.body,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code:  err.code,
    });
  }

  // Erro não esperado — resposta genérica
  return res.status(500).json({ error: 'Erro interno do servidor' });
}
```

---

## 3. Padrão de Rota — Controller

```typescript
// routes/teams.ts
import { Router } from 'express';
import { requireAuth, requireAdmin, requirePermission } from '../middlewares/auth';
import { TeamsController } from '../controllers/teams.controller';

const router = Router();
const ctrl   = new TeamsController();

// Todas as rotas deste módulo exigem auth
router.use(requireAuth);

router.get   ('/squads',          ctrl.listSquads);
router.get   ('/squads/:id',      ctrl.getSquad);
router.post  ('/squads',          requirePermission('manage_squads'), ctrl.createSquad);
router.put   ('/squads/:id',      requireAdmin,                       ctrl.updateSquad);
router.delete('/squads/:id',      requireAdmin,                       ctrl.deleteSquad);

router.post  ('/squads/:id/members',         requirePermission('manage_squads'), ctrl.addMember);
router.delete('/squads/:id/members/:uid',    requireAdmin,                       ctrl.removeMember);

router.get   ('/users',           requireAdmin,                       ctrl.listUsers);
router.get   ('/users/me',        ctrl.getMe);
router.post  ('/users',           requireAdmin,                       ctrl.createUser);
router.put   ('/users/:id',       requireAdmin,                       ctrl.updateUser);
router.patch ('/users/:id/status',requireAdmin,                       ctrl.toggleStatus);

export default router;
```

```typescript
// controllers/teams.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { TeamsService } from '../services/teams.service';
import { AppError } from '../middlewares/errorHandler';
import { z } from 'zod';

const createSquadSchema = z.object({
  name:        z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export class TeamsController {
  private service = new TeamsService();

  listSquads = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user   = (req as AuthRequest).user;
      const squads = await this.service.listSquads(user);
      res.json({ data: squads });
    } catch (err) {
      next(err);
    }
  };

  createSquad = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar input com Zod
      const parsed = createSquadSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, 'Dados inválidos', 'VALIDATION_ERROR');
      }

      const squad = await this.service.createSquad(parsed.data);
      res.status(201).json({ data: squad });
    } catch (err) {
      next(err);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = (req as AuthRequest).user;
      const profile = await this.service.getUserById(id);
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  };

  // ... demais métodos seguem o mesmo padrão
  getSquad      = async (req: Request, res: Response, next: NextFunction) => { try { /* ... */ } catch (err) { next(err); } };
  updateSquad   = async (req: Request, res: Response, next: NextFunction) => { try { /* ... */ } catch (err) { next(err); } };
  deleteSquad   = async (req: Request, res: Response, next: NextFunction) => { try { /* ... */ } catch (err) { next(err); } };
  addMember     = async (req: Request, res: Response, next: NextFunction) => { try { /* ... */ } catch (err) { next(err); } };
  removeMember  = async (req: Request, res: Response, next: NextFunction) => { try { /* ... */ } catch (err) { next(err); } };
  listUsers     = async (req: Request, res: Response, next: NextFunction) => { try { /* ... */ } catch (err) { next(err); } };
  createUser    = async (req: Request, res: Response, next: NextFunction) => { try { /* ... */ } catch (err) { next(err); } };
  updateUser    = async (req: Request, res: Response, next: NextFunction) => { try { /* ... */ } catch (err) { next(err); } };
  toggleStatus  = async (req: Request, res: Response, next: NextFunction) => { try { /* ... */ } catch (err) { next(err); } };
}
```

---

## 4. Padrão de Resposta de API

```typescript
// Sucesso — lista
res.json({ data: items, total: items.length });

// Sucesso — item único
res.json({ data: item });

// Sucesso — criação
res.status(201).json({ data: newItem });

// Sucesso — sem conteúdo (delete)
res.status(204).send();

// Erro de validação
res.status(400).json({ error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: [...] });

// Não autenticado
res.status(401).json({ error: 'Token não fornecido' });

// Sem permissão
res.status(403).json({ error: 'Permissão insuficiente' });

// Não encontrado
res.status(404).json({ error: 'Recurso não encontrado' });

// Conflito (ex: email já existe)
res.status(409).json({ error: 'Email já cadastrado', code: 'CONFLICT' });

// Erro interno — NUNCA com stack trace
res.status(500).json({ error: 'Erro interno do servidor' });
```

---

## 5. Validação de Input — Zod

```typescript
import { z } from 'zod';

// Schema de sprint
const sprintStateSchema = z.object({
  config: z.object({
    title:         z.string().min(1).max(200),
    squad:         z.string().min(1).max(100),
    qaName:        z.string().max(100).optional(),
    startDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    targetVersion: z.string().max(50).optional(),
    sprintDays:    z.number().int().min(1).max(90),
    hsCritical:    z.number().int().min(0).max(100),
    hsHigh:        z.number().int().min(0).max(100),
    hsMedium:      z.number().int().min(0).max(100),
    hsLow:         z.number().int().min(0).max(100),
    hsRetest:      z.number().int().min(0).max(100),
    hsBlocked:     z.number().int().min(0).max(100),
    hsDelayed:     z.number().int().min(0).max(100),
  }),
  features: z.array(z.object({
    id:           z.number(),
    name:         z.string().min(1).max(200),
    manualTests:  z.number().int().min(0),
    status:       z.enum(['Ativa', 'Bloqueada']),
    blockReason:  z.string().max(500).optional(),
    cases:        z.array(z.object({
      id:           z.number(),
      name:         z.string().min(1).max(500),
      complexity:   z.enum(['Baixa', 'Moderada', 'Alta']),
      status:       z.enum(['Pendente', 'Concluído', 'Falhou', 'Bloqueado']),
      executionDay: z.string().max(5).optional(),
      gherkin:      z.string().max(10000).optional(),
    })),
  })),
  bugs: z.array(z.object({
    id:         z.string().max(20),
    feature:    z.string().max(200),
    desc:       z.string().min(1).max(1000),
    stack:      z.enum(['Front', 'BFF', 'Back']),
    severity:   z.enum(['Baixa', 'Média', 'Alta', 'Crítica']),
    status:     z.enum(['Aberto', 'Em Andamento', 'Resolvido']),
    retests:    z.number().int().min(0),
    openedAt:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    resolvedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  })),
  blockers: z.array(z.object({
    id:     z.number(),
    date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().min(1).max(1000),
    hours:  z.number().min(0).max(1000),
  })),
}).passthrough(); // permite campos extras sem rejeitar

// Uso no endpoint
const parsed = sprintStateSchema.safeParse(req.body.payload);
if (!parsed.success) {
  return res.status(400).json({
    error: 'Payload da sprint inválido',
    code:  'VALIDATION_ERROR',
  });
}
```

---

## 6. JSONB — Padrões seguros de acesso e update

```typescript
// ✅ UPDATE seguro — nunca sobrescrever o JSONB inteiro sem validação
// Sempre usar jsonb_set para atualizar campos específicos via RPC

// ❌ Perigoso — sobrescreve o estado inteiro sem merge
await supabase.from('sprints').update({ state: newState }).eq('id', sprintId);

// ✅ Correto para update parcial — usar RPC
await supabase.rpc('update_sprint_config', {
  p_sprint_id: sprintId,
  p_config:    JSON.stringify(newConfig),
});

// RPC correspondente:
/*
CREATE OR REPLACE FUNCTION update_sprint_config(
  p_sprint_id TEXT,
  p_config    JSONB
)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  UPDATE sprints
  SET state = jsonb_set(state, '{config}', p_config, true),
      updated_at = NOW()
  WHERE id = p_sprint_id
    AND user_id = auth.uid(); -- RLS manual na função
END;
$$;
*/

// Operadores JSONB úteis:
// state -> 'config'          → retorna JSONB
// state ->> 'config'         → retorna TEXT
// state @> '{"key": "val"}' → contém?
// jsonb_set(state, '{a,b}', '"valor"') → atualiza campo aninhado
```

---

## 7. Logging Estruturado

```typescript
// utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
  redact: ['req.headers.authorization', 'body.password', 'body.token'],
});

// Uso nos controllers/services
logger.info({ squadId, userId: user.id }, 'Squad criado');
logger.warn({ sprintId, reason: 'payload inválido' }, 'Update rejeitado');
logger.error({ err, path: req.path }, 'Erro inesperado');
```

---

## 8. Testes de API — Vitest

```typescript
// tests/squads.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://localhost:3000';
let adminToken: string;
let engineerToken: string;

beforeAll(async () => {
  // Obter tokens de usuários de teste (fixtures no banco de test)
  adminToken    = await getTestToken('admin@test.com', 'senha-admin');
  engineerToken = await getTestToken('eng@test.com',   'senha-eng');
});

describe('POST /api/teams/squads', () => {
  it('Admin cria squad com sucesso', async () => {
    const res = await fetch(`${BASE}/api/teams/squads`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: 'Checkout Test', description: 'Squad de teste' }),
    });
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data.name).toBe('Checkout Test');
  });

  it('QA Engineer recebe 403 ao tentar criar squad', async () => {
    const res = await fetch(`${BASE}/api/teams/squads`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${engineerToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: 'Não pode' }),
    });
    expect(res.status).toBe(403);
  });

  it('Sem token recebe 401', async () => {
    const res = await fetch(`${BASE}/api/teams/squads`, { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('Payload inválido recebe 400', async () => {
    const res = await fetch(`${BASE}/api/teams/squads`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: '' }), // nome vazio — inválido
    });
    expect(res.status).toBe(400);
  });
});

async function getTestToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method:  'POST',
    headers: { apikey: process.env.SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
  const { access_token } = await res.json();
  return access_token;
}
```

---

## 9. GitHub Actions — CI/CD

```yaml
# .github/workflows/backend.yml
name: Backend CI

on:
  push:
    branches: [main, develop]
    paths: ['src/**', 'tests/**', 'package.json']
  pull_request:
    branches: [main]
    paths: ['src/**', 'tests/**']

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      supabase:
        image: supabase/postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - run: npm ci
      - run: npm run typecheck          # tsc --noEmit
      - run: npm run lint               # eslint
      - run: npm run test               # vitest
        env:
          SUPABASE_URL:              ${{ secrets.SUPABASE_URL_TEST }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_TEST }}
          SUPABASE_ANON_KEY:         ${{ secrets.SUPABASE_ANON_KEY_TEST }}

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm audit --audit-level=high
```

---

## 10. OAuth2 / SSO Azure AD via Supabase

```typescript
// Para integração Azure AD — configurar no Supabase Dashboard:
// Authentication > Providers > Azure > habilitar
// Preencher: Azure tenant ID, client ID, client secret

// No frontend (React) — login com Azure:
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'azure',
  options: {
    scopes: 'email profile',
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});

// No backend — o token resultante é o mesmo JWT do Supabase Auth
// Nenhuma mudança necessária no requireAuth — já funciona
// O auth.users.email virá do Microsoft Graph via Azure AD

// Para forçar domínio corporativo (ex: só @empresa.com):
// Supabase Dashboard > Auth > Restrictions > "Allowed email domains"
```
