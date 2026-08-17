# CLAUDE.md — Projeto Prontidão (CTSP)

Plataforma de estudos para Bombeiros Militares do CBMRS em preparação para o CTSP 2026
(concurso interno de promoção a 2º Sargento). PWA instalável, em fase de venda a colegas.
O usuário é o autor, bombeiro militar, e usa a própria plataforma para estudar. Trabalho em português.

---

## 1. ARQUITETURA

Dois arquivos no núcleo, mais a camada PWA:

| Arquivo | Papel |
|---|---|
| `index.html` | TODA a lógica, UI e CSS (~500 KB / ~7.800 linhas) |
| `data.js` | **SÓ dados**: `TOPICOS`, `QI`, `FCI`, `RESUMOS_BANCO` (~670 KB) |
| `sw.js` | service worker |
| `manifest.webmanifest` | manifesto PWA |
| `assets/` | ícones, vídeo de loading, imagens de marca |

`data.js` é carregado por `<script src="data.js?v=NNN">` **antes** do script principal.

- **Rebrand técnico (b69): repo transferido pra conta `bomrillaz`, path continua `ctsp-estudos`.** Pasta
  local, repo no GitHub e URL do site já usam a marca nova. Firebase e RTDB **continuam de propósito com o
  nome `ctsp-estudos`** — são identificadores internos invisíveis ao usuário; trocar exigiria migrar contas
  de Auth e o banco de progresso, sem ganho visível. Não mexer nesses dois sem pedido explícito.
- Site: https://bomrillaz.github.io/ctsp-estudos
- Repo: github.com/bomrillaz/ctsp-estudos
- Firebase: projeto `ctsp-estudos` · conta dona `jvictor.projetos.ti@gmail.com` (**não sugerir migração**)
- RTDB: https://ctsp-estudos-default-rtdb.firebaseio.com · UID admin `DyNxtutn1aaemZk8cbMtGOnM0iG3`
- Stack: HTML/CSS/JS puro + Firebase Auth + Realtime Database + GitHub Pages + Service Worker
- reCAPTCHA v3: `6Lf1nw0tAAAAABuGxbqJzesfcIuZbXOLbMZf3_GY`
- **Prioridade de dispositivo: iPhone/iOS/Safari → Android → PC.** Regra de desktop sempre dentro de `@media`.
- **IA generativa foi descontinuada (jul/2026).** Não repropor sem pedido explícito.
- **"Virar app" = PWA, não nativo.** Cobrança roda por fora (Pix / link de cartão).

---

## 2. REGRAS INVIOLÁVEIS

Cada uma destas já quebrou o site pelo menos uma vez.

**Versionamento e cache**
- Alterou `data.js` → bumpar o `?v=` no `index.html` **E** atualizar a URL do `data.js` no SHELL do `sw.js`. Se `data.js` não mudou, **não bumpar**.
- `APP_VERSAO` sobe sempre.
- Mudou a lógica do SW → bumpar o `CACHE`.

**Service worker**
- O SW **NUNCA** intercepta chamada dinâmica do Firebase (`firebaseio.com`, `googleapis.com`, reCAPTCHA).
  Só same-origin e os scripts **estáticos** do SDK (gstatic `/firebasejs/`).
  Interceptar o RTDB/Auth faz o app abrir **zerado**.

**Realtime Database**
- Chave do RTDB não aceita `. # $ / [ ]` — e os tópicos são `T1.1`, `T2.4`…
  Encode na fronteira (`bktParaFirebase()` / `bktDoFirebase()`, `CAMPOS_CHAVE_TOPICO`).
  **Uma chave ilegal derruba o `set()` INTEIRO.**
- **NUNCA acrescentar campo novo num `set()` que o usuário COMUM executa.**
  `usuarios/$uid/$outro` é `.validate` exigindo admin; um campo reprovado derruba o `set()` inteiro.
- `.validate` **não roda em exclusão**. `.write` de nó pai **não pode** ser revogado por regra filha.
- Exclusão de conta tem ordem obrigatória: `progresso`/`cards`/`push` → `usuarios/$uid` → `auth.delete()`.

