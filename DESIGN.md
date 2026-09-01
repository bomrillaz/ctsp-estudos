---
name: Prontidão CTSP
description: Plataforma de estudo para o CTSP 2026 (CBMRS) — identidade "Manual Operacional"
colors:
  red: "#D32412"
  red-dark: "#A51D0E"
  red-mid: "#BB2010"
  red-light: "#FBEDE6"
  ember: "#F0883C"
  ember-deep: "#C77B1D"
  ember-text: "#8F4A0E"
  navy: "#101B3D"
  navy-2: "#1B2A55"
  navy-deep: "#0B1430"
  paper: "#F7F3EC"
  paper-2: "#EFE9DD"
  surface: "#FFFFFF"
  text: "#1C2233"
  text-secondary: "#5A6072"
  text-tertiary: "#64697A"
  border: "#E6DFD2"
  border-soft: "#EDE7DB"
  green: "#16713C"
  green-light: "#E9F4EC"
  amber: "#8A5410"
  amber-light: "#FAF1E3"
  blue: "#1F5C8B"
  blue-light: "#E9F1F7"
typography:
  display:
    fontFamily: "'Barlow Condensed', -apple-system, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(38px, 10.5vw, 68px)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "0.01em"
  headline:
    fontFamily: "'Barlow Condensed', -apple-system, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(26px, 6.4vw, 40px)"
    fontWeight: 700
    lineHeight: 1.08
  title:
    fontFamily: "'Barlow Condensed', -apple-system, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 700
  body:
    fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
  label:
    fontFamily: "'Barlow Condensed', -apple-system, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.14em"
rounded:
  xs: "9px"
  sm: "12px"
  md: "16px"
  lg: "18px"
  pill: "20px"
spacing:
  sm: "8px"
  md: "14px"
  lg: "18px"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "14px 24px"
  button-neutral:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "14px 24px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "18px 17px"
---

# Design System: Prontidão CTSP

## Overview

**Creative North Star: "O Manual de Campo Operacional"**

O nome já vive no próprio código-fonte (comentário "Identidade Manual Operacional",
`index.html:44-69`) — o sistema visual se comporta como um manual de campo militar: vermelho de
alerta operacional para a única ação que importa na tela, navy institucional pra estrutura e
autoridade, papel/creme pra leitura prolongada sem fadiga. Cada tela é lida como uma ficha
procedural, não navegada como um feed.

O tom é **disciplinado e institucional**. A estética evita ativamente o vocabulário de app de
consumo/entretenimento — gradiente vibrante decorativo, card-bolha exageradamente arredondado,
mascote em primeiro plano dentro da UI funcional (o mascote César fica reservado a onboarding e
splash, nunca compete com o conteúdo de estudo). Componentes são **sóbrios e funcionais**: sem
decoração, hierarquia clara, sem ruído visual competindo com o conteúdo de estudo.

**Key Characteristics:**
- Vermelho de ação reservado a UMA decisão por tela — nunca decorativo.
- Navy institucional carrega estrutura (headers, número de passo, texto de autoridade), não cor de
  destaque.
- Papel/creme como base de leitura — nunca branco puro no tema claro, para reduzir fadiga em
  sessões longas de estudo no celular.
- Tema escuro recalibra o vermelho (`#D32412`→`#F05B43`) em vez de aplicar opacidade — cada cor é
  medida no par real que renderiza, não no token isolado.

## Colors

Paleta de baixa saturação com um único acento de ação (vermelho) e um segundo acento mais quente
(ember) reservado a contextos de landing/CTA — os dois nunca competem na mesma tela.

### Primary
- **Vermelho de Alerta Operacional** (`#D32412` claro / `#F05B43` escuro): a única ação primária de
  cada tela — botão principal, CTA de decisão. Nunca mais de uma instância de peso visual igual na
  mesma tela (**The One Red Rule** — ver Componentes).
- **Ember de Ação** (`#F0883C` / `#F0883C` escuro — estável entre temas): CTA de landing/conversão
  (`.lp-btn-cta`) e labels de destaque (`ember-text` como variante segura pra texto sobre fundo
  claro, `#8F4A0E`).

