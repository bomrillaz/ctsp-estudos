/* Avisa o admin por push quando alguém se cadastra — Prontidão · CBMRS (b103).
   Roda no GitHub Actions, agendado. Lê usuarios/ via firebase-admin (ignora as regras),
   compara com o carimbo salvo em sistema/avisoNovoUsuario/ultimoTs e manda 1 push pro
   uid admin cobrindo TODOS os cadastros novos desde o último disparo (não 1 por usuário).

   b115: também mantém uidsConhecidos/ em dia (regra do RTDB v14 depende disso — ver
   materiais/entregas/planos/PLANO_correcao_seguranca.md, seção S1-fix+S2-fix).

   b116/etapa2 (S6): também avisa o admin 3 dias antes de cada `cob.prox` vencer — a rede
   de proteção do portão que agora expira sozinho na regra do RTDB (carência de 3 dias).
   NÃO é o portão: se este aviso falhar ou não rodar, o acesso cai do mesmo jeito quando a
   carência esgotar. Idempotente por `sistema/avisoVencimento/<uid>` = o `cob.prox` já
   avisado — se a pessoa renovar, o `prox` muda e o aviso pode disparar de novo no ciclo
   seguinte. Só olha planos pagos (`cob.prox`); trial não tem esse campo e não é avisado
   aqui (o "novo cadastro" já avisa o início do prazo).

   b117: gatilho pra reabrir a decisão de bot-protection (ver
   decisoes/recaptcha-nao-implementado-agora-falta-backend.md) — LIMIAR_CADASTRO_MASSA
   cadastros novos NUMA SÓ EXECUÇÃO (janela de ~20min, o cron deste workflow) já foge do
   padrão orgânico do projeto (poucos usuários reais, crescimento é por indicação). Não
   bloqueia nada sozinho — só marca o push pro admin com 🚨 pra ele decidir se revisita a
   decisão. Não cobre "spam" qualitativo (conta de aparência falsa mas cadastro isolado) —
   esse sinal continua dependendo do João notar no painel.

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
const VENC_MARCAS_REF = 'sistema/avisoVencimento';
const VENC_JANELA_MS = 3 * 86400000; // mesma carência de 3 dias da regra do RTDB (S6)
const LINK = 'https://bomrillaz.github.io/ctsp-estudos/';
const LIMIAR_CADASTRO_MASSA = 3; // b117: gatilho do bot-protection, ver comentário no topo

(async () => {
  const [usuariosSnap, cursorSnap, tokensSnap, uidsConhecidosSnap, vencMarcasSnap] = await Promise.all([
    db.ref('usuarios').get(),
    db.ref(CURSOR_REF).get(),
    db.ref('push/' + ADMIN_UID).get(),
    db.ref('uidsConhecidos').get(),
    db.ref(VENC_MARCAS_REF).get()
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

  // b116/etapa2: quem tem `cob.prox` dentro da janela de 3 dias e ainda não foi avisado
  // PARA ESSE `prox` exato. Marcar por valor de `prox` (não só por uid) é o que permite
  // avisar de novo depois de uma renovação, sem precisar limpar a marca na mão.
  const vencMarcas = vencMarcasSnap.val() || {};
  const vencendo = Object.entries(usuarios).filter(([uid, u]) => {
    const prox = u && u.cob && u.cob.prox;
    if (typeof prox !== 'number') return false;
    const faltam = prox - agora;
    if (faltam < 0 || faltam > VENC_JANELA_MS) return false;
    return vencMarcas[uid] !== prox;
  });

  if (!novos.length && !vencendo.length) {
    console.log('Nenhum cadastro novo nem vencimento próximo desde', new Date(ultimoTs).toISOString());
    process.exit(0);
  }

  const tokensNode = tokensSnap.val() || {};
  const tokens = Object.keys(tokensNode)
    .filter((k) => k !== '_agenda')
    .map((k) => tokensNode[k] && tokensNode[k].token)
    .filter(Boolean);

  if (novos.length) {
    const nomes = novos.map(([, u]) => u.nome || u.email || 'usuário').slice(0, 5);
    const massa = novos.length >= LIMIAR_CADASTRO_MASSA;
    const corpo = (novos.length === 1
      ? nomes[0] + ' acabou de se cadastrar.'
      : novos.length + ' cadastros novos: ' + nomes.join(', ') + (novos.length > 5 ? '…' : '') + '.')
      + (massa ? ' 🚨 Volume fora do padrão — reavaliar bot-protection?' : '');
    const titulo = massa ? '🚨 Prontidão · possível cadastro em massa' : 'Prontidão · novo cadastro';
    if (massa) console.log('ALERTA cadastro em massa:', novos.length, 'cadastros numa só execução (limiar', LIMIAR_CADASTRO_MASSA + ').');
    if (!tokens.length) {
      console.log('Sem token de push do admin cadastrado — nada a enviar. Cadastros novos:', corpo);
    } else {
      const resp = await msg.sendEachForMulticast({
        tokens,
        data: { title: titulo, body: corpo, icon: 'assets/icon-192.png', link: LINK }
      });
      console.log('Push admin (cadastro) — sucesso:', resp.successCount, '· falha:', resp.failureCount);
    }
  }

  if (vencendo.length) {
    const nomesVenc = vencendo.map(([, u]) => u.nome || u.email || 'usuário').slice(0, 5);
    const corpoVenc = vencendo.length === 1
      ? nomesVenc[0] + ' vence em até 3 dias.'
      : vencendo.length + ' vencendo em até 3 dias: ' + nomesVenc.join(', ') + (vencendo.length > 5 ? '…' : '') + '.';
    if (!tokens.length) {
      console.log('Sem token de push do admin cadastrado — nada a enviar. Vencendo:', corpoVenc);
    } else {
      const resp = await msg.sendEachForMulticast({
        tokens,
        data: { title: 'Prontidão · vencimento próximo', body: corpoVenc, icon: 'assets/icon-192.png', link: LINK }
      });
      console.log('Push admin (vencimento) — sucesso:', resp.successCount, '· falha:', resp.failureCount);
    }
  }

  const updates = {};
  if (novos.length) updates[CURSOR_REF] = agora;
  vencendo.forEach(([uid, u]) => { updates[VENC_MARCAS_REF + '/' + uid] = u.cob.prox; });
  if (Object.keys(updates).length) await db.ref().update(updates);

  process.exit(0);
})().catch((e) => {
  console.error('Erro:', e && e.message ? e.message : e);
  process.exit(1);
});
