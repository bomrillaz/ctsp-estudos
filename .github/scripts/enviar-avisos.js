/* Dispara o push de verdade pros avisos da central de notificações — Prontidão · CBMRS (b103).
   Roda no GitHub Actions, agendado a cada ~5 min. Lê notificacoes/ via firebase-admin
   (ignora as regras), acha as que têm pushPendente:true, manda FCM pra todo usuário
   aprovado com token em push/{uid}, e vira pushPendente:false pra não reenviar.

   Não é instantâneo de propósito: o projeto decidiu não ter Cloud Function/webhook
   (CLAUDE.md), então o "tempo real" possível é o intervalo do cron.

   Segredo: FIREBASE_SERVICE_ACCOUNT (mesmo já usado por enviar-push.js). */

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
const LINK = 'https://bomrillaz.github.io/ctsp-estudos/';

(async () => {
  const [notifSnap, usuariosSnap, pushSnap] = await Promise.all([
    db.ref('notificacoes').get(),
    db.ref('usuarios').get(),
    db.ref('push').get()
  ]);

  const notifs = notifSnap.val() || {};
  const pendentes = Object.entries(notifs).filter(([, n]) => n && n.pushPendente === true);

  if (!pendentes.length) {
    console.log('Nenhum aviso pendente de push.');
    process.exit(0);
  }

  const usuarios = usuariosSnap.val() || {};
  const pushNode = pushSnap.val() || {};

  // Só quem está aprovado (mesmo critério da regra .read de `notificacoes`).
  const tokens = [];
  for (const uid of Object.keys(usuarios)) {
    if (!usuarios[uid] || usuarios[uid].aprovado !== true) continue;
    const noh = pushNode[uid];
    if (!noh) continue;
    for (const chave of Object.keys(noh)) {
      if (chave === '_agenda') continue;
      const t = noh[chave] && noh[chave].token;
      if (t) tokens.push({ uid, chave, token: t });
    }
  }

  console.log('Avisos pendentes:', pendentes.length, '· tokens alvo:', tokens.length);

  const remocoes = [];
  for (const [id, n] of pendentes) {
    if (tokens.length) {
      const resp = await msg.sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        data: { title: n.titulo || 'Prontidão', body: n.corpo || '', icon: 'assets/icon-192.png', link: LINK }
      });
      console.log('Aviso', id, '— sucesso:', resp.successCount, '· falha:', resp.failureCount);
      resp.responses.forEach((r, i) => {
        if (r.success) return;
        const code = (r.error && r.error.code) || 'desconhecido';
        if (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-argument' ||
            code === 'messaging/invalid-registration-token') {
          remocoes.push(db.ref('push/' + tokens[i].uid + '/' + tokens[i].chave).remove());
        }
      });
    } else {
      console.log('Aviso', id, '— sem token elegível, nada a enviar.');
    }
    await db.ref('notificacoes/' + id + '/pushPendente').set(false);
  }

  await Promise.all(remocoes);
  if (remocoes.length) console.log('Tokens inválidos removidos:', remocoes.length);
  process.exit(0);
})().catch((e) => {
  console.error('Erro:', e && e.message ? e.message : e);
  process.exit(1);
});
