import CDP from 'chrome-remote-interface';
import fs from 'fs';

const logFile = 'C:/Users/Moltbot/Desktop/MC88.5-DIAGNOSTICO.txt';
const log = (msg) => {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
};

// Limpa log anterior
fs.writeFileSync(logFile, '=== MC88.5 DIAGNÓSTICO ===\n' + new Date().toISOString() + '\n\n');

(async () => {
  try {
    // 1. Lista páginas
    const targets = await CDP.List({ port: 9333 });
    log('📋 Páginas disponíveis:');
    targets.forEach((t, i) => log(`  ${i}: ${t.title} - ${t.url}`));

    if (targets.length === 0) {
      log('❌ Nenhuma página. Túnel ativo?');
      process.exit(1);
    }

    // 2. Conecta à página principal
    const pageTarget = targets.find(t => t.type === 'page' && !t.url.includes('chrome-extension')) || targets[0];
    log(`🔗 Conectando a: ${pageTarget.title}`);
    const client = await CDP({ port: 9333, target: pageTarget });
    const { Runtime, Network, Page } = client;

    await Runtime.enable();
    await Network.enable();
    await Page.enable();

    log('✅ Protocolos ativados. Aguardando login...');
    log('');

    // 3. Captura logs de console
    Runtime.consoleAPICalled(({ type, args }) => {
      const msg = args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      log(`[${type}] ${msg}`);
      if (msg.includes('Deep link interceptado') || msg.includes('privy_oauth')) {
        log('🎯 **CAPTUROU DEEP LINK**');
      }
      if (msg.includes('Authentication failed')) {
        log('❌ **AUTHENTICATION FAILED**');
      }
    });

    // 4. Captura respostas de rede para a URL de redirect
    Network.responseReceived(({ response }) => {
      if (response.url.includes('redirect') || response.url.includes('privy_oauth')) {
        log(`🌐 ${response.status} ${response.url}`);
        if (response.headers) {
          log(`   Headers: ${JSON.stringify(response.headers, null, 2)}`);
        }
      }
      if (response.url.includes('auth.privy.io') && response.status !== 200) {
        log(`⚠️ Privy retornou ${response.status} para ${response.url}`);
      }
    });

    // 5. Aguarda 40 segundos para o login
    log('🔹 Aguardando 40 segundos para login...');
    await new Promise(resolve => setTimeout(resolve, 40000));

    // 6. Captura estado atual
    log('');
    log('📍 Estado atual:');
    const urlResult = await Runtime.evaluate({ expression: 'window.location.href' });
    log(`  URL: ${urlResult.result.value}`);

    const tokenResult = await Runtime.evaluate({ expression: 'sessionStorage.getItem("gut_auth_user")' });
    if (tokenResult.result.value) {
      log(`  Token: ✅ ${tokenResult.result.value.substring(0, 30)}...`);
    } else {
      log('  Token: ❌ null');
    }

    // 7. Captura erros no body
    const bodyResult = await Runtime.evaluate({ expression: 'document.body?.innerText || "sem body"' });
    const body = bodyResult.result.value;
    if (body.includes('Authentication failed') || body.includes('falha')) {
      log('  Body: ' + body.substring(0, 200));
    }

    log('');
    log('✅ Diagnóstico concluído.');
    client.close();

  } catch (err) {
    log('❌ Erro: ' + err.message);
    log('💡 Tente: chrome://inspect para diagnóstico manual.');
    console.error(err);
  }
})();
