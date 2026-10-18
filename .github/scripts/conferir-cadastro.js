/* Conferência do caminho de entrada de um aluno novo: cadastro → link de confirmação → e-mail confirmado (b273).
   Origem: de 27/09 a 18/10/2026 todo cadastro novo travou e ninguém viu — a chave de API recusava a
   página do link (ctsp-estudos.firebaseapp.com fora dos referenciadores) e o link dizia "expirou".

   Faz o que o aluno faz, pelos MESMOS domínios que o navegador dele usa:
     1. a chave aceita o site e a página do link (referenciador);
     2. cria conta descartável pelo signUp (Referer = site);
     3. gera o link de verificação (Admin SDK, não envia e-mail) e aplica o código como a página do link
        aplica (Referer = firebaseapp.com);
     4. confere emailVerified=true; 5. apaga a conta (sempre, no finally).
   A conta nunca ganha nó em usuarios/ — não dispara o aviso de "novo cadastro" nem entra no painel.
   A tela (cadastro → "Confirme seu e-mail") é coberta à parte por harness_b273_tela_bloqueio_visivel.js.

   Roda: agendado no GitHub Actions (conferir-cadastro.yml) e no verify_ctsp.sh quando há credencial local.
   Falhou → exit 1 (o GitHub manda e-mail) + push pro admin se ADMIN_UID estiver no ambiente.
   Credencial: FIREBASE_SERVICE_ACCOUNT (JSON, CI) ou FIREBASE_SERVICE_ACCOUNT_PATH (arquivo, local).
   Log de repo PÚBLICO: nunca imprimir e-mail/uid de aluno (aqui só existe a conta descartável). */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

const SITE = 'https://bomrillaz.github.io/ctsp-estudos/';
const PAGINA_LINK = 'https://ctsp-estudos.firebaseapp.com/';
const DB_URL = 'https://ctsp-estudos-default-rtdb.firebaseio.com';
const IDT = 'https://identitytoolkit.googleapis.com/v1/accounts:';

const cred = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'))
  : JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null');
if (!cred) { console.error('Credencial ausente (FIREBASE_SERVICE_ACCOUNT ou FIREBASE_SERVICE_ACCOUNT_PATH).'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(cred), databaseURL: DB_URL });

// A chave é a mesma que o site usa: lida do index.html do próprio checkout (já é pública).
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const API_KEY = (/apiKey\s*:\s*["'](AIza[^"']+)["']/.exec(html) || [])[1];

async function idt(metodo, corpo, referer) {
  const r = await fetch(IDT + metodo + '?key=' + API_KEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Referer: referer }, body: JSON.stringify(corpo)
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, j, msg: (j.error && j.error.message) || '' };
}

async function avisarAdmin(texto) {
  const uid = process.env.ADMIN_UID;
  if (!uid) return;
  try {
    const noh = (await admin.database().ref('push/' + uid).get()).val() || {};
    const tokens = Object.keys(noh).filter((k) => k !== '_agenda' && noh[k] && typeof noh[k].token === 'string').map((k) => noh[k].token);
    if (!tokens.length) return;
    await admin.messaging().sendEachForMulticast({ tokens, data: {
      title: '🚨 Prontidão · cadastro quebrado', body: texto, icon: 'assets/icon-192.png', link: SITE } });
  } catch (e) { console.log('Push ao admin falhou:', (e && e.code) || 'erro'); }
}

(async () => {
  const falhas = [];
  const passo = (nome, ok, det) => { console.log((ok ? '  ok   ' : '  FALHA ') + nome + (ok || !det ? '' : ' -> ' + det)); if (!ok) falhas.push(nome); return ok; };
  let uid = null;
  try {
    if (!passo('chave de API lida do index.html', !!API_KEY)) throw 0;
    for (const ref of [SITE, PAGINA_LINK]) {
      const r = await idt('update', { oobCode: 'conferencia-codigo-falso' }, ref);
      passo('chave aceita ' + new URL(ref).host, r.msg === 'INVALID_OOB_CODE', r.msg);
    }
    const email = 'conferencia-cadastro-' + Date.now() + '@bomrillaz.invalid';
    const s = await idt('signUp', { email, password: crypto.randomBytes(18).toString('base64url'), returnSecureToken: true }, SITE);
    uid = s.j.localId || null;
    if (!passo('cadastro pelo site', s.ok && !!uid, s.msg)) throw 0;
    const link = await admin.auth().generateEmailVerificationLink(email);
    const oob = new URL(link).searchParams.get('oobCode');
    if (!passo('link de confirmação gerado', !!oob)) throw 0;
    const a = await idt('update', { oobCode: oob }, PAGINA_LINK);
    passo('página do link confirma o e-mail', a.ok && a.j.emailVerified === true, a.msg);
    const u = await admin.auth().getUser(uid);
    passo('conta fica confirmada no Auth', u.emailVerified === true);
  } catch (e) {
    if (e !== 0) passo('execução', false, (e && e.message) || String(e));
  } finally {
    if (uid) {
      try { await admin.auth().deleteUser(uid); passo('conta descartável apagada', true); }
      catch (e) { passo('conta descartável apagada', false, e.message); }
    }
  }
  if (falhas.length) {
    console.log('\nCADASTRO QUEBRADO: ' + falhas.join('; '));
    await avisarAdmin('Conferência automática falhou: ' + falhas.join('; ') + '. Aluno novo pode não conseguir entrar.');
    process.exit(1);
  }
  console.log('\nOK: aluno novo consegue se cadastrar e confirmar o e-mail.');
  process.exit(0);
})();
