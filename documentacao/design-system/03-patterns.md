# 03 — Patterns & Layout

> ToStatos Design System | Autor: Jordan Vega, UX Senior Designer
> Referencia de padroes estruturais, navegacao, formularios, listas, modais,
> feedback e visualizacao de dados usados no ToStatos.

---

## 1. App Shell

A estrutura raiz da aplicacao. Todo conteudo protegido renderiza dentro do `AppShell`.

```
+--------+--------------------------------------------------+
|        |                   Topbar (52px)                   |
|  Side  |--------------------------------------------------|
|  bar   |                                                    |
|  (56/  |                  Content Area                      |
|  200)  |               padding: 20px 22px                   |
|        |                                                    |
|        |             overflowY: auto (scroll)               |
|        |                                                    |
+--------+--------------------------------------------------+
```

**Arquivo:** `src/app/layout/AppShell.tsx`

### Sidebar

| Propriedade       | Valor                           |
|-------------------|---------------------------------|
| Largura colapsada | `56px` (`COLLAPSED_W`)          |
| Largura expandida | `200px` (`EXPANDED_W`)          |
| Estado padrao     | Colapsada (`expanded = false`)  |
| Background        | `var(--color-surface)`          |
| Borda direita     | `1px solid var(--color-border)` |
| Transicao         | `width 0.2s ease`               |
| Padding           | `12px 0`                        |

**Arquivo:** `src/app/layout/Sidebar.tsx`

```
Colapsada (56px)           Expandida (200px)
+------+                   +------------------+
| [TS] |                   | [TS] ToStatos    |
|------|                   |------------------|
| icon |                   | icon  Inicio     |
| icon |                   | icon  Status Rpt |
| icon |                   | icon  Cobertura  |
| icon |                   | icon  Releases   |
|      |                   |                  |
|      |  <- spacer ->     |                  |
|------|                   |------------------|
| icon |                   | icon  Cadastros  |
| icon |                   | icon  Docs       |
|------|                   |------------------|
|  [>] |                   |            [<]   |
| (av) |                   | (av) Nome   [x]  |
+------+                   +------------------+
```

### Topbar

| Propriedade | Valor                               |
|-------------|-------------------------------------|
| Altura      | `52px`                              |
| Background  | `var(--color-surface)`              |
| Borda       | `borderBottom: 1px solid var(--color-border)` |
| Padding     | `0 24px`                            |
| Layout      | `display: flex; align-items: center; justify-content: space-between` |

**Arquivo:** `src/app/layout/Topbar.tsx`

```
+------------------------------------------------------------+
| Breadcrumb (esq)            (spacer)    [Squad] [Avatar v] |
+------------------------------------------------------------+
```

Quando a rota e `/sprints/:id` (dashboard de sprint), acoes contextuais
aparecem a direita: Voltar, Exportar, Import/Export JSON, Termo, Concluir.

### Content Area

| Propriedade | Valor              |
|-------------|---------------------|
| Padding     | `20px 22px`         |
| Overflow    | `overflowY: auto`   |
| Flex        | `flex: 1`           |

`maxWidth` varia por modulo (definido na propria pagina):

| Modulo         | maxWidth    |
|----------------|-------------|
| SprintDashboard | `1200px`   |
| ReleaseDashboard | `1200px`  |
| StatusReportPage | `1200px`  |

---

## 2. Page Layout

### 2.1 Standard Page (header + content)

Usado em paginas de detalhe como `ReleaseDashboard`.

```
+------------------------------------------------------------+
| <- Releases (back link)                                     |
| [H1 Titulo]  [badge versao]  [badge status]                |
+------------------------------------------------------------+
|                                                              |
|   (conteudo principal — formularios, cards, etc.)            |
|                                                              |
+------------------------------------------------------------+
```

**Estrutura:**
- Link de voltar: `fontSize: 13`, `fontWeight: 600`, sem borda
- Titulo: `fontSize: 20`, `fontWeight: 700`
- Badges: `fontSize: 10-11`, `borderRadius: 4-5`, background com 18% de opacidade

