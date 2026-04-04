# Como instalar — backend-expert

## Estrutura

```
.claude/skills/backend-expert/
├── SKILL.md
└── references/
    └── patterns.md     ← padrões de código, templates, exemplos
```

## Instalação

```bash
mkdir -p .claude/skills/backend-expert/references
# Copiar SKILL.md e references/patterns.md para as pastas
```

## Como acionar

Automático:
- "cria a rota de X"
- "faz a migration para Y"
- "implementa o endpoint de Z"
- "revisa esse controller"
- "como estruturar o backend para..."
- "/backend-expert"

## Modos disponíveis

| Modo | Quando usar |
|---|---|
| 1 — Implementação | Nova rota, novo módulo, novo endpoint |
| 2 — Migration SQL | Nova tabela, coluna, índice, trigger |
| 3 — RLS Policy | Segurança por usuário/squad no banco |
| 4 — RPC | Lógica atômica que precisa rodar no banco |
| 5 — Revisão de código | PR review, auditoria de rota existente |
| 6 — Arquitetura | Refatoração, crescimento do server.js, planejamento |

## Integração com outros agentes do projeto

```
backend-expert       → implementa a rota
security-expert      → revisa a segurança do endpoint
frontend-qa-reviewer → revisa o componente que consome a rota
```

No CLAUDE.md do projeto:
```
Para qualquer nova rota de API:
1. backend-expert implementa
2. security-expert revisa autenticação, autorização e validação de input
Marcar como concluído apenas após aprovação dos dois agentes.
```
