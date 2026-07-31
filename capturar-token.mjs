// Valida a sessão autenticada do Privy no WebView do APK, via CDP.
//
// MC88.8 — reescrito. A versão anterior dava FALSO NEGATIVO garantido:
//   · lia `sessionStorage.getItem("gut_auth_user")` — chave que a app NUNCA
//     escreve (sessionStorage só tem gut_admin_check, gut_consentimento e
//     sentryReplaySession). O Privy guarda a sessão em `privy:token` /
//     `privy:refresh_token`, no localStorage. Media a chave errada, portanto
//     reportava "token não encontrado" mesmo com o login concluído.
//   · usava chrome-remote-interface, que rebentava com "socket hang up" — a lib
//     resolve localhost para ::1 enquanto o `adb forward` escuta em 127.0.0.1.
//     Aqui: IPv4 explícito e node:http com headers mínimos (o fetch()/undici
//     acrescenta headers que o DevTools remoto do Android recusa).
//
// Túnel (o socket inclui o PID, que muda a cada arranque da app):
//   PID=$(adb shell pidof com.desafiogut.app)
//   adb forward tcp:9333 localabstract:webview_devtools_remote_$PID
//
// Nunca imprime o token — só estrutura, claims não-sensíveis e validade.
import http from 'node:http';

const PORTA = 9333;

const getJson = (path) =>
  new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: PORTA, path, agent: false, headers: { Accept: '*/*' } }, (res) => {
        let corpo = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (corpo += c));
        res.on('end', () => resolve(JSON.parse(corpo)));
      })
      .on('error', reject);
  });

let ws;
try {
  const alvos = await getJson('/json/list');
  const pagina = alvos.find((t) => t.type === 'page' && t.url.startsWith('https://localhost'));
  if (!pagina) {
    console.log('❌ Nenhuma página da app no túnel. A app está aberta e o forward aponta para o PID atual?');
    process.exit(1);
  }

  ws = new WebSocket(pagina.webSocketDebuggerUrl);
  let id = 0;
  const pendentes = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pendentes.has(msg.id)) {
      pendentes.get(msg.id)(msg.result?.result?.value ?? null);
      pendentes.delete(msg.id);
    }
  });
  const avaliar = (expression) =>
    new Promise((resolve) => {
      const msgId = ++id;
      pendentes.set(msgId, resolve);
      ws.send(JSON.stringify({
        id: msgId,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true },
      }));
    });
  await new Promise((r) => ws.addEventListener('open', r));

  const bruto = await avaliar(`(() => {
    const t = localStorage.getItem('privy:token');
    if (!t) return JSON.stringify({ presente: false });
    const limpo = t.replace(/^"|"$/g, '');
    const partes = limpo.split('.');
    if (partes.length !== 3) return JSON.stringify({ presente: true, jwt: false });
    const claims = JSON.parse(atob(partes[1].replace(/-/g, '+').replace(/_/g, '/')));
    return JSON.stringify({
      presente: true,
      jwt: true,
      emissor: claims.iss,
      audiencia: claims.aud,
      sujeito: String(claims.sub || '').slice(0, 14) + '…',
      expiraEm: new Date(claims.exp * 1000).toISOString(),
      valido: claims.exp * 1000 > Date.now(),
      temRefresh: !!localStorage.getItem('privy:refresh_token'),
    });
  })()`);

  const r = JSON.parse(bruto);
  if (!r.presente) {
    console.log('❌ Sem sessão Privy — o login não foi concluído nesta instância da app.');
    process.exit(1);
  }
  if (!r.jwt) {
    console.log('❌ privy:token presente mas não é um JWT de 3 partes.');
    process.exit(1);
  }
  console.log(r.valido ? '✅ Token JWT gerado e válido' : '⚠️  Token JWT presente mas EXPIRADO');
  console.log(`   emissor:   ${r.emissor}`);
  console.log(`   audiência: ${r.audiencia}`);
  console.log(`   sujeito:   ${r.sujeito}`);
  console.log(`   expira em: ${r.expiraEm}`);
  console.log(`   refresh:   ${r.temRefresh ? 'presente' : 'ausente'}`);
  process.exitCode = r.valido ? 0 : 1;
} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exitCode = 1;
} finally {
  ws?.close();
}
