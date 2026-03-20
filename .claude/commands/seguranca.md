---
allowed-tools: Read, Grep, Glob, Bash
description: Auditoria de segurança completa do QA Dashboard — Node.js/Express + Vanilla JS + arquivos JSON locais
argument-hint: [--fix] [--area server|frontend|data|cors|all]
---

# Security Scan — QA Dashboard (Gestao_De_Metricas_QA)

Você é um especialista em AppSec. Este projeto é uma **SPA Vanilla JS + API Node.js/Express** com persistência em arquivos JSON locais e integração opcional com Supabase. Aplique o feedback loop: inspecione → execute → analise → corrija → verifique.

## Argumento `--fix`

Se `$ARGUMENTS` contiver `--fix`, após o relatório **aplique automaticamente todas as correções classificadas como Crítica ou Alta** diretamente nos arquivos.

---

## Fase 1 — Mapeamento do projeto

Antes de auditar, leia os arquivos principais para entender o código real:

```bash
cat server.js
cat server_mongo.js 2>/dev/null || echo "server_mongo.js ausente"
cat package.json
cat .env 2>/dev/null || echo ".env não encontrado"
ls -la public/scripts/
```

---

## Fase 2 — Servidor Express (server.js)

### 2.1 Path Traversal na rota de dados JSON

O servidor salva e lê arquivos em `data/dashboard_*.json` usando `projectKey` vindo da URL.

```bash
grep -n "projectKey\|req\.params\|path\.join\|readFile\|writeFile\|existsSync" server.js
```

Verifique se existe validação do projectKey. Sem ela, um request como
`GET /api/dashboard/../../etc/passwd` pode vazar arquivos do sistema.

**Correção esperada:**
```javascript
const KEY_REGEX = /^[a-zA-Z0-9_-]{1,80}$/;
function validateKey(req, res, next) {
  if (!KEY_REGEX.test(req.params.projectKey)) {
    return res.status(400).json({ error: 'projectKey inválido' });
  }
  next();
}
```

### 2.2 CORS permissivo

```bash
grep -n "cors\|origin\|Access-Control" server.js server_mongo.js 2>/dev/null
```

Verifique se `cors()` é chamado sem opções de origem.

**Correção para produção:**
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'PUT', 'DELETE'],
}));
```

### 2.3 Limite de tamanho do body ausente (DoS)

```bash
grep -n "express\.json\|bodyParser\|limit" server.js
```

Sem limite, um payload de 100MB pode travar o processo Node.

**Correção:**
```javascript
app.use(express.json({ limit: '2mb' }));
```

### 2.4 Headers de segurança HTTP ausentes

```bash
grep -n "helmet\|X-Frame\|X-Content-Type\|Strict-Transport\|Content-Security" server.js
```

**Correção:**
```bash
npm install helmet
```
```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 2.5 Rate limiting ausente

```bash
grep -n "rateLimit\|express-rate-limit\|throttle" server.js
```

**Correção:**
```bash
npm install express-rate-limit
```
```javascript
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({ windowMs: 60_000, max: 100 }));
```

---

## Fase 3 — Frontend Vanilla JS (public/scripts/)

### 3.1 XSS via innerHTML com dados do estado

```bash
grep -rn "innerHTML\|outerHTML\|insertAdjacentHTML" public/scripts/
```

Para cada ocorrência verifique se a variável inserida vem de `window.state` (dados controlados pelo usuário, inclusive importados de arquivos externos).

**Padrão inseguro:**
```javascript
el.innerHTML = `<span>${feature.name}</span>`;
```

**Correção — sanitizador simples:**
```javascript
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str ?? '')));
  return div.innerHTML;
}
// Uso: el.innerHTML = `<span>${escapeHtml(feature.name)}</span>`;
```

### 3.2 XSS via importação de arquivos (.feature, .csv, .xlsx)

```bash
grep -n "FileReader\|readAsText\|xlsx\|csv\|\.feature" public/scripts/controller.js
```

Verifique se nomes de cenários e módulos importados são sanitizados antes de entrar no estado e serem renderizados.

