import playwright from 'playwright';
import fs from 'fs';
import path from 'path';

const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 812;

const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DesafioGUT - Mercado de Lances</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #060b08;
      color: #ffffff;
      font-family: 'Barlow Condensed', sans-serif;
      width: ${MOBILE_WIDTH}px;
      height: ${MOBILE_HEIGHT}px;
      overflow: hidden;
    }
    .screen {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: linear-gradient(180deg, #060b08 0%, #0a1a0e 100%);
    }
    .topbar {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(245,200,0,0.18);
    }
    .topbar .title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 24px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(245,200,0,0.12);
      border: 1px solid rgba(245,200,0,0.25);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #f5c800;
    }
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .card {
      background: linear-gradient(135deg, #0d2214 0%, #112a18 100%);
      border: 1px solid rgba(245,200,0,0.18);
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 0 30px rgba(245,200,0,0.12);
    }
    .section-label {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.10em;
      text-transform: uppercase;
      color: #5a8a60;
      margin-bottom: 10px;
    }
    .circle-timer {
      width: 240px;
      height: 240px;
      margin: 0 auto 10px;
      position: relative;
    }
    .circle-timer .ring {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: conic-gradient(
        #1d8c2e 0deg 140deg,
        #f5a623 140deg 260deg,
        #e53935 260deg 360deg
      );
      display: grid;
      place-items: center;
      box-shadow: 0 0 40px rgba(245,200,0,0.18);
    }
    .circle-timer .inner {
      width: 72%;
      height: 72%;
      border-radius: 50%;
      background: #060b08;
      border: 2px solid rgba(245,200,0,0.18);
      display: grid;
      place-items: center;
      padding: 18px;
      text-align: center;
    }
    .circle-timer .inner .label {
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #5a8a60;
      margin-bottom: 8px;
    }
    .circle-timer .inner .value {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 44px;
      color: #ffffff;
      letter-spacing: 0.02em;
      line-height: 1;
    }
    .bid-input {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-top: 10px;
    }
    .bid-input input {
      flex: 1;
      padding: 16px 18px;
      border-radius: 16px;
      border: 1px solid rgba(245,200,0,0.18);
      background: rgba(255,255,255,0.04);
      color: #ffffff;
      font-family: 'Bebas Neue', sans-serif;
      font-size: 26px;
      letter-spacing: 0.02em;
    }
    .bid-input input::placeholder {
      color: rgba(255,255,255,0.4);
    }
    .pill-button {
      padding: 16px 18px;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, #f5c800 0%, #efba30 100%);
      color: #060b08;
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      box-shadow: 0 8px 24px rgba(245,200,0,0.35);
      cursor: pointer;
      flex-shrink: 0;
    }
    .bid-input small {
      display: block;
      margin-top: 8px;
      font-size: 11px;
      color: #5a8a60;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .table {
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid rgba(245,200,0,0.18);
      background: rgba(255,255,255,0.03);
    }
    .table-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .table-row:last-child { border-bottom: none; }
    .table-row .row-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .table-row .row-title span {
      font-size: 12px;
      color: #d4ecd8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .table-row .row-title strong {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 20px;
      color: #ffffff;
      letter-spacing: 0.01em;
    }
    .table-row .row-value {
      font-size: 14px;
      color: #5a8a60;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .hidden-value {
      width: 90px;
      height: 24px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.3);
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .bottom-nav {
      background: linear-gradient(180deg, rgba(10,26,14,0.8) 0%, #0a1a0e 100%);
      border-top: 1px solid rgba(245,200,0,0.18);
      display: flex;
      justify-content: space-around;
      align-items: center;
      height: 64px;
      padding-bottom: 8px;
    }
    .bottom-nav .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: #5a8a60;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .bottom-nav .nav-item.active { color: #f5c800; }
    .bottom-nav .icon {
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      font-size: 20px;
    }
  </style>
</head>
<body>
  <div class="screen">
    <div class="topbar">
      <div class="title">Mercado</div>
      <div class="toggle">FLASH PROGRAMADO</div>
    </div>

    <div class="content">
      <div class="card">
        <div class="section-label">Rodada em curso</div>
        <div class="circle-timer">
          <div class="ring">
            <div class="inner">
              <div class="label">Tempo</div>
              <div class="value">01:23</div>
            </div>
          </div>
        </div>
        <div class="bid-input">
          <input type="text" placeholder="Valor em centavos" value="005" />
          <button class="pill-button">Confirmar Lance</button>
        </div>
        <small>Digite seu lance em centavos e confirme antes do próximo flash.</small>
      </div>

      <div class="card">
        <div class="section-label">Tabela de Lances</div>
        <div class="table">
          <div class="table-row">
            <div class="row-title"><span>Jogador 1</span><strong>••••</strong></div>
            <div class="row-value hidden-value">Oculto</div>
          </div>
          <div class="table-row">
            <div class="row-title"><span>Jogador 2</span><strong>••••</strong></div>
            <div class="row-value hidden-value">Oculto</div>
          </div>
          <div class="table-row">
            <div class="row-title"><span>Jogador 3</span><strong>••••</strong></div>
            <div class="row-value hidden-value">Oculto</div>
          </div>
          <div class="table-row">
            <div class="row-title"><span>Jogador 4</span><strong>••••</strong></div>
            <div class="row-value hidden-value">Oculto</div>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-nav">
      <div class="nav-item active"><div class="icon">🏠</div>Início</div>
      <div class="nav-item"><div class="icon">🎯</div>Lances</div>
      <div class="nav-item"><div class="icon">👛</div>Carteira</div>
      <div class="nav-item"><div class="icon">⋯</div>Mais</div>
    </div>
  </div>
</body>
</html>
`;

async function generateMercadoImage() {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({
    viewport: { width: MOBILE_WIDTH, height: MOBILE_HEIGHT },
    deviceScaleFactor: 2,
  });

  const outputDir = path.join(process.cwd(), 'public', 'assets', 'telas');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'mercado-v1.png');

  try {
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    await page.screenshot({ path: outputPath, fullPage: true });
    console.log(`✅ Mercado image saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating mercado image:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

generateMercadoImage();