**Front-end**
- **`navTo` é SÍNCRONO. Não reintroduzir View Transitions.** O site faz `navTo('x'); ação()` em ~15 pontos.
- Quiz, Cards e Resumos abrem no **HUB** (meta do dia + índice em acordeão por área).
  Cards e Resumos têm **2 níveis** (área → tópico → itens); Quiz tem 1 (o tópico É a ação).
  Desktop ≥768px = mestre-detalhe. Os chips de filtro por área foram removidos — **não reintroduzir**.
- Quem seta filtro de tópico e chama `renderCards()` tem de entrar em modo estudo (`cardsModo='estudo'; _estudoCards()`).
- **Cabeçalho de seção não pode ser irmão dos itens** numa lista que vira grid no desktop
  (`.resumos-list`, `.area-list` acima de 768px) — vira célula solta e embaralha a tela. Vai DENTRO do item.
- `.auth-bg` / `.auth-bg-img` são `position:absolute; inset:0` — vista nova na tela deslogada tem de ficar DENTRO do `#login-view`.
- `display:contents` no mestre-detalhe exige **`row-gap:0`** (linhas implícitas vazias viram buraco de centenas de px).
- SVG: cor por `style="stroke:var(--x)"`, nunca por atributo (Safari iOS não resolve var em presentation attribute).
- Nunca passar string SVG por `.textContent` nem por `sanitize()`.
- `</style>` ou `</script>` literal dentro de comentário fecha a tag cedo e mata o CSS inteiro.
- `viewport-fit=cover` desalinha a barra no iPhone. Não reintroduzir.
- Nunca recriar as abas **Trilha, Áudio, Material** (removidas). Nunca reverter correção registrada no histórico.

**Segurança**
- Nunca `unsafe-eval` na CSP. `frame-ancestors` em meta CSP é ignorado.
- `firebase.initializeApp` **1x só**. Sanitizar todo `innerHTML` com dado de banco.
  `isAdmin()` em toda função admin. `checkRateLimit()` no login.
- **As regras do RTDB são o perímetro real** — não o App Check (removido conscientemente), não o `isAdmin()` do cliente.
- Nunca chamar `saveProg()` antes de `dataLoaded`.

**Conteúdo**
- Nunca fabricar número de página, norma ou gabarito sem fonte verificável.
- Nunca declarar uma norma "inverificável" sem antes abrir os arquivos de `materiais/`.

**Git**
- **`git push` permitido, mas só com confirmação explícita do João antes de cada push.** Nunca empurrar sem perguntar, mesmo com commit local pronto.

---

## 3. VERIFICAÇÃO

```bash
bash verify_ctsp.sh
```

Limiares esperados em `index.html`:
`unsafe-eval=0` · `isAdmin>=7` · `sanitize>=17` · `initializeApp=1` · `checkRateLimit=2`
Em `data.js`: `unsafe-eval=0` e `initializeApp=0`.

Rodar a cada 3 sessões, depois de adicionar questões, depois de mexer em auth/admin, ou quando pedido.
Comparar as contagens com as do último histórico — **divergência = investigar antes de alterar**.

Nota: `Cap.4` tem 4 ocorrências **legítimas** (questões de mangueiras citando o MABOM).

**`node --check` não pega erro de execução.** Variável órfã é sintaticamente válida.
Validar EXECUTANDO — harness Node+jsdom, ou o navegador. Comportamento de PWA só o navegador pega.

Harness jsdom: `let`/`const`/`class` de topo **não** viram propriedade do objeto de contexto mesmo usando
`global` como sandbox. Para ler `userStats`/`allQuestoes`/`QI` depois do load, o teste também tem de rodar
via `vm.runInContext` no MESMO contexto. jsdom não tem `requestAnimationFrame`/`MutationObserver`/`scrollIntoView` — stub manual.

---

## 4. TRABALHO COM OS ARQUIVOS

- **Nunca ler `index.html` ou `data.js` inteiros** (~120 mil tokens). Usar `grep -n`, `Read` com faixa.
- Alteração de **conteúdo** (questões/flashcards/resumos) = editar **só** `data.js` (+ bump).
  Alteração de **lógica** = editar **só** `index.html`.