### Secondary
- **Navy Institucional** (`#101B3D` / mantém-se escuro em ambos os temas): estrutura, cabeçalhos,
  numeração de passo, botão de linha (`.lp-btn-linha`) — comunica autoridade sem competir com o
  vermelho de ação.

### Neutral
- **Papel Cru** (`#F7F3EC` claro / `#0D1322` escuro): fundo base — nunca branco puro no tema claro.
- **Surface** (`#FFFFFF` / `#141C33`): cards e superfícies elevadas sobre o papel.
- **Texto** (`#1C2233` / `#EAECF4`), **Texto secundário** (`#5A6072` / `#A7AEC5`), **Texto terciário**
  (`#64697A` / `#7E87A8`).
- **Borda** (`#E6DFD2` / `#283354`) e **borda suave** (`#EDE7DB` / `#222C49`).

### Semantic (feedback)
- **Verde de confirmação** (`#16713C`, fundo `#E9F4EC`): sucesso, aprovado.
- **Âmbar de atenção** (`#8A5410`, fundo `#FAF1E3`): pendência, aviso.
- **Azul informativo** (`#1F5C8B`, fundo `#E9F1F7`): informação neutra.

### Named Rules
**The One Red Rule.** O vermelho primário aparece em no máximo UMA ação por tela. Ações
secundárias no mesmo contexto usam `.btn-neutral` (fundo neutro, texto secundário, sem sombra) —
nunca uma segunda cor de peso visual equivalente. Token criado depois de um caso real de
`.btn-weak`/`.btn-primary` indistinguíveis (histórico do projeto).

**The Recalibrated Dark Rule.** Cores não migram de tema por opacidade. Cada cor semântica (mais
notavelmente o vermelho) tem um par claro/escuro calibrado separadamente pra manter contraste AA
no fundo real em que renderiza.

### Content-specific (fora do sistema de marca)
`--at1`..`--at5` são cores por área temática de conteúdo (5 áreas do edital do concurso) — servem
só pra categorizar conteúdo dentro do CTSP, não fazem parte do vocabulário de marca e não migram
para outros produtos Bomrillaz.

## Typography

**Display Font:** `'Barlow Condensed'` (com fallback `-apple-system, 'Helvetica Neue', Arial,
sans-serif`)
**Body Font:** `-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif`

**Character:** Barlow Condensed é a voz de comando — condensada, peso 600-700, quase sempre em
caixa alta com letter-spacing positivo em labels pequenos (`.14em`-`.22em`), como carimbo/rótulo
de campo. O corpo usa a fonte de sistema, discreta, priorizando legibilidade em sessão longa no
celular.

### Hierarchy
- **Display** (700, `clamp(38px,10.5vw,68px)`, line-height 0.98): hero de landing, sempre em
  caixa alta.
- **Headline** (700, `clamp(26px,6.4vw,40px)`, line-height 1.08): título de seção.
- **Title** (700, 19px): título de card/bloco.
- **Body** (400, ~15px): texto corrido.
- **Label** (600, 11-13px, letter-spacing `.14em`-`.22em`, caixa alta): rótulo de campo, eyebrow,
  botão, tag de categoria — a assinatura tipográfica mais reconhecível do sistema.

### Named Rules
**The Field-Label Rule.** Qualquer rótulo curto (label de campo, eyebrow, tag, texto de botão) usa
Barlow Condensed em caixa alta com letter-spacing positivo — nunca a fonte de corpo. É o que dá o
tom "manual operacional" mesmo em componentes pequenos.

## Layout

Mobile-first, leitura em coluna única até 768px; acima disso, telas de estudo (Cards/Resumos)
viram mestre-detalhe (`display:contents` no grid, com `row-gap:0` obrigatório — regra de
implementação, não de design). Ritmo de espaçamento em passos de ~8/14/18px. Header fixo compacto
(`--header-h:60px`), navegação inferior fixa (`--nav-h:84px`) — layout pensado pra uso em pé/no
plantão, não só sentado numa mesa.

## Elevation & Depth