### 2.2 Dashboard Page (header + tabs + tab content)

Usado em `SprintDashboard` e `StatusReportPage`.

```
+------------------------------------------------------------+
| [Titulo inline editavel]          [sync indicator] [Period] |
+------------------------------------------------------------+
| [Dashboard KPIs - ReportDashboard]                          |
+------------------------------------------------------------+
| [Tab1] [Tab2] [Tab3] ...            (action buttons)        |
|------------------------------------------------------------|
|                                                              |
|   (conteudo da aba ativa)                                    |
|                                                              |
+------------------------------------------------------------+
```

**Tab bar specs:**

| Propriedade       | Valor                                      |
|-------------------|--------------------------------------------|
| Layout            | `display: flex; gap: 2`                    |
| Borda inferior    | `1px solid var(--color-border)`            |
| Tab padding       | `8px 14px`                                 |
| Tab font          | `fontSize: 13`                             |
| Tab ativa         | `borderBottom: 2px solid var(--color-blue)`, `color: var(--color-blue-text)`, `fontWeight: 700` |
| Tab inativa       | `borderBottom: 2px solid transparent`, `color: var(--color-text-2)`, `fontWeight: 500` |
| marginBottom da tab | `-1px` (sobreposicao na borda)           |

### 2.3 List Page (header + filters + list/cards)

Usado em `HomePage` (sprints) e `StatusReportHomePage`.

```
+------------------------------------------------------------+
| [H1 Titulo]                        [+ Criar novo] [Acoes]  |
+------------------------------------------------------------+
| [Filtro squad] [Filtro status] [Filtro ano] [Busca...]      |
+------------------------------------------------------------+
|                                                              |
|  [Card 1 .............................................]      |
|  [Card 2 .............................................]      |
|  [Card 3 .............................................]      |
|                                                              |
+------------------------------------------------------------+
```

**Filtros:** renderizados como `<select>` estilizados ou pills (botoes toggle).

---

## 3. Navigation

### 3.1 Sidebar Nav Items

Componente `NavItem` — botao com icone SVG + label textual.

| Propriedade   | Normal                           | Ativo                             |
|---------------|----------------------------------|-----------------------------------|
| Background    | `transparent`                    | `var(--color-blue-light)`         |
| Color         | `var(--color-text-2)`            | `var(--color-blue-text)`          |
| Font weight   | `500`                            | `600`                             |
| Border radius | `9px`                            | `9px`                             |
| Altura        | `38px`                           | `38px`                            |
| Largura (col) | `40px`                           | `40px`                            |
| Largura (exp) | `calc(100% - 16px)`             | `calc(100% - 16px)`              |
| Gap (icon-label) | `10px`                        | `10px`                            |
| Icone         | SVG 20x20, stroke currentColor   | SVG 20x20, stroke currentColor    |
| Disabled      | `opacity: 0.4`, `cursor: not-allowed` | —                            |
| Transicao     | `background 0.15s, color 0.15s, width 0.2s` | —                       |

Itens fixos da sidebar (de cima para baixo):
1. Inicio (`/`)
2. Status Report (`/status-report`)
3. Cobertura QA (`/sprints`)
4. Releases (`/releases`)
5. _(separador)_
6. Cadastros (`/squads`)
7. Documentacao (`/docs`)

### 3.2 Topbar Breadcrumb

Formato: `Crumb / Crumb / Crumb`

```
Inicio / Cobertura QA / Nome da Sprint
```

| Propriedade     | Valor                                |
|-----------------|--------------------------------------|
| Separador       | `/` com `opacity: 0.35`             |
| Font size       | `13px`                               |
| Cor do crumb    | `var(--color-text-2)`               |
| Ultimo crumb    | `var(--color-text)` (mais escuro)   |
| Font weight     | `500`                                |
| Crumbs clicaveis | `cursor: pointer`, hover muda cor para `var(--color-text)` |

Logica de montagem (`getBreadcrumb`):

