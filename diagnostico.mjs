import CDP from "chrome-remote-interface";

(async () => {
  try {
    const targets = await CDP.List({ port: 9333 });
    if (targets.length === 0) {
      console.log("❌ Nenhuma página. Túnel ativo?");
      process.exit(1);
    }
    const wsUrl = targets[0].webSocketDebuggerUrl;
    const client = await CDP({ target: wsUrl });
    const { Runtime } = client;
    await Runtime.enable();

    // 1. Verifica se a configuração do Privy está exposta
    const config = await Runtime.evaluate({
      expression: 'window.__PRIVY_CONFIG__'
    });
    console.log("📋 __PRIVY_CONFIG__:", config.result.value);

    // 2. Verifica se há popup (opener)
    const opener = await Runtime.evaluate({
      expression: 'window.opener ? "popup" : "null"'
    });
    console.log("🪟 window.opener:", opener.result.value);

    // 3. URL atual
    const url = await Runtime.evaluate({
      expression: 'window.location.href'
    });
    console.log("📍 URL atual:", url.result.value);

    client.close();
  } catch (err) {
    console.error("❌ Erro:", err.message);
  }
})();
