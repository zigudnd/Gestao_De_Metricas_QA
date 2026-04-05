# Como instalar — dba-expert

## Estrutura

```
.claude/skills/dba-expert/
├── SKILL.md
└── references/
    ├── rls-templates.md         ← 4 padrões de RLS prontos para copiar
    └── schema-doc-template.md   ← template completo de documentação + DER
```

## Instalação

```bash
mkdir -p .claude/skills/dba-expert/references
# Copiar SKILL.md e os dois arquivos de references/
```

## Como acionar

Automático:
- "revisa essa RLS policy"
- "cria a migration para X"
- "essa query está lenta"
- "documenta o schema"
- "o banco está crescendo"
- "faz auditoria de RLS"
- "/dba-expert"

## Modos disponíveis

| Modo | Quando usar |
|---|---|
| 1 — Auditoria RLS | Trimestral, nova tabela, bug de acesso |
| 2 — Migration SQL | Qualquer alteração de schema |
| 3 — Performance | Query lenta, JSONB pesado, timeout |
| 4 — Documentação | Nova tabela, onboarding, sprint de docs |
| 5 — Backup/Retenção | Definição de política, auditoria de compliance |

## Integração com os outros agentes

```
backend-expert  → escreve a rota que usa a tabela
dba-expert      → escreve a migration e as RLS policies
security-expert → audita segurança de acesso e validação de input
```

No CLAUDE.md do projeto:
```
Para qualquer nova tabela no banco:
1. dba-expert escreve a migration com RLS completa
2. security-expert valida as policies como atacante
3. backend-expert implementa os endpoints que usam a tabela
```