| Rota                    | Breadcrumb                               |
|-------------------------|------------------------------------------|
| `/`                     | Inicio                                   |
| `/sprints`              | Inicio / Cobertura QA                    |
| `/sprints/:id`          | Inicio / Cobertura QA / {titulo}         |
| `/status-report`        | Inicio / Status Report                   |
| `/releases`             | Inicio / Releases                        |
| `/squads`               | Inicio / Cadastros                       |
| `/docs`                 | Inicio / Documentacao                    |
| `/profile`              | Inicio / Perfil                          |

### 3.3 Squad Selector

O `SquadSelector` aparece na Sidebar. Comportamento por estado:

**Colapsado:** dot colorido com inicial do squad, `width: 28px`, `height: 28px`, `borderRadius: 7`.

**Expandido:** select estilizado com dot colorido + nome + chevron.

**Visibilidade por papel:**
- `admin` e `gerente` veem opcao "Todos os squads"
- Demais usuarios veem apenas seus squads

O `UserMenu` na Topbar tambem mostra o squad ativo como label ao lado do avatar.

---

## 4. Form Patterns

**Referencia:** `src/modules/releases/pages/ReleaseDashboard.tsx`

### 4.1 Label

```ts
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-2)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}
```

Label sempre **acima** do input. Campos obrigatorios usam asterisco no texto da label.

### 4.2 Input

```ts
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 7,
  border: '1px solid var(--color-border-md)',
  fontSize: 13,
  fontFamily: 'var(--font-family-sans)',
  color: 'var(--color-text)',
  background: 'var(--color-surface)',
}
```

### 4.3 Grid Layout

Campos relacionados lado a lado em grid de 2 colunas:

```ts
{
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 14,
}
```

### 4.4 Estado Desabilitado

```ts
{
  disabled: true,
  opacity: 0.6,
}
```

### 4.5 Textarea

Usa `inputStyle` como base, acrescenta `resize: 'vertical'`.

### 4.6 Toggle Buttons (Plataformas)

Botoes que funcionam como checkbox multi-selecao:

| Estado   | Border                                | Background                     | Color                        |
|----------|---------------------------------------|--------------------------------|------------------------------|
| Inativo  | `1px solid var(--color-border-md)`    | `transparent`                  | `var(--color-text-2)`        |
| Ativo    | `2px solid var(--color-blue)`         | `var(--color-blue-light)`      | `var(--color-blue-text)`     |

Specs: `padding: 6px 16px`, `borderRadius: 7`, `fontSize: 13`, `fontWeight: 600`.

---

## 5. List Patterns

### 5.1 Card List

Cards empilhados verticalmente:

```
+------------------------------------------------------------+
| [Card - borda, radius 10-12, padding 12-16]                |
+------------------------------------------------------------+
                        gap: 8-10px
+------------------------------------------------------------+
| [Card]                                                      |
+------------------------------------------------------------+
```

| Propriedade   | Valor                                       |
|---------------|---------------------------------------------|
| Layout        | `display: flex; flexDirection: column`       |
| Gap           | `8px` a `10px`                              |
| Card bg       | `var(--color-surface)`                      |
| Card border   | `1px solid var(--color-border)`             |
| Card radius   | `10px` a `12px`                             |
| Card padding  | `12px 14px` a `16px 18px`                   |

### 5.2 Section Cards (Status Report)

Agrupamento com cabecalho colapsavel (acordeao):

```
+------------------------------------------------------------+
| [v] Secao Nome  (badge count)                  [+ Add]     |
|------------------------------------------------------------|
| [Item Row 1]                                                |
| [Item Row 2]                                                |
| [Item Row 3]                                                |
+------------------------------------------------------------+
```

### 5.3 Filters Above List

```
+------------------------------------------------------------+
| [Select Squad] [Select Status] [Select Ano] [Busca...    ] |
+------------------------------------------------------------+
```

- Selects: `fontSize: 13`, `borderRadius: 7`, `border: 1px solid var(--color-border-md)`
- Search: mesmo estilo de input padrao
- Disposicao: `display: flex; gap: 8; flexWrap: wrap`

---

## 6. Modal Patterns

### 6.1 Overlay

