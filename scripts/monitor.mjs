import CDP from 'chrome-remote-interface';
import fs from 'fs';

const logFile = 'C:/Users/Moltbot/Desktop/MC88.1-VALIDACAO.txt';
const log = (msg) => { console.log(msg); fs.appendFileSync(logFile, msg + '\n'); };
fs.writeFileSync(logFile, '=== MC88.1 VALIDAÇÃO ===\nInício: ' + new Date().toISOString() + '\n');

(async () => {
  try {
    const targets = await CDP.List({ port: 9333 });
    log('📋 Páginas disponíveis:');
    targets.forEach((t, i) => log(`  ${i}: ${t.title} - ${t.url}`));

    if (targets.length === 0) {
      log('❌ Nenhuma página. Tente chrome://inspect.');
      return;
    }

    const pageTarget = targets.find(t => t.type === 'page' && !t.url.includes('chrome-extension')) || targets[0];
    log(`🔗 Conectando à: ${pageTarget.title}`);

    const client = await CDP({ port: 9333, target: pageTarget });
    const { Runtime, Network, Page } = client;

    await Runtime.enable();
    await Network.enable();
    await Page.enable();

    Runtime.consoleAPICalled(({ type, args }) => {
      const msg = args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      log(`[console.${type}] ${msg}`);
      if (msg.includes('frame-ancestors') || msg.includes('auth.privy.io')) {
        log('⚠️ CSP ERROR: ' + msg);
      }
    });

    Network.responseReceived(({ response }) => {
      if (response.url.includes('auth.privy.io')) {
        log(`🌐 ${response.status} ${response.url}`);
        if (response.headers['content-security-policy']) {
          log(`🔒 CSP: ${response.headers['content-security-policy']}`);
        }
      }
    });

    await Page.navigate({ url: 'https://localhost' });
    log('✅ Monitor pronto. Faça login no dispositivo.');
  } catch (err) {
    console.error(err);
    log('❌ Erro: ' + err.message);
    log('💡 Tente: chrome://inspect no navegador.');
  }
})();
