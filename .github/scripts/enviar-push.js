/* Remetente de push — Prontidão · CBMRS (Fase 4c · data-only bloco 50)
   Roda no GitHub Actions. Lê os tokens em push/{uid}/{chave} do RTDB (via firebase-admin,
   com privilégio de admin → ignora as regras), dispara uma notificação via FCM HTTP v1 e
   REMOVE os tokens que o FCM reportar como não registrados (app desinstalado / token expirado).

   Segredo: FIREBASE_SERVICE_ACCOUNT = conteúdo JSON da conta de serviço (GitHub Secret).
   Nunca imprimir o segredo. databaseURL é público (já vive no index.html).

   Mensagem: PUSH_TITULO / PUSH_CORPO por env (inputs do workflow); há default.
   Personalização (bloco 45+): no disparo CONDICIONAL, conta as revisões vencidas de cada
   usuário a partir de push/{uid}/_agenda.agenda (array de timestamps ABSOLUTOS) e injeta o
   número no corpo. A contagem é feita AQUI, na hora do envio → nunca envelhece. Texto manual
   (PUSH_TITULO/PUSH_CORPO) sempre prevalece. Clientes antigos sem `agenda` caem no default. */

const admin = require('firebase-admin');

let svc;
try {
  svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '');
} catch (_) {
  console.error('FIREBASE_SERVICE_ACCOUNT ausente ou não é JSON válido.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(svc),
  databaseURL: 'https://ctsp-estudos-default-rtdb.firebaseio.com'
});

const db = admin.database();
const msg = admin.messaging();

// Rotação de mensagem por horário (Brasília, UTC-3, sem horário de verão), pra não
// soar repetido nos 3 disparos diários. Se o workflow passar PUSH_TITULO/PUSH_CORPO
// (disparo manual), esses prevalecem.
function mensagemPorHorario() {
  const h = new Date(Date.now() - 3 * 3600 * 1000).getUTCHours();
  if (h < 12) return { titulo: 'Prontidão', corpo: 'Bom dia! Comece adiantando suas revisões de hoje.' };
  if (h < 18) return { titulo: 'Prontidão', corpo: 'Pausa produtiva: 10 minutos de questões agora já contam.' };
  return { titulo: 'Prontidão', corpo: 'Antes de encerrar o dia, feche suas revisões pendentes.' };
}
const _rot = mensagemPorHorario();
const TITULO = (process.env.PUSH_TITULO || '').trim() || _rot.titulo;
const CORPO = (process.env.PUSH_CORPO || '').trim() || _rot.corpo;
const TEM_CUSTOM = !!((process.env.PUSH_TITULO || '').trim()) || !!((process.env.PUSH_CORPO || '').trim());
const LINK = 'https://jhoonnvictor.github.io/bomrillaz-estudos/';

// Conta revisões vencidas a partir do array de timestamps absolutos gravado pelo cliente.
// Retorna -1 quando o usuário está vencido mas o cliente é antigo (só tem `prox`, sem `agenda`).
function vencidasDoNo(noh, agora) {
  const ag = noh && noh._agenda;
  if (!ag) return 0;
  if (Array.isArray(ag.agenda)) {
    return ag.agenda.filter((t) => typeof t === 'number' && t > 0 && t <= agora).length;
  }
  if (typeof ag.prox === 'number' && ag.prox > 0 && ag.prox <= agora) return -1; // vencido, contagem desconhecida
  return 0;
}

// Corpo personalizado pela contagem + horário de Brasília. Só usado quando não há texto manual.
function corpoContagem(n) {
  const rev = n + ' ' + (n === 1 ? 'revisão vencida' : 'revisões vencidas');
  const h = new Date(Date.now() - 3 * 3600 * 1000).getUTCHours();
  const cta = h < 12 ? 'Bom dia — comece adiantando.'
            : h < 18 ? '10 minutos agora já contam.'
            : 'Feche antes de encerrar o dia.';
  return 'Você tem ' + rev + '. ' + cta;
}

(async () => {
  const snap = await db.ref('push').get();
  const val = snap.val() || {};

  const agora = Date.now();
  // Disparo agendado (cron) = CONDICIONAL: só quem tem revisão vencida.
  // Disparo manual (workflow_dispatch) = FORÇADO: envia a todos (teste/aviso).
  const forcar = (process.env.GITHUB_EVENT_NAME || '') !== 'schedule';

  // push/{uid}/{chave} = {token, ts, ua} · push/{uid}/_agenda = {prox, agenda, ts}
  // Agrupamos por usuário para personalizar o corpo pela contagem dele.
  const usuarios = [];
  let pulados = 0;
  for (const uid of Object.keys(val)) {
    const noh = val[uid] || {};
    const vencidas = vencidasDoNo(noh, agora);
    const elegivel = forcar || vencidas > 0 || vencidas === -1;
    if (!elegivel) { pulados++; continue; } // sem revisão vencida → não incomoda
    const tokens = [];
    for (const chave of Object.keys(noh)) {
      if (chave === '_agenda') continue; // metadado, não é token
      const t = noh[chave] && noh[chave].token;
      if (t) tokens.push({ chave, token: t });
    }
    if (tokens.length) usuarios.push({ uid, tokens, vencidas });
  }

  console.log(forcar ? 'Modo: FORCADO (manual)' : 'Modo: CONDICIONAL (agendado)', '· usuarios pulados:', pulados);

  const totalTokens = usuarios.reduce((s, u) => s + u.tokens.length, 0);
  if (!totalTokens) {
    console.log('Nenhum token elegivel. Nada a enviar.');
    process.exit(0);
  }
  console.log('Usuarios alvo:', usuarios.length, '· Tokens alvo:', totalTokens);

  let sucesso = 0, falha = 0;
  const remocoes = [];

  for (const u of usuarios) {
    // Texto manual sempre prevalece; senão, personaliza pela contagem quando conhecida (>0).
    const corpoU = (!TEM_CUSTOM && u.vencidas > 0) ? corpoContagem(u.vencidas) : CORPO;

    // DATA-ONLY (bloco 50): sem o campo `notification`, o FCM NÃO exibe sozinho — quem
    // mostra é só o onBackgroundMessage do sw.js. Isso mata a notificação DUPLICADA (antes
    // vinham 2: a auto do FCM + a do nosso handler). Título/corpo/ícone/link vão no data.
    const resp = await msg.sendEachForMulticast({
      tokens: u.tokens.map((t) => t.token),
      data: { title: TITULO, body: corpoU, icon: 'assets/icon-192.png', link: LINK }
    });
    sucesso += resp.successCount;
    falha += resp.failureCount;

    resp.responses.forEach((r, i) => {
      if (r.success) return;
      const code = (r.error && r.error.code) || 'desconhecido';
      console.log('Falhou uid=' + u.uid + ' code=' + code);
      if (code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-argument' ||
          code === 'messaging/invalid-registration-token') {
        remocoes.push(db.ref('push/' + u.uid + '/' + u.tokens[i].chave).remove());
      }
    });
  }

  console.log('Sucesso:', sucesso, '· Falha:', falha);
  await Promise.all(remocoes);
  if (remocoes.length) console.log('Tokens inválidos removidos:', remocoes.length);

  process.exit(0);
})().catch((e) => {
  console.error('Erro no envio:', e && e.message ? e.message : e);
  process.exit(1);
});
