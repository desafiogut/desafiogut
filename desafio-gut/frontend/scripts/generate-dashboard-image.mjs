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
  <title>DesafioGUT - Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: #060b08;
      color: #ffffff;
      font-family: 'Barlow Condensed', sans-serif;
      overflow: hidden;
      width: ${MOBILE_WIDTH}px;
      height: ${MOBILE_HEIGHT}px;
    }

    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #060b08 0%, #0a1a0e 50%, #060b08 100%);
    }

    /* HEADER */
    .header {
      padding: 16px;
      text-align: center;
      border-bottom: 1px solid rgba(245, 200, 0, 0.18);
    }

    .header h1 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 32px;
      font-weight: 400;
      letter-spacing: 0.02em;
      color: #ffffff;
      text-transform: uppercase;
    }

    /* CONTENT */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* KPI GRID 2x2 */
    .kpi-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .kpi-card {
      background: linear-gradient(135deg, #0d2214 0%, #112a18 100%);
      border: 1px solid rgba(245, 200, 0, 0.18);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      transition: all 0.3s ease;
      box-shadow: 0 0 20px rgba(245, 200, 0, 0.1);
    }

    .kpi-card:hover {
      border-color: rgba(245, 200, 0, 0.5);
      box-shadow: 0 0 30px rgba(245, 200, 0, 0.2);
    }

    .kpi-label {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.10em;
      color: #5a8a60;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .kpi-value {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 48px;
      font-weight: 400;
      letter-spacing: 0.01em;
      color: #f5c800;
      text-shadow: 0 0 20px rgba(245, 200, 0, 0.5);
      line-height: 1;
    }

    /* EDIÇÃO ATIVA CARD */
    .edicao-card {
      background: linear-gradient(135deg, #0d2214 0%, #163320 100%);
      border: 2px solid rgba(245, 200, 0, 0.30);
      border-radius: 16px;
      padding: 16px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 40px rgba(245, 200, 0, 0.25);
    }

    .edicao-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: linear-gradient(135deg, #f57c00 0%, #f5a623 100%);
      color: #060b08;
      padding: 6px 12px;
      border-radius: 20px;
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      box-shadow: 0 4px 12px rgba(245, 166, 35, 0.4);
    }

    .edicao-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 28px;
      font-weight: 400;
      letter-spacing: 0.02em;
      color: #ffffff;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .edicao-status {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.10em;
      color: #00c853;
      text-transform: uppercase;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background: #00c853;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .timer {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 42px;
      font-weight: 400;
      letter-spacing: 0.01em;
      color: #e53935;
      text-shadow: 0 0 20px rgba(229, 57, 53, 0.6);
      line-height: 1;
      margin-bottom: 12px;
      font-variant-numeric: tabular-nums;
    }

    .timer-label {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.10em;
      color: #5a8a60;
      text-transform: uppercase;
    }

    /* BOTÃO LANCE ÚNICO */
    .lance-button {
      background: linear-gradient(135deg, #f5c800 0%, #efba30 100%);
      color: #060b08;
      border: none;
      border-radius: 50px;
      padding: 16px 24px;
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(245, 200, 0, 0.4);
      transition: all 0.3s ease;
      font-weight: bold;
      width: 100%;
      margin-top: 12px;
    }

    .lance-button:hover {
      background: linear-gradient(135deg, #ffd700 0%, #f5c800 100%);
      box-shadow: 0 12px 32px rgba(245, 200, 0, 0.6);
      transform: translateY(-2px);
    }

    /* NAVBAR INFERIOR */
    .navbar {
      background: linear-gradient(180deg, rgba(10, 26, 14, 0.8) 0%, #0a1a0e 100%);
      border-top: 1px solid rgba(245, 200, 0, 0.18);
      display: flex;
      justify-content: space-around;
      align-items: center;
      height: 64px;
      padding-bottom: 8px;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
      color: #5a8a60;
    }

    .nav-item.active {
      color: #f5c800;
    }

    .nav-icon {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .nav-label {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <h1>GUT</h1>
    </div>

    <!-- CONTENT -->
    <div class="content">
      <!-- KPI GRID -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Saldo</div>
          <div class="kpi-value">R$ 4.850</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Senhas</div>
          <div class="kpi-value">8</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Lances Únicos</div>
          <div class="kpi-value">13</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total de Lances</div>
          <div class="kpi-value">127</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="grid-column: span 2;">
          <div class="kpi-label">Menor Lance Único</div>
          <div class="kpi-value">R$ 0,05</div>
        </div>
      </div>

      <!-- EDIÇÃO ATIVA -->
      <div class="edicao-card">
        <div class="edicao-badge">⚡ RELAMPAGO</div>
        <div class="edicao-title">Edição R-1</div>
        <div class="edicao-status">
          <div class="status-dot"></div>
          ATIVA AGORA
        </div>
        <div class="timer">02:47:33</div>
        <div class="timer-label">Tempo Restante</div>
        <button class="lance-button">Ir para o Mercado de Lances</button>
      </div>
    </div>

    <!-- NAVBAR -->
    <div class="navbar">
      <div class="nav-item active">
        <div class="nav-icon">🏠</div>
        <div class="nav-label">Início</div>
      </div>
      <div class="nav-item">
        <div class="nav-icon">🎯</div>
        <div class="nav-label">Lances</div>
      </div>
      <div class="nav-item">
        <div class="nav-icon">👛</div>
        <div class="nav-label">Carteira</div>
      </div>
      <div class="nav-item">
        <div class="nav-icon">⋯</div>
        <div class="nav-label">Mais</div>
      </div>
    </div>
  </div>
</body>
</html>
`;

async function generateDashboardImage() {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({
    viewport: { width: MOBILE_WIDTH, height: MOBILE_HEIGHT },
    deviceScaleFactor: 2,
  });

  // Criar diretório se não existir
  const outputDir = path.join(process.cwd(), 'public', 'assets', 'telas');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'dashboard-v2.png');

  try {
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    await page.screenshot({ path: outputPath, fullPage: true });
    console.log(`✅ Dashboard image saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating dashboard image:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

generateDashboardImage();
