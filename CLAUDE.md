# CLAUDE.md — Gestão de Métricas QA (ToStatos)

## Stack
- Frontend: HTML/CSS/JS puro
- Backend: Node.js/Express (`server.js`)
- Arquivos principais: `public/index.html`, `public/scripts/model.js`, `public/scripts/view.js`, `public/scripts/controller.js`
- Servidor local: `http://localhost:3000`

---

## Ciclo Obrigatório de Qualidade

Após escrever ou modificar qualquer código, **nunca** considere a tarefa concluída sem passar por estas etapas:

### 1. ESCREVA
Implemente o código necessário para a tarefa.

### 2. TESTE
Execute o código de forma real:
- Verifique sintaxe: `node --check public/scripts/<arquivo>.js`
- Verifique se o servidor responde: `curl -s http://localhost:3000/api/health`
- Se o servidor não estiver rodando, inicie: `node server.js &`
- Para mudanças de UI: abra `http://localhost:3000` no browser e navegue pelo fluxo afetado

### 3. VEJA o resultado real
- Leia a saída do terminal — não assuma que funcionou
- Para erros de JS no browser, observe o console do DevTools
- Para API, leia o JSON retornado

### 4. DETECTE problemas
- Compare o resultado real com o esperado
- Liste qualquer erro, aviso ou comportamento incorreto
- Se houver `SyntaxError`, `ReferenceError` ou `TypeError` no terminal, trate antes de prosseguir

### 5. CORRIJA e REPITA
- Se houver qualquer problema, corrija e volte ao passo 2
- Repita até o resultado estar correto e sem erros

> A tarefa só está finalizada quando o teste real confirmar funcionamento.

---

## Comando /regressivo
Para executar um ciclo completo de regressão de QA use `/regressivo`.
O agente analisa mudanças recentes, mapeia impacto, executa checklists, documenta e corrige bugs até todos os testes passarem.
