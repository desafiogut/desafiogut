import playwright from 'playwright';
import fs from 'fs';
import path from 'path';

const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 812;
const outputDir = path.join(process.cwd(), 'public', 'assets', 'telas', 'v2', 'com-guto');

const baseStyle = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body {
      width: ${MOBILE_WIDTH}px;
      height: ${MOBILE_HEIGHT}px;
      overflow: hidden;
      background: #000000;
      color: #e0e0e0;
      font-family: 'Barlow Condensed', sans-serif;
    }
    button, input { font-family: inherit; }
    .screen {
      width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 18px;
      background: linear-gradient(180deg, #000000 0%, #000010 50%, #001020 100%);
      position: relative;
    }
    .glass-card {
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
      border: 1px solid rgba(255,165,0,0.18);
      box-shadow: 0 0 30px rgba(255,165,0,0.12);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .headline {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12px;
    }
    .headline h1 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 28px;
      line-height: 1;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .headline .avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ffa500, #ff8c00);
      display: grid;
      place-items: center;
      color: #ffffff;
      font-size: 32px;
      flex-shrink: 0;
      box-shadow: 0 0 20px rgba(255,165,0,0.3);
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .kpi-card {
      border-radius: 20px;
      background: #001010;
      border: 1px solid rgba(255,165,0,0.18);
      padding: 16px;
      display: grid;
      gap: 10px;
      min-height: 120px;
      position: relative;
    }
    .kpi-icon { font-size: 24px; }
    .kpi-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #8c9f69;
    }
    .kpi-value {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 28px;
      line-height: 1;
      color: #ffa500;
    }
    .panel {
      border-radius: 24px;
      background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
      border: 1px solid rgba(255,165,0,0.18);
      padding: 18px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px 12px;
      border-radius: 999px;
      background: linear-gradient(135deg, #ffa500, #ff8c00);
      color: #000000;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .bottom-nav {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 4px;
      background: linear-gradient(180deg, rgba(0,16,32,0.8), #001020);
      border-top: 1px solid rgba(255,165,0,0.18);
      border-radius: 20px 20px 0 0;
    }
    .bottom-nav .item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: #8c9f69;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .bottom-nav .item.active {
      color: #ffa500;
    }
    .pill-button {
      border: none;
      border-radius: 999px;
      padding: 14px;
      background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%);
      color: #000000;
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      box-shadow: 0 10px 28px rgba(255,165,0,0.35);
      cursor: pointer;
    }
    .table-card {
      border-radius: 16px;
      border: 1px solid rgba(255,165,0,0.14);
      background: rgba(255,255,255,0.04);
      padding: 12px;
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .avatar-small {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255,165,0,0.16);
      color: #ffa500;
      display: grid;
      place-items: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .table-content { flex: 1; }
    .title {
      font-size: 12px;
      color: #ffffff;
      font-weight: 700;
    }
    .subtitle {
      font-size: 10px;
      color: #a7b07d;
    }
  </style>
`;

const gutoAvatar = '<div style="font-size: 32px;">🎨</div>';

const screens = [
  {
    name: 'dashboard-com-guto.png',
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body><div class="screen"><div class="headline"><h1>Olá! 👋</h1><div class="avatar">${gutoAvatar}</div></div><div class="kpi-grid"><div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-label">Saldo</div><div class="kpi-value">R$ 4.850</div></div><div class="kpi-card"><div class="kpi-icon">🎟️</div><div class="kpi-label">Senhas</div><div class="kpi-value">8</div></div><div class="kpi-card"><div class="kpi-icon">⚡</div><div class="kpi-label">Únicos</div><div class="kpi-value">13</div></div><div class="kpi-card"><div class="kpi-icon">📊</div><div class="kpi-label">Total</div><div class="kpi-value">127</div></div></div><div class="glass-card"><div style="display: flex; justify-content: space-between;"><h2 style="font-family: Bebas Neue; font-size: 20px; color: #fff; text-transform: uppercase;">Edição Ativa</h2><span class="badge">RELÂMPAGO</span></div><div style="font-size: 14px; color: #dcd78a;">⏱️ 02:47 até apuração</div></div><div class="bottom-nav"><div class="item active"><span style="font-size: 18px;">🏠</span>Início</div><div class="item"><span style="font-size: 18px;">🎯</span>Lances</div><div class="item"><span style="font-size: 18px;">👛</span>Carteira</div><div class="item"><span style="font-size: 18px;">⋯</span>Mais</div></div></body></html>`
  },
  {
    name: 'mercado-com-guto.png',
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body><div class="screen"><div class="headline"><h1>Mercado 🎯</h1><div class="avatar">${gutoAvatar}</div></div><div class="glass-card" style="gap: 16px;"><div style="font-family: Bebas Neue; font-size: 18px; color: #ffa500; text-transform: uppercase;">⚡ Relâmpago</div><div style="width: 200px; height: 200px; border-radius: 50%; background: conic-gradient(#1d8c2e 0deg 120deg, #ffa500 120deg 240deg, #e53935 240deg); margin: 0 auto; display: grid; place-items: center; box-shadow: 0 0 40px rgba(255,165,0,0.25);"><div style="width: 60%; height: 60%; border-radius: 50%; background: #000; border: 2px solid rgba(255,165,0,0.2); display: grid; place-items: center;"><div style="text-align: center;"><div style="font-size: 10px; color: #8c9f69; text-transform: uppercase;">Tempo</div><div style="font-family: Bebas Neue; font-size: 36px; color: #fff; margin-top: 4px;">04:26</div></div></div></div></div><div class="glass-card"><div style="font-size: 12px; color: #a7b07d; margin-bottom: 8px;">Seu Lance</div><input type="text" placeholder="Ex: 5 = R$ 0,05" style="width: 100%; border: 1px solid rgba(255,165,0,0.18); background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px; color: #fff; margin-bottom: 8px;"/><button class="pill-button">CONFIRMAR LANCE</button></div><div class="bottom-nav"><div class="item"><span style="font-size: 18px;">🏠</span>Início</div><div class="item active"><span style="font-size: 18px;">🎯</span>Lances</div><div class="item"><span style="font-size: 18px;">👛</span>Carteira</div><div class="item"><span style="font-size: 18px;">⋯</span>Mais</div></div></body></html>`
  },
  {
    name: 'carteira-com-guto.png',
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body><div class="screen"><div class="headline"><h1>Carteira 👛</h1><div class="avatar">${gutoAvatar}</div></div><div class="kpi-grid"><div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-label">Saldo R$</div><div class="kpi-value">R$ 4.850</div></div><div class="kpi-card"><div class="kpi-icon">🎟️</div><div class="kpi-label">Senhas</div><div class="kpi-value">8</div></div></div><div class="glass-card" style="gap: 10px;"><button class="pill-button">COMPRAR FICHAS</button><button class="pill-button" style="background: transparent; border: 1px solid rgba(255,165,0,0.25); color: #ffa500; box-shadow: none;">DAR LANCE</button></div><div class="glass-card"><div style="font-size: 12px; color: #a7b07d; margin-bottom: 8px;">Chave PIX</div><div style="font-family: Bebas Neue; font-size: 18px; color: #ffa500; margin-bottom: 12px;">chavepix@desafiogut.com</div><div style="font-size: 11px; line-height: 1.5; color: #c5cc9f;">Banco: GUT Bank • Ag: 0001 • CC: 123456-7</div></div><div class="bottom-nav"><div class="item"><span style="font-size: 18px;">🏠</span>Início</div><div class="item"><span style="font-size: 18px;">🎯</span>Lances</div><div class="item active"><span style="font-size: 18px;">👛</span>Carteira</div><div class="item"><span style="font-size: 18px;">⋯</span>Mais</div></div></body></html>`
  }
];

async function generateWithGuto() {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const browser = await playwright.chromium.launch();

  try {
    for (const screen of screens) {
      const page = await browser.newPage({
        viewport: { width: MOBILE_WIDTH, height: MOBILE_HEIGHT },
        deviceScaleFactor: 2
      });

      await page.setContent(screen.html, { waitUntil: 'networkidle' });
      await page.waitForTimeout(250);

      const filePath = path.join(outputDir, screen.name);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`✅ Saved ${screen.name}`);

      await page.close();
    }
    console.log(`\n🎉 Telas com GUTO integrado foram geradas com sucesso!`);
  } finally {
    await browser.close();
  }
}

generateWithGuto();