- Parsear `data.js` com **parser de chaves balanceadas em Node, nunca regex**.
  `QI` é objeto `{AT1:[...]}`; `FCI` e `RESUMOS_BANCO` são **arrays**.
- Contar por **ocorrência de id**, nunca por linha — várias questões dividem linha.
- Mudança em massa: script Python com **assertion de contagem exata** e âncora única, contra dupla-inserção.
- `grep -c` com 0 matches sai com código 1 e quebra cadeia `&&`.
- Editar `data.js` sem carregá-lo no contexto: script com âncora → `node --check` → conferir contagem.

---

## 5. MATERIAL DE REFERÊNCIA

`materiais/` espelha a pasta oficial do Drive e é **gitignorada** — nunca commitar (material institucional).
Subpastas: 5 áreas temáticas + `marca/` + `entregas/` + `produtos/` + `historico/` (+ `arquivo_morto/`).

**`materiais/entregas/`** é só planejamento e ferramentas (reorganizado no b67):
`planos/` (PLANO_*.md) · `protocolo/` (instruções de projeto, LEIA-ME, migração) · `comercial/`
(VENDAS_planos_e_copy.md) · `conteudo/` (CONTEUDO_PROGRAMATICO, `_analise/`, `_dados/`) · `seguranca/`
(SEGURANCA_regras_rtdb.json) · `testes/` (harness de regressão) · `_tmp/`.

**`materiais/produtos/`** — fora de `entregas/`, é onde vivem os ENTREGÁVEIS físicos (PDF) e os scripts
que os geram: `ebook/`, `flashcards/`, `plataforma/`. Cada script (`build_ebook.py`, `gen_flashcards.py`,
`build_deck.py`) calcula `REPO` relativo à própria posição — se mover um desses scripts, ajustar a
contagem de `..` antes de rodar.

**Arquivo temporário:** SEMPRE dentro de `materiais/entregas/_tmp/` (nunca solto em outra subpasta) e
**apagar ao terminar de usar**. Produto/código usa `.tmp/` na raiz do repo (já existente) — mesma regra.

**Arquivo novo:** ao criar, colocar direto na subpasta a que pertence pelo assunto (`planos/`,
`comercial/`, `produtos/ebook/` etc.) — não deixar solto na raiz de `entregas/` ou `materiais/` pra
organizar depois.

- Fontes oficiais: **Edital 004/ABM-DENS/2025 + Aditamento 10**.
- **Cotas do edital (60 questões): AT1=14 · AT2=8 · AT3=14 · AT4=12 · AT5=12.** `CTSP_CORTE=53`.
- AT2 do edital = MABOM caps. 1, 2, 3, 5, 7. Caps. 4, 6 e 13 estão **fora**.
- CE/RS: aplicar as emendas EC 67/14, 73/17, 82/22.
- Auditoria: varrer TODAS as subpastas, nunca parar no primeiro resultado.
  Arquivo grande (MABOM 31 MB): extrair localmente com `python-docx`/`pypdf`, nunca puxar inteiro para o contexto.
- **A lei/manual mais atual é a fonte de verdade.** Se o gabarito oficial conflitar com a lei vigente, prevalece a LEI.
- PDFs de `materiais/` são PDFs reais. Os do projeto (`CadernodeQuestões.pdf`, `PROVACTSP.pdf`) são ZIPs de JPEG — `unzip` + PIL.

### Autoria das questões

⭐ **As questões são 100% AUTORAIS, escritas do zero.** Modelos de questões de cursinho balizaram apenas
o **estilo** no início da elaboração; nenhuma questão de terceiro foi reproduzida e nenhuma está no site.
Confirmado pelo João, autor, em 11/08/2026.

Autoria própria **não afrouxa a honestidade**: continua proibido dizer que a plataforma reproduz a prova,
sabe o que vai cair ou promete aprovação. Há teste no harness travando isso.

---

## 6. MOTOR DE ESTUDO