```ts
{
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
```

Clique no overlay fecha o modal (`onClick` no container externo).

### 6.2 Content Box

```ts
{
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderTop: '3px solid <accent-color>',   // azul, vermelho, verde, etc.
  borderRadius: 12,
  padding: '24px 22px',
  width: <340-420>px,
  maxWidth: '90vw',
  boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
}
```

**Accent colors do borderTop por tipo:**

| Tipo do modal       | Cor do borderTop             |
|----------------------|------------------------------|
| Padrao / Informativo | `var(--color-blue)`          |
| Destrutivo / Excluir | `var(--color-red)`           |
| Alerta / Confirmar   | `var(--color-amber-mid)`     |
| Sucesso              | `var(--color-green)`         |

```
+------------------------------------------------------------+
|=================== borderTop 3px azul ====================|
|                                                              |
|   Titulo do Modal                                    [x]    |
|                                                              |
|   Conteudo descritivo do modal com informacoes              |
|   relevantes para o usuario.                                |
|                                                              |
|                               [Cancelar]  [Confirmar]       |
|                                                              |
+------------------------------------------------------------+
```

### 6.3 Modal Actions

```ts
{
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
}
```

| Botao       | Background                | Color                  | Border                              |
|-------------|---------------------------|------------------------|-------------------------------------|
| Cancelar    | `transparent`             | `var(--color-text-2)`  | `1px solid var(--color-border-md)`  |
| Confirmar   | `var(--color-blue)`       | `#fff`                 | `none`                              |
| Excluir     | `var(--color-red)`        | `#fff`                 | `none`                              |

Botoes: `padding: 7-8px 16-18px`, `borderRadius: 7-8`, `fontSize: 13`, `fontWeight: 600`.

### 6.4 ConfirmModal (componente reutilizavel)

**Arquivo:** `src/app/components/ConfirmModal.tsx`

Props: `title`, `description`, `confirmLabel` (default "Excluir"), `onConfirm`, `onCancel`.
Sempre usa `borderTop: 3px solid var(--color-red)` e icone de lixeira no titulo.

---

## 7. Feedback Patterns

### 7.1 Toast Notifications

**Arquivo:** `src/app/components/Toast.tsx`

Toasts globais, disparados via `showToast()` de qualquer lugar (sem contexto React).

```ts
showToast('Mensagem', 'success')
showToast('Erro ao salvar', 'error')
showToast('Item excluido', 'info', {
  duration: 5000,
  action: { label: 'Desfazer', onClick: () => { ... } },
})
```

**Posicao:** `fixed`, `bottom: 20`, centro horizontal (`left: 50%, translateX(-50%)`), `zIndex: 5000`.

| Tipo    | Background                     | Color                    | Border                        |
|---------|--------------------------------|--------------------------|-------------------------------|
| success | `var(--color-green-light)`     | `var(--color-green)`     | `var(--color-green-mid)`      |
| error   | `var(--color-red-light)`       | `var(--color-red)`       | `var(--color-red-mid)`        |
| info    | `var(--color-blue-light)`      | `var(--color-blue)`      | `var(--color-blue)`           |

Specs: `padding: 10px 16px`, `borderRadius: 10`, `fontSize: 13`, `fontWeight: 600`, `minWidth: 240`.

Duracao padrao: `3000ms`. Aceita botao de acao opcional (ex: "Desfazer").

```
+---------------------------------------------+
| Mensagem de feedback            [Desfazer]  |
+---------------------------------------------+
```

### 7.2 Loading State

Padrao centralizado, usado em todas as paginas:

```ts
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 200,
}}>
  <span style={{ color: 'var(--color-text-2)', fontSize: 14 }}>
    Carregando...
  </span>
</div>
```

Tambem usado como fallback de `<Suspense>` para rotas lazy-loaded (via `LazyFallback`
em `routes.tsx`).

### 7.3 Confirm Patterns

Duas abordagens coexistem:

**a) Inline confirmation (modal local na pagina):**
Renderizado condicionalmente na propria pagina. Usado em `Topbar.tsx` para
"Concluir Sprint" e "Logout".

