import WebSocket from 'ws';
import fs from 'fs';

const logFile = 'C:/Users/Moltbot/Desktop/MC88.21.2-CORPORATIVO.txt';
const log = (msg) => {
  const ts = new Date().toISOString();
  const linha = `[${ts}] ${msg}`;
  console.log(linha);
  fs.appendFileSync(logFile, linha + '\n');
};

fs.writeFileSync(logFile, '=== MC88.21.2 — PERFIL CORPORATIVO (DESAFIOGUT) ===\nInício: ' + new Date().toISOString() + '\n\n');
log('✅ Monitor ativo. Aguardando login com desafiogut@gmail.com');

(async () => {
  const targets = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const page = targets.find(t => t.type === 'page' && t.url.startsWith('https://localhost'));
  if (!page) { log('❌ Nenhuma página. Túnel ativo?'); process.exit(1); }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });

  const cmd = (method, params) => new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  ws.on('open', async () => {
    await cmd('Runtime.enable');
    await cmd('Network.enable');

    // Monitora requisições para /chatbot
    cmd('Network.setRequestInterception', { patterns: [{ urlPattern: '/.netlify/functions/chatbot' }] });

    // Aguarda 30 segundos para o operador fazer a pergunta
    log('🔹 Faça login com desafiogut@gmail.com, abra o GUTO e pergunte algo como:');
    log('   "Quantas senhas vendi esta semana?"');
    log('   O monitor vai capturar a resposta automaticamente.');
    log('');

    await new Promise(resolve => setTimeout(resolve, 30000));

    // Captura a última resposta do GUTO (via DOM ou Network)
    const result = await cmd('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.querySelector('.chat-resposta, [data-testid="chat-resposta"], .chat-message:last-child .message-text');
          return el ? el.innerText : 'não encontrado';
        })()
      `
    });
    const resposta = result.result?.value || 'não encontrado';
    log('📝 RESPOSTA DO GUTO:');
    log(resposta);

    // Verifica características do perfil corporativo
    const temEmoji = /[😊🎉🚀💡✨💰📊📈😅🤔👋👍]/g.test(resposta);
    const temPainel = /painel lojista/i.test(resposta);
    const temPitch = /bronze|prata|ouro|diamante/i.test(resposta);
    const temChave = /LLM_API_KEY|Netlify/i.test(resposta);
    const mencoesConta = (resposta.match(/conta/g) || []).length;

    log('');
    log('🔍 ANÁLISE:');
    log(`   Emojis: ${temEmoji ? '❌ SIM (deveria ser SEM)' : '✅ NÃO (correto)'}`);
    log(`   Painel Lojista: ${temPainel ? '✅ SIM' : '⚠️ NÃO (pode ser um problema)'}`);
    log(`   Pitch comercial: ${temPitch ? '❌ SIM (não deveria)' : '✅ NÃO (correto)'}`);
    log(`   LLM_API_KEY/Netlify: ${temChave ? '❌ SIM (não deveria)' : '✅ NÃO (correto)'}`);
    log(`   Menções a "conta": ${mencoesConta} ${mencoesConta > 1 ? '⚠️ DUPLICADO' : '✅ OK'}`);

    log('');
    log('✅ Diagnóstico concluído.');
    ws.close();
  });
})();