- **FSRS é a fonte única de agendamento da questão** (`questoesFSRS`). SM-2 aposentado; leitura legada só como fallback no `questaoDue`.
- **BKT por tópico** com decaimento temporal (`bktPLefetivo`): meia-vida = `7d × acertos`, piso 10, teto 90.
- **Card é recuperação, resumo não.** Flashcard acertado (Médio/Fácil) adia o decaimento; resumo não conta. Só a QUESTÃO cria domínio.
- **Treino do dia** (`montarTreinoDoDia`): revisão vencida (teto 6) → tópico fraco (BKT) → assunto novo por peso do edital.
- **Não responder não é errar.** Branco conta zero; o modelo só aprende com resposta real.
- Erro reagenda para +1 dia (piso FSRS), com datas absolutas.
- Data de "dia" tem de ser LOCAL (`diaLocal()`); `toISOString()` vira o dia às 21h no Brasil.
- Escrita na nuvem = read-merge-write por campo + mutex; contadores por máximo; reset exige carimbo `wipe`.
- `itemStats` ({t,c} por questão) plantada — semente da dificuldade de item (IRT/Elo), falta volume.

---

## 7. COMERCIAL

- **Mensal R$ 59,90** (Pix) · **Anual R$ 478,80** = 12x de R$ 39,90 sem juros, dando **13 meses** de acesso · **teste grátis de 7 dias**.
- A escada existe para induzir ao anual (recebimento integral e imediato). Ponto de equilíbrio ~6,7 meses.
- **Obrigatório no site junto do preço:** o plano vale a partir da assinatura, independente da data do edital; e o direito de arrependimento de 7 dias (CDC).
- Cobrança manual no painel do admin: `usuarios/$uid/cob = {plano, meio, prox, pago}`. 1º acesso vem do `criadoEm`.
  **Estado é derivado, nunca gravado.** A faixa da Home só avisa; **quem corta acesso é o `aprovado`**.
- O banco de questões é **público por arquitetura** (`data.js` antes do login). Aceito — a mensalidade paga o SERVIÇO.
- Textos e peça de venda: `materiais/entregas/comercial/VENDAS_planos_e_copy.md`.

---

## 8. DEPLOY

```bash
cd ~/Documents/bomrillaz-estudos
git add index.html          # + data.js / sw.js / manifest.webmanifest / assets/ quando mudarem
git commit -m "vX.YZ — ..."
git push                    # ← só com confirmação explícita do João antes de rodar
```

Se o push for recusado: `git fetch origin` → `git merge -s ours origin/main -m "reconcilia"` → `git push`.
**O fetch antes do merge é obrigatório.**

Conferência: Configurações → fim da tela mostra a versão.
**Não** commitar `assets/cesar-coin-gray.png` (órfão).

---

## 9. INÍCIO E FIM DE SESSÃO