**b) ConfirmModal reutilizavel:**
Componente generico (`src/app/components/ConfirmModal.tsx`). Usado para acoes
destrutivas como exclusao de itens. Overlay `rgba(0,0,0,0.45)`, borderTop vermelho.

### 7.4 Empty State

Padrao: emoji grande + texto descritivo + call-to-action.

```
           (centro da area de conteudo)

                    [emoji 36px]
           Titulo descritivo (fontWeight 600)
        Texto auxiliar com instrucao de proxima acao
```

Exemplo real (StatusReportPage, editor vazio):

```ts
<div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-3)', fontSize: 14 }}>
  <div style={{ fontSize: 36, marginBottom: 10 }}>clipboard emoji</div>
  <p style={{ fontWeight: 600, color: 'var(--color-text-2)' }}>Nenhum item adicionado</p>
  <p style={{ fontSize: 13 }}>Clique em <strong>+ Adicionar item</strong> ... para comecar.</p>
</div>
```

Exemplo (release nao encontrada): texto + botao "Voltar para Releases" azul.

### 7.5 Sync Indicator

Indicador de salvamento em tempo real (StatusReportPage):

```
[verde dot] Salvo 14:32       (quando sincronizado)
[amber dot] Salvando...       (durante sync)
```

`fontSize: 11`, dot `fontSize: 10`, `fontWeight: 500`.

---

## 8. Data Visualization

### 8.1 KPI Cards

**Arquivo:** `src/modules/status-report/components/ReportDashboard.tsx`

```
+--borderTop 3px accent-----------+
| LABEL (11px, text-3, 600)       |
| VALOR (22px, 800, accent color) |
| sub text (11px, text-2)         |
+---------------------------------+
```

```ts
{
  flex: '1 1 0',
  minWidth: 120,
  padding: '12px 14px',
  borderRadius: 10,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderTop: '3px solid <accent>',    // cor varia por metrica
}
```

Layout dos KPIs: `display: flex; gap: 10-12; flexWrap: wrap`.

### 8.2 Progress Bars

**Inline mini progress (ReleaseSuiteCard):**

```
[counter]  [========----]  [%]
```

| Propriedade    | Valor                           |
|----------------|---------------------------------|
| Track width    | `60px`                          |
| Track height   | `4px`                           |
| Track radius   | `2px`                           |
| Track bg       | `var(--color-surface-2)`        |
| Fill radius    | `2px`                           |
| Fill transition | `width 0.3s`                   |
| Counter font   | `fontSize: 10`, mono, text-3    |
| Percent font   | `fontSize: 10`, mono, bold      |

**Cor da barra por percentual:**

```ts
function pctColor(pct: number): string {
  if (pct >= 80) return 'var(--color-green)'      // verde
  if (pct >= 50) return 'var(--color-amber-mid)'   // amarelo
  return 'var(--color-red)'                        // vermelho
}
```

**Progress Ring (SVG circular):**

Usado no `ReportDashboard`. SVG de `48px`, stroke `5px`, rotacao `-90deg`.
Mesma logica de cor por percentual.

### 8.3 Charts (Chart.js)

**Arquivo:** `src/modules/sprints/components/dashboard/OverviewTab.tsx`

Bibliotecas registradas:
- `chart.js` (CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend)
- `chartjs-plugin-datalabels` (ChartDataLabels)
- `react-chartjs-2` (Bar, Doughnut, Line, Pie)

**Paleta padrao:**

```ts
const BASE_COLORS = [
  '#3b82f6',  // azul
  '#10b981',  // verde
  '#f59e0b',  // amarelo
  '#ef4444',  // vermelho
  '#8b5cf6',  // roxo
  '#ec4899',  // rosa
  '#06b6d4',  // ciano
  '#f97316',  // laranja
]
```

**Paleta Donut:**

```ts
const DONUT_PALETTE = [
  '#E24B4A',  '#378ADD',  '#639922',  '#EAB308',  '#888780',
  '#B4B2A9',  '#8b5cf6',  '#06b6d4',  '#f97316',  '#ec4899',
]
```

