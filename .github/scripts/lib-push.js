/* Helpers compartilhados de enviar-push.js e enviar-avisos.js (b266 E1-B6 / SEG-06).
   Um token ruim ou um usuário com muitos tokens não pode derrubar o disparo dos outros:
   - só token STRING (forma da regra v21: push/{uid}/{chave} = {token, ts, ua}; `_agenda` é metadado);
   - FCM aceita no máximo 500 tokens por sendEachForMulticast → lotes de 500;
   - exceção num lote vira contagem, não derruba o processo.
   Nunca loga token. */

const LOTE = 500;
const CODIGOS_INVALIDOS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
  'messaging/invalid-registration-token'
];

// push/{uid} → [{chave, token}] só com token string de 1..500 chars (teto da regra v21).
function tokensDoNo(noh) {
  const out = [];
  if (!noh || typeof noh !== 'object') return out;
  for (const chave of Object.keys(noh)) {
    if (chave === '_agenda') continue;
    const t = noh[chave] && noh[chave].token;
    if (typeof t === 'string' && t.length > 0 && t.length <= 500) out.push({ chave, token: t });
  }
  return out;
}

// itens: [{token, ...}]. aoFalhar(item, code) é chamado por token que o FCM recusou.
// Devolve {sucesso, falha, lotesComErro, invalidos[]}; nunca lança.
async function enviarEmLotes(msg, itens, data, aoFalhar) {
  const r = { sucesso: 0, falha: 0, lotesComErro: 0, invalidos: [] };
  for (let i = 0; i < itens.length; i += LOTE) {
    const lote = itens.slice(i, i + LOTE);
    try {
      const resp = await msg.sendEachForMulticast({ tokens: lote.map((x) => x.token), data });
      r.sucesso += resp.successCount;
      r.falha += resp.failureCount;
      resp.responses.forEach((x, j) => {
        if (x.success) return;
        const code = (x.error && x.error.code) || 'desconhecido';
        if (aoFalhar) aoFalhar(lote[j], code);
        if (CODIGOS_INVALIDOS.includes(code)) r.invalidos.push(lote[j]);
      });
    } catch (e) {
      r.lotesComErro++;
      r.falha += lote.length;
      console.log('Lote com erro (' + lote.length + ' tokens): ' + ((e && e.code) || 'erro'));
    }
  }
  return r;
}

module.exports = { LOTE, tokensDoNo, enviarEmLotes };
