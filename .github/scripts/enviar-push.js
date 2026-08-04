/* Remetente de push — Bombeiro CTSP (Fase 4c)
   Roda no GitHub Actions. Lê os tokens em push/{uid}/{chave} do RTDB (via firebase-admin,
   com privilégio de admin → ignora as regras), dispara uma notificação via FCM HTTP v1 e
   REMOVE os tokens que o FCM reportar como não registrados (app desinstalado / token expirado).

   Segredo: FIREBASE_SERVICE_ACCOUNT = conteúdo JSON da conta de serviço (GitHub Secret).
   Nunca imprimir o segredo. databaseURL é público (já vive no index.html).

   Mensagem: PUSH_TITULO / PUSH_CORPO por env (inputs do workflow); há default.
   Próximo incremento: personalizar por "revisões vencidas" e pular quem tem 0. */

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

const TITULO = (process.env.PUSH_TITULO || '').trim() || 'Bombeiro CTSP';
const CORPO = (process.env.PUSH_CORPO || '').trim() || 'Hora de revisar — suas questões estão te esperando.';
const LINK = 'https://jhoonnvictor.github.io/ctsp-estudos/';

(async () => {
  const snap = await db.ref('push').get();
  const val = snap.val() || {};

  // push/{uid}/{chave} = {token, ts, ua}
  const alvos = [];
  for (const uid of Object.keys(val)) {
    const tokens = val[uid] || {};
    for (const chave of Object.keys(tokens)) {
      const t = tokens[chave] && tokens[chave].token;
      if (t) alvos.push({ uid, chave, token: t });
    }
  }

  if (!alvos.length) {
    console.log('Nenhum token registrado. Nada a enviar.');
    process.exit(0);
  }
  console.log('Tokens alvo:', alvos.length);

  const resp = await msg.sendEachForMulticast({
    tokens: alvos.map((a) => a.token),
    notification: { title: TITULO, body: CORPO },
    webpush: {
      notification: { icon: 'assets/icon-192.png', badge: 'assets/icon-192.png' },
      fcmOptions: { link: LINK }
    }
  });

  console.log('Sucesso:', resp.successCount, '· Falha:', resp.failureCount);

  // Limpeza de tokens mortos
  const remocoes = [];
  resp.responses.forEach((r, i) => {
    if (r.success) return;
    const code = (r.error && r.error.code) || 'desconhecido';
    console.log('Falhou uid=' + alvos[i].uid + ' code=' + code);
    if (code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-argument' ||
        code === 'messaging/invalid-registration-token') {
      remocoes.push(db.ref('push/' + alvos[i].uid + '/' + alvos[i].chave).remove());
    }
  });
  await Promise.all(remocoes);
  if (remocoes.length) console.log('Tokens inválidos removidos:', remocoes.length);

  process.exit(0);
})().catch((e) => {
  console.error('Erro no envio:', e && e.message ? e.message : e);
  process.exit(1);
});