**Legend config padrao:**

```ts
{
  boxWidth: 8,
  boxHeight: 8,
  borderRadius: 4,
  useBorderRadius: true,
  font: { size: 11 },
  color: '#888780',
  padding: 12,
}
```

**Mapas de cor por categoria:**

Blockers e stacks possuem mapas de cor fixos para consistencia visual
(ex: "Erro no login" sempre vermelho, "iOS" sempre escuro).

---

## 9. Routing Structure

**Arquivo:** `src/app/routes.tsx`

Roteamento via `createHashRouter` (React Router DOM v7).

```
/login                -> AuthPage (publica)
/change-password      -> ChangePasswordPage (protegida, fora do AppShell)

/ (AppShell)
  /                   -> DashboardHome
  /sprints            -> HomePage (lista)
  /sprints/compare    -> ComparePage (lazy)
  /sprints/:sprintId  -> SprintDashboard
  /squads             -> SquadsPage (lazy)
  /status-report      -> StatusReportHomePage
  /status-report/:id  -> StatusReportPage (lazy)
  /releases           -> ReleasesPage
  /releases/:id       -> ReleaseDashboard (lazy)
  /profile            -> ProfilePage
  /docs               -> DocsPage (lazy)
```

Rotas marcadas como **(lazy)** usam `React.lazy()` + `<Suspense>` com
`LazyFallback` ("Carregando...") para code splitting.

---

## 10. Button Hierarchy (Topbar)

A Topbar define uma hierarquia clara de botoes para acoes contextuais:

| Variante         | Background                   | Border                          | Color                  | Uso                        |
|------------------|------------------------------|---------------------------------|------------------------|----------------------------|
| `BtnFilledPrimary` | `var(--color-blue)`        | `none`                          | `#fff`                 | Acao principal (Concluir)  |
| `BtnSecondary`   | `var(--color-bg)`            | `0.5px solid var(--color-border)` | `var(--color-text)`  | Acao secundaria (Exportar) |
| `BtnOutlineSubtle` | `transparent`              | `0.5px solid var(--color-border)` | `var(--color-text-2)` | Acao terciaria             |
| `BtnGhost`       | `transparent`                | `none`                          | `var(--color-text-2)`  | Navegacao (Voltar)         |
| `BtnGroupItem`   | `var(--color-bg)`            | radius left/right separados     | `var(--color-text)`    | Grupo (Import/Export)      |

Specs base de todos: `padding: 6px 14px`, `borderRadius: 8`, `fontSize: 13`, `fontWeight: 500`,
`transition: background 0.12s`.

---

## 11. User Menu (Topbar Dropdown)

Dropdown ativado pelo avatar no canto superior direito.

```
+----------------------------+
| [Avatar 42px] Nome         |
|              email         |
|              [Badge Role]  |
|----------------------------|
| Squad ativo                |
| [Select squad ........v]   |
|----------------------------|
| [icon] Meu perfil          |
| [icon] Alterar senha       |
|----------------------------|
| [icon] Sair (vermelho)     |
+----------------------------+
```

| Propriedade    | Valor                           |
|----------------|---------------------------------|
| Width          | `280px`                         |
| Position       | `absolute, top: 42, right: 0`  |
| Background     | `var(--color-surface)`          |
| Border radius  | `12px`                          |
| Box shadow     | `0 8px 32px rgba(0,0,0,0.15)` |
| zIndex         | `2000`                          |
| Animacao       | `fadeUp 0.15s ease both`        |
| Fechar com Esc | Sim                             |
| Fechar clicando fora | Sim (mousedown listener) |

Role badges:
- Admin: bg `var(--color-red-light)`, color `var(--color-red)`
- Gerente: bg `var(--color-amber-light)`, color `var(--color-amber)`

---

## Resumo dos z-index

| Camada               | zIndex |
|----------------------|--------|
| Overlay de modal     | `1000` |
| User dropdown        | `2000` |
| Logout modal         | `3000` |
| Toast container      | `5000` |