Memória do projeto vive no **vault Obsidian**, fora do repo:
`C:\Users\Daiane\Documents\Claude\vault\10-projetos\prontidao-ctsp\`.
`materiais/historico/` e `MEMORIA_INDICE.md` do repo estão **congelados** (arquivo morto da migração,
b65) — não recebem mais gravação. Ver §12 sobre backup do vault.

**Início** (obrigatório só quando a sessão mexer em código ou no banco):
1. Ler `_estado.md` do vault — é a autoridade do **estado atual** (versão, contagens, pendências).
2. Ler as notas de `licoes/`/`decisoes/` linkadas nas pendências abertas do `_estado.md` — não o vault
   inteiro, só o que a pendência do dia referencia.
3. Rodar `verify_ctsp.sh` e comparar com as contagens do `_estado.md`.

**Fonte de verdade é o disco local.** O vault é a memória do projeto; o Drive é só segunda via (ver
§12). Nunca subir arquivo ao Drive dentro de uma sessão de trabalho — a sincronização roda por fora, sem
IA no meio.

**Fim — comando `encerrar`:**
1. Atualizar `_estado.md` do vault: o que foi feito, o que ficou aberto, decisões, erros, IDs livres,
   estado do banco e contagens. Registrar commits não publicados. Autossuficiente — quem só lê o
   `_estado.md` tem de entender o estado sem abrir mais nada.
2. Criar/atualizar nota(s) atômica(s) em `licoes/` (o que muda conduta futura) ou `decisoes/` (o que foi
   fechado e por quê), linkadas ao bloco da sessão.
3. Copiar o `.md` da sessão para `historico/` do vault, no mesmo formato dos blocos anteriores.
4. **Não** escrever mais em `materiais/historico/` nem em `MEMORIA_INDICE.md` do repo.

---

## 12. BACKUP

O repositório do GitHub já é a segunda via do **produto** (`index.html`, `data.js`, `sw.js`, `assets/`).

**Crítico** — perda seria irrecuperável:

| Pasta | Onde | Por quê |
|---|---|---|
| `vault\10-projetos\prontidao-ctsp\` | `Documents\Claude\vault\`, fora do repo | memória ativa: `_estado.md`, `licoes/`, `decisoes/`, `historico/` |
| `materiais/entregas/` | dentro do repo, gitignorada | regras do RTDB, planos, copy de vendas, scripts de auditoria |
| `materiais/produtos/` | dentro do repo, gitignorada | PDFs entregáveis (ebook, flashcards, plataforma) + scripts que os geram |
| `materiais/marca/` | dentro do repo, gitignorada | mascote César, vídeo de loading, fontes — a identidade visual |

Confirmado (b65): `Documents\Claude\vault\` sincronizada com o Google Drive para desktop.

**Congelado, não cresce mais:** `materiais/historico/` e `MEMORIA_INDICE.md` do repo — arquivo morto da
migração (b65), preservados como estão. Cobertos pela sincronização de `materiais/` já existente; não
recebem gravação nova.

**Não precisa de backup:** as 5 áreas temáticas e `materiais/provas/` (~240 MB) já vieram do Drive
e continuam lá; `materiais/prints/` é regenerável.

**Método:** sincronização automática por fora (Google Drive para desktop). **A IA não sobe arquivo para
o Drive** — o conector só adiciona, gera duplicado, e gasta token para fazer o que um sincronizador faz
de graça.

---

## 10. MODO DE TRABALHO

- **Saída enxuta.** Responder direto, sem preâmbulo nem recapitulação. Dizer O QUÊ, não COMO.
- **Lista de tarefas em trabalho multi-etapa.**
- **Honestidade acima de agradar.** Dizer quando algo não vale a pena e quando há limitação real. Nunca inventar fonte, número ou fato.
- **Verificar antes de afirmar.** Pergunta sobre origem/histórico se responde abrindo o git ou o arquivo, nunca de memória.
- **Ao corrigir uma ocorrência, varrer a CLASSE inteira.** Ao remover UI, caçar os writers órfãos do id removido.
- **Desconfiar do TESTE antes do código** — já houve três casos de harness acusando falha falsa.
- **Toda regra de conteúdo que importe precisa de um script que a meça.** Instrução não medida vira lembrança.
- **Auditar não é corrigir.** Ou aplica na mesma sessão, ou a pendência entra como 🔴 com o custo explícito.
- **Subagente é caro.** Só com frentes realmente independentes ou verificação de alto risco — nunca no trivial.
  Subagentes **não** escrevem no mesmo arquivo em paralelo: edição em massa = executor único + revisor.
- **Modelo:** Sonnet é o padrão. Opus só na fase de **decisão** de mudança estrutural ou de alto risco.
- Skills: `code-reviewer` para lógica pesada · `senior-architect` para arquitetura ·
  `ui-ux-pro-max` para visual/acessibilidade · `playwright-skill` para testar o site · `document-skills` para PDF/Word/planilha.

---

## 11. BACKLOG (não bloqueante)

- **Banco desbalanceado vs peso da prova:** AT4 tem ~117 questões para cota 12.
  **Expandir AT1, AT3/APH e T2.x; nunca AT4/AT5.** Nunca escrever questão só por escrever.
- **BKT sem dificuldade de item** (IRT/Elo) — `itemStats` plantada, falta volume e agregação.
- Acessibilidade por teclado incompleta em pontos.
- Formato do banco está **congelado** (97% alternativa direta) — não reformatar.
