#!/bin/bash
# ============================================================
# verify_gate.sh (b149) -- wrapper de CI para o verify_ctsp.sh
#
# POR QUE ESTE ARQUIVO EXISTE: `verify_ctsp.sh` tem `set -u` mas NAO `set -e`.
# Quando uma checagem falha ele imprime `FALHOU` e segue; o codigo de saida e o
# do ultimo comando, que e sempre um `node` bem-sucedido. Ou seja: ele SEMPRE sai
# com 0. Um workflow que apenas o executasse seria um gate decorativo -- passaria
# ate com o index.html sintaticamente quebrado.
#
# O verify_ctsp.sh NAO deve ser alterado: ele e usado interativamente no inicio de
# sessao e a saida e comparada a olho contra o _estado.md do vault. Este wrapper
# le a saida dele e aplica as assercoes.
#
# Duas classes de assercao:
#   IGUALDADE -- invariante de seguranca/integridade; qualquer desvio reprova.
#   PISO      -- metrica que sobe legitimamente a cada funcao nova. Reprova so se
#                CAIR. Um gate por igualdade aqui reprovaria quase todo commit
#                legitimo, e CI que grita sem motivo e CI que se desliga.
#
# Uso: bash verify_gate.sh [dir_ou_index]
# ============================================================
set -u
DIR="${1:-.}"

# --- armadilha do CI: `python` vs `python3` ---------------------------------
# verify_ctsp.sh chama `python -c` (extracao do <script> do index.html). No Git
# Bash do Windows isso resolve; no ubuntu-latest o executavel e `python3` e
# `python` pode nao existir. Shim no PATH em vez de editar o script original --
# mantem o gate rodando identico nas duas maquinas, que e o motivo do wrapper.
if ! command -v python >/dev/null 2>&1; then
  if command -v python3 >/dev/null 2>&1; then
    SHIM="$(mktemp -d)"
    printf '#!/bin/sh\nexec python3 "$@"\n' > "$SHIM/python"
    chmod +x "$SHIM/python"
    PATH="$SHIM:$PATH"; export PATH
    echo "[gate] python ausente -- usando shim para python3"
  else
    echo "[gate] ERRO: nem python nem python3 encontrados."; exit 1
  fi
fi

OUT="$(bash "$DIR/verify_ctsp.sh" "$DIR" 2>&1)"
printf '%s\n' "$OUT"

FALHAS=0
falhar(){ echo "[gate] FALHOU: $*"; FALHAS=$((FALHAS+1)); }

# valor de uma metrica `chave=valor` no inicio da linha
val(){ printf '%s\n' "$OUT" | grep -m1 "^$1=" | cut -d= -f2- | tr -d '\r'; }

exato(){ # exato <chave> <esperado>
  local v; v="$(val "$1")"
  [ -n "$v" ] || { falhar "$1 nao apareceu na saida do verify_ctsp.sh"; return; }
  [ "$v" = "$2" ] || falhar "$1=$v (esperado exatamente $2)"
}
piso(){ # piso <chave> <minimo>
  local v; v="$(val "$1")"
  [ -n "$v" ] || { falhar "$1 nao apareceu na saida do verify_ctsp.sh"; return; }
  case "$v" in (*[!0-9]*) falhar "$1=$v nao e numero"; return;; esac
  [ "$v" -ge "$2" ] || falhar "$1=$v (piso $2 -- alguem REMOVEU uma trava)"
}
contem(){ # contem <texto> -- linha que nao comeca com chave=
  printf '%s\n' "$OUT" | grep -qF "$1" || falhar "esperado na saida: $1"
}

echo "=== GATE ==="

# --- igualdade: seguranca ---
exato unsafe-eval 0
exato initializeApp 1
exato onclick_texto_livre 0
contem '"Parte 3.1"=0'
contem '"Parte 7.2"=0'
contem '"57390"=0'

# data.js tem de continuar sendo SO dados
contem 'unsafe-eval=0 initializeApp=0'

# --- igualdade: sintaxe (o que faz o site abrir em branco) ---
exato index_script OK
exato data_js OK
exato combinado OK
printf '%s\n' "$OUT" | grep -q '^tag_data_js=OK' || falhar "tag_data_js sem cachebuster"

# --- igualdade: integridade do banco ---
exato duplicatas 0
exato sem_topico 0
exato ops_diferente_de_5 0
exato gabarito_fora_do_range 0
exato topico_invalido 0
exato incidencia_ids_fantasma 0

# --- piso: sobem com funcao nova, so reprovam se CAIREM ---
# Folga proposital sobre a baseline v1.240 (isAdmin=18, sanitize=89): colar no
# valor atual transformaria refactor legitimo em reprovacao.
piso isAdmin 14
piso sanitize 80
piso checkRateLimit 2
piso questoes_total 533
piso flashcards 174
piso resumos 78

if [ "$FALHAS" -gt 0 ]; then
  echo "[gate] $FALHAS asercao(oes) reprovada(s)."
  exit 1
fi
echo "[gate] OK -- todas as asercoes passaram."
