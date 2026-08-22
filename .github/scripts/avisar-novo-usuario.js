/* Avisa o admin por push quando alguém se cadastra — Prontidão · CBMRS (b103).
   Roda no GitHub Actions, agendado. Lê usuarios/ via firebase-admin (ignora as regras),
   compara com o carimbo salvo em sistema/avisoNovoUsuario/ultimoTs e manda 1 push pro
   uid admin cobrindo TODOS os cadastros novos desde o último disparo (não 1 por usuário).

   b115: também mantém uidsConhecidos/ em dia (regra do RTDB v14 depende disso — ver
   materiais/entregas/planos/PLANO_correcao_seguranca.md, seção S1-fix+S2-fix).

   Segredo: FIREBASE_SERVICE_ACCOUNT (mesmo já usado por enviar-push.js).
   databaseURL é público (já vive no index.html). */

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

const ADMIN_UID = 'DyNxtutn1aaemZk8cbMtGOnM0iG3';
const CURSOR_REF = 'sistema/avisoNovoUsuario/ultimoTs';
const LINK = 'https://bomrillaz.github.io/ctsp-estudos/';

(async () => {
  const [usuariosSnap, cursorSnap, tokensSnap, uidsConhecidosSnap] = await Promise.all([
    db.ref('usuarios').get(),
    db.ref(CURSOR_REF).get(),
    db.ref('push/' + ADMIN_UID).get(),
    db.ref('uidsConhecidos').get()
  ]);

  const usuarios = usuariosSnap.val() || {};
  const ultimoTs = cursorSnap.val() || 0;
  const agora = Date.now();

  // b115 (correção S1/S2 do RTDB): marca "este UID já existiu" para a base INTEIRA, toda
  // execução. NUNCA usar a lista `novos` (filtrada pelo cursor) aqui — se usar, a marca
  // para de se renovar depois da carga inicial e o ataque de apagar-e-recriar o próprio
  // nó (que reabre o trial) volta a passar para qualquer conta fora da janela do cursor.
  const uidsConhecidos = uidsConhecidosSnap.val() || {};
  const todosUids = Object.keys(usuarios);
  const faltantes = todosUids.filter((uid) => !(uid in uidsConhecidos));
  if (faltantes.length) {
    const updates = {};
    for (const uid of faltantes) {
      const u = usuarios[uid];
      updates['uidsConhecidos/' + uid] = (u && typeof u.criadoEm === 'number') ? u.criadoEm : agora;
    }
    await db.ref().update(updates);
    console.log('uidsConhecidos: marcados', faltantes.length, 'novo(s) de', todosUids.length, 'usuario(s) total.');
  }
  // Asserção de contagem: se isto falhar, a fonte de todosUids virou algo filtrado (ex.:
  // a lista `novos`) e a marca deixou de cobrir a base inteira — aborta sem notificar.
  const marcadosAgora = todosUids.filter((uid) => uid in uidsConhecidos || faltantes.includes(uid)).length;
  if (marcadosAgora !== todosUids.length) {
    console.error(`uidsConhecidos inconsistente: ${marcadosAgora} marcado(s) != ${todosUids.length} usuario(s) total.`);
    process.exit(1);
  }

  const novos = Object.entries(usuarios)
    .filter(([uid, u]) => uid !== ADMIN_UID && u && typeof u.criadoEm === 'number' && u.criadoEm > ultimoTs)
    .sort((a, b) => a[1].criadoEm - b[1].criadoEm);

  if (!novos.length) {
    console.log('Nenhum cadastro novo desde', new Date(ultimoTs).toISOString());
    process.exit(0);
  }

  const nomes = novos.map(([, u]) => u.nome || u.email || 'usuário').slice(0, 5);
  const corpo = novos.length === 1
    ? nomes[0] + ' acabou de se cadastrar.'
    : novos.length + ' cadastros novos: ' + nomes.join(', ') + (novos.length > 5 ? '…' : '') + '.';

  const tokensNode = tokensSnap.val() || {};
  const tokens = Object.keys(tokensNode)
    .filter((k) => k !== '_agenda')
    .map((k) => tokensNode[k] && tokensNode[k].token)
    .filter(Boolean);

  if (!tokens.length) {
    console.log('Sem token de push do admin cadastrado — nada a enviar. Cadastros novos:', corpo);
  } else {
    const resp = await msg.sendEachForMulticast({
      tokens,
      data: { title: 'Prontidão · novo cadastro', body: corpo, icon: 'assets/icon-192.png', link: LINK }
    });
    console.log('Push admin — sucesso:', resp.successCount, '· falha:', resp.failureCount);
  }

  await db.ref(CURSOR_REF).set(agora);
  process.exit(0);
})().catch((e) => {
  console.error('Erro:', e && e.message ? e.message : e);
  process.exit(1);
});
