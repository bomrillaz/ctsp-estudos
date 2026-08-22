#!/bin/bash
# ============================================================
# verify_ctsp.sh v2 (adaptado Windows/Git Bash) — Verificação de início de sessão (Bombeiro CTSP)
# Suporta 2 layouts:
#   • v1.53+ : index.html (lógica) + data.js (TOPICOS/QI/FCI/RESUMOS_BANCO)
#   • legado : index.html único (dados embutidos)
# Uso: bash verify_ctsp.sh [dir_ou_index]
# ============================================================
set -u
ARG="${1:-.}"
if [ -d "$ARG" ]; then DIR="$ARG"; else DIR="$(dirname "$ARG")"; fi
W="$DIR/.tmp/verify_ctsp"
mkdir -p "$W"; cp "$DIR/index.html" "$W/index.html"
DATA=""
[ -f "$DIR/data.js" ] && { cp "$DIR/data.js" "$W/data.js"; DATA="data.js"; }
cd "$W"

echo "=== ARQUIVOS ==="
echo "index.html: bytes=$(wc -c < index.html) linhas=$(wc -l < index.html)"
if [ -n "$DATA" ]; then
echo "data.js: bytes=$(wc -c < data.js) linhas=$(wc -l < data.js) [layout 2 arquivos]"
else
echo "data.js: AUSENTE [layout legado, dados embutidos no index]"
fi

echo "=== SEGURANCA no index.html (esperado: unsafe-eval=0, initializeApp=1, checkRateLimit=2, isAdmin>=7, sanitize>=17) ==="
for t in unsafe-eval isAdmin sanitize initializeApp checkRateLimit; do
echo "$t=$(grep -o "$t" index.html | wc -l)"
done
if [ -n "$DATA" ]; then
echo "-- data.js deve ser SO dados: unsafe-eval=$(grep -o 'unsafe-eval' data.js | wc -l) initializeApp=$(grep -o 'initializeApp' data.js | wc -l) (esperado 0/0)"
fi

echo "=== PROIBIDOS em ambos os arquivos (esperado 0) ==="
for t in "Parte 3.1" "Parte 7.2" "57390"; do
N=$(cat index.html ${DATA} | grep -o "$t" | wc -l)
echo "\"$t\"=$N"
done
echo "Cap.4_total=$(cat index.html ${DATA} | grep -o 'Cap\.4' | wc -l) (legitimo se todas as ocorrencias citarem MABOM)"

echo "-- onclick com campo de texto livre interpolado (esperado 0 -- S4, PLANO_correcao_seguranca.md)"
echo "onclick_texto_livre=$(grep -c "onclick=\"[^\"]*\${[^}]*\(nome\|email\|texto\|descricao\|titulo\|corpo\)" index.html || true)"

echo "=== SINTAXE ==="
python -c "
import re
html = open('index.html', encoding='utf-8').read()
s = re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', html, re.DOTALL)
open('main.js','w',encoding='utf-8').write(max(s, key=len))
"
node --check main.js && echo "index_script=OK" || echo "index_script=FALHOU"
if [ -n "$DATA" ]; then
node --check data.js && echo "data_js=OK" || echo "data_js=FALHOU"
grep -q '<script src="data.js?v=' index.html && echo "tag_data_js=OK (bumpar ?v= quando data.js mudar)" || echo "tag_data_js=AUSENTE_OU_SEM_CACHEBUSTER"
cat data.js main.js > _combined.js
node --check _combined.js && echo "combinado=OK" || echo "combinado=FALHOU"
fi

echo "=== CONTEUDO ==="
if [ -n "$DATA" ]; then SRC=data.js; else SRC=main.js; fi
cat > _count.js <<EOF
const fs = require('fs');
const src = fs.readFileSync('$SRC', 'utf-8');
EOF
cat >> _count.js <<'EOF'
function extractBalanced(name, open, close) {
  const re = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*');
  const m = src.match(re);
  if (!m) return null;
  let i = m.index + m[0].length;
  while (src[i] !== open) i++;
  let depth = 0, start = i, inStr = null, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (inStr) { if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}
const QI  = eval('(' + extractBalanced('QI', '{', '}') + ')');
const FCI = eval('(' + extractBalanced('FCI', '[', ']') + ')');
const RES = eval('(' + extractBalanced('RESUMOS_BANCO', '[', ']') + ')');
const TOPsrc = extractBalanced('TOPICOS', '{', '}');
const TOP = TOPsrc ? eval('(' + TOPsrc + ')') : {};
const INCsrc = extractBalanced('INCIDENCIA', '[', ']');
const INC = INCsrc ? eval('(' + INCsrc + ')') : [];
let totalQ = 0, ids = new Set(), semTopico = [];
for (const [area, qs] of Object.entries(QI)) {
  totalQ += qs.length;
  for (const q of qs) { ids.add(q.id); if (!q.topico) semTopico.push(q.id); }
}
console.log('questoes_total=' + totalQ);
console.log('ids_unicos=' + ids.size);
console.log('duplicatas=' + (totalQ - ids.size));
console.log('sem_topico=' + (semTopico.length ? semTopico.join(',') : '0'));
console.log('flashcards=' + FCI.length);
console.log('resumos=' + RES.length);
console.log('por_area=' + Object.entries(QI).map(([k, v]) => k + ':' + v.length).join(' '));

// ── Integridade da chave de resposta (auditoria jul/26, item 3) ──
// verify não pegava: nº de opções, range do gabarito, topico inválido, ids fantasma
// no INCIDENCIA. Uma questão sem ops/g quebraria renderQuizQ/renderSimQ sem guard.
let opsRuim = [], gRuim = [], topInvalido = [];
for (const qs of Object.values(QI)) {
  for (const q of qs) {
    if (!Array.isArray(q.ops) || q.ops.length !== 5)
      opsRuim.push(q.id + '(' + (Array.isArray(q.ops) ? q.ops.length : 'sem ops') + ')');
    if (!Number.isInteger(q.g) || q.g < 0 || (Array.isArray(q.ops) && q.g >= q.ops.length))
      gRuim.push(q.id + '(g=' + q.g + ')');
    if (q.topico && !(q.topico in TOP)) topInvalido.push(q.id + '->' + q.topico);
  }
}
let incFantasma = [];
for (const item of INC)
  for (const qid of (item.qs || []))
    if (!ids.has(qid)) incFantasma.push((item.assunto || '?') + '->' + qid);
console.log('ops_diferente_de_5=' + (opsRuim.length ? opsRuim.join(',') : '0'));
console.log('gabarito_fora_do_range=' + (gRuim.length ? gRuim.join(',') : '0'));
console.log('topico_invalido=' + (topInvalido.length ? topInvalido.join(',') : '0'));
console.log('incidencia_ids_fantasma=' + (incFantasma.length ? incFantasma.join(',') : '0'));
EOF
node _count.js
echo "=== FIM - comparar com o ultimo historico ==="