Sombra **ambiente, nunca estrutural** — três níveis (`shadow`/`shadow-md`/`shadow-lg`) sempre
difusos e de baixa opacidade, nunca usados para simular espessura ou skeuomorfismo. No tema claro a
sombra é tingida de navy (`rgba(16,27,61,...)`); no tema escuro vira preto puro
(`rgba(0,0,0,...)`), porque sombra colorida sobre fundo já escuro desaparece.

### Shadow Vocabulary
- **Ambient low** (`0 1px 2px rgba(16,27,61,.05), 0 4px 14px rgba(16,27,61,.06)`): estado de
  repouso de card.
- **Ambient mid** (`0 2px 4px rgba(16,27,61,.06), 0 10px 28px rgba(16,27,61,.10)`): hover/elevação
  intermediária.
- **Ambient high** (`0 8px 32px rgba(16,27,61,.18)`): overlay/modal.

### Named Rules
**The Flat-at-Rest Rule.** Superfícies são planas em repouso; sombra aparece só como resposta a
hover/elevação, nunca como decoração fixa em card estático.

## Shapes

Três degraus de raio, do menor pro maior conforme o elemento cresce em importância/área: badges e
elementos pequenos (`9px`) → botões e inputs (`12px`, alguns CTAs de landing chegam a `14px`) →
cards e modais (`16px`-`18px`). Nunca canto vivo (0px) nem pill total em componente de conteúdo —
pill (`20px`+) fica reservado a badge/tag/chip.

## Components

### Buttons
- **Shape:** raio pequeno (`12px`, CTA de landing chega a `14px`).
- **Primary:** fundo vermelho sólido, texto branco, peso 700, padding `14px 24px`, sombra tingida
  da própria cor (`rgba(red,.28)`) — a única ação de peso forte na tela.
- **Neutral/Weak:** fundo neutro (`--bg`/`--paper-2`), texto secundário, sem sombra — todas as
  ações que não competem com a primária.
- **Hover/Focus:** anel de foco colorido (ember ou navy conforme contexto), 2-3px, offset negativo
  (`-2px`/`-3px`) — nunca outline padrão do navegador.

### Badges/Tags
- **Style:** pill pequeno (raio `10px`), par fundo-claro/texto-escuro por semântica (`badge-ok`
  verde, `badge-pend` vermelho, `badge-rev`/`badge-admin` âmbar, `badge-dom` neutro) — mesmo
  vocabulário semântico das cores de feedback.

### Cards
- **Corner Style:** `16px`.
- **Background:** `--surface` sobre `--paper`/`--paper-2`.
- **Border:** 1px `--line-soft`.
- **Shadow Strategy:** ambient low em repouso, ambient mid em hover, com leve `transform` de
  elevação — ver Elevation & Depth.

### Inputs / Fields
- **Style:** borda simples, fundo surface.
- **Focus:** borda muda pra cor de contexto (navy no formulário padrão, ember em telas com acento
  ember) + anel suave (`box-shadow` de baixa opacidade na mesma cor) — nunca só a borda muda
  sozinha.

## Do's and Don'ts

### Do:
- **Do** manter só uma ação vermelha de peso forte por tela — todo o resto usa `.btn-neutral`.
- **Do** usar Barlow Condensed em caixa alta com letter-spacing positivo pra qualquer rótulo curto
  (label, eyebrow, texto de botão).
- **Do** manter sombra ambiente e difusa — nunca sombra dura ou skeuomórfica.
- **Do** recalibrar cor por tema (nunca só opacidade) quando estender a paleta.

### Don't:
- **Don't** introduzir gradiente vibrante decorativo ou card-bolha excessivamente arredondado —
  contradiz o tom institucional confirmado.
- **Don't** colocar o mascote César em primeiro plano dentro de UI funcional (fica reservado a
  onboarding/splash).
- **Don't** usar branco puro como fundo base no tema claro — a base é sempre papel/creme.
- **Don't** aplicar `startViewTransition`/View Transitions API — `navTo` é síncrono por decisão de
  arquitetura, incompatível com essa API.