### 3.3 Dados sensíveis no LocalStorage

```bash
grep -rn "localStorage\.setItem\|localStorage\[" public/scripts/
```

Verifique quais campos do `window.state` são persistidos e se algum contém credenciais ou tokens que não deveriam ficar no browser.

### 3.4 Validação de upload de imagens (mockup/evidências)

```bash
grep -n "mockup\|readAsDataURL\|accept\|file\.type\|file\.size" public/scripts/controller.js public/index.html
```

Verifique se o upload de imagens valida tipo MIME real e tamanho máximo.

**Correção:**
```javascript
function validateImageFile(file) {
  const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  if (!ALLOWED.includes(file.type)) throw new Error('Tipo não permitido');
  if (file.size > MAX_SIZE) throw new Error('Imagem muito grande (máx 2MB)');
}
```

---

## Fase 4 — Credenciais Supabase (server_mongo.js)

### 4.1 Chaves hardcoded ou versionadas

```bash
grep -n "supabase\|SUPABASE_URL\|SUPABASE_KEY\|anon\|service_role" server_mongo.js 2>/dev/null
cat .env 2>/dev/null
grep -n "process\.env" server_mongo.js 2>/dev/null
cat .gitignore | grep -i "env\|data"
```

Verifique se as chaves estão em `process.env` e se `.env` está no `.gitignore`.

**Correção se `.env` não estiver ignorado:**
```bash
echo ".env" >> .gitignore
echo "data/" >> .gitignore
git rm --cached .env 2>/dev/null || true
```

### 4.2 Chave `service_role` exposta no frontend

```bash
grep -rn "service_role\|SUPABASE" public/
```

A `service_role` tem acesso total ao banco ignorando RLS — nunca deve aparecer em arquivos dentro de `public/`.

---

## Fase 5 — Permissões e dados persistidos

```bash
ls -la data/ 2>/dev/null || echo "data/ ainda não criada"
find . -name "dashboard_*.json" -not -path "*/node_modules/*" 2>/dev/null | head -10
```

Verifique permissões dos arquivos JSON em ambiente multiusuário.

---

## Fase 6 — Dependências vulneráveis

```bash
npm audit --audit-level=moderate 2>/dev/null
```

---

## Relatório final

Ao terminar todas as fases, gere este relatório:

```
# Relatório de segurança — QA Dashboard
Data: [data atual]

## Resumo
- Total: X | Críticas: X | Altas: X | Médias: X | Baixas: X | Informativas: X

## Vulnerabilidades encontradas

### [SEVERIDADE] — [Nome]
- **Arquivo:** caminho/arquivo.js (linha X)
- **Descrição:** o que está errado e por que é perigoso
- **Evidência:** trecho real do código encontrado
- **Correção:** código exato para aplicar
- **Referência:** OWASP A0X:2021

## O que está correto
- [boas práticas já presentes no projeto]

## Próximos passos
1. [correção mais urgente]
2. [melhorias recomendadas]
```

---

## Tabela de severidade para este projeto

| Severidade | Exemplos específicos |
|------------|---------------------|
| Crítica | Path traversal em projectKey, service_role Supabase no frontend |
| Alta | XSS por innerHTML com dados importados, .env versionado com credenciais |
| Média | CORS sem restrição de origem, body sem limite de tamanho, headers HTTP ausentes |
| Baixa | Rate limiting ausente, imagens sem validação de MIME/tamanho |
| Informativa | LocalStorage com dados de sprint (aceitável por design local-first) |

---

## Regras do feedback loop

1. **Inspecione** — leia os arquivos reais antes de qualquer conclusão
2. **Execute** — rode os comandos bash de cada seção
3. **Analise** — relate apenas vulnerabilidades confirmadas no código
4. **Corrija** — forneça código exato baseado no que foi lido
5. **Verifique** — confirme que a correção resolve antes de incluir no relatório
6. Se `--fix` foi passado, aplique as correções Críticas e Altas nos arquivos após o relatório
