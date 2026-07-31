import CDP from 'chrome-remote-interface';
import fs from 'fs';

const logFile = 'C:/Users/Moltbot/Desktop/MC88.1-ERRO.txt';
fs.writeFileSync(logFile, '=== DIAGNÓSTICO LOGIN ===\n' + new Date().toISOString() + '\n');

(async () => {
  try {
    fs.appendFileSync(logFile, '1. Tentando conectar ao DevTools...\n');
    const targets = await CDP.List({ port: 9333 });
    fs.appendFileSync(logFile, '2. Páginas encontradas: ' + targets.length + '\n');
    if (targets.length === 0) {
      fs.appendFileSync(logFile, '❌ Nenhuma página. Túnel pode estar inativo.\n');
      process.exit(1);
    }
    const wsUrl = targets[0].webSocketDebuggerUrl;
    fs.appendFileSync(logFile, '3. WebSocket URL: ' + wsUrl + '\n');
    const client = await CDP({ target: wsUrl });
    const { Runtime, Network, Page } = client;
    await Runtime.enable();
    await Network.enable();
    await Page.enable();
    fs.appendFileSync(logFile, '4. Protocolos ativados.\n');

    Runtime.consoleAPICalled(({ type, args }) => {
      const msg = args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      fs.appendFileSync(logFile, `[${type}] ${msg}\n`);
    });

    Network.responseReceived(({ response }) => {
      if (response.url.includes('auth.privy.io') || response.url.includes('localhost')) {
        fs.appendFileSync(logFile, `🌐 ${response.status} ${response.url}\n`);
      }
    });

    fs.appendFileSync(logFile, '5. Monitorando por 30 segundos. Faça login.\n');
    await new Promise(resolve => setTimeout(resolve, 30000));

    const { result } = await Runtime.evaluate({ expression: 'window.location.href' });
    fs.appendFileSync(logFile, '📍 URL atual: ' + result.value + '\n');

    const tokenResult = await Runtime.evaluate({ expression: 'sessionStorage.getItem("gut_auth_user")' });
    fs.appendFileSync(logFile, tokenResult.value ? '✅ Token JWT gerado' : '❌ Token não encontrado');
    client.close();
    fs.appendFileSync(logFile, '\n✅ Diagnóstico concluído.');
    console.log('✅ Log salvo em ' + logFile);
  } catch (err) {
    fs.appendFileSync(logFile, '❌ ERRO: ' + err.message + '\n');
    console.error('❌ Erro:', err.message);
  }
})();
