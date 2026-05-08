import playwright from 'playwright';
import fs from 'fs';
import path from 'path';

const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 812;
const outputDir = path.join(process.cwd(), 'public', 'assets', 'telas');

const style = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body { background: #060b08; color: #ffffff; font-family: 'Barlow Condensed', sans-serif; overflow: hidden; }
    .screen { width: 100%; min-height: 100%; padding: 16px; display: flex; flex-direction: column; gap: 16px; background: radial-gradient(circle at top, rgba(245,200,0,0.08), transparent 40%), linear-gradient(180deg, #060b08 0%, #040a07 100%); }
    .topbar { display: flex; justify-content: space-between; align-items: center; }
    .switch { display: inline-flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 999px; border: 1px solid rgba(245,200,0,0.24); background: rgba(245,200,0,0.08); color: #f5c800; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .section-label { font-size: 11px; letter-spacing: 0.10em; text-transform: uppercase; color: #5a8a60; }
    .title-hero { font-family: 'Bebas Neue', sans-serif; font-size: 28px; text-transform: uppercase; color: #ffffff; letter-spacing: 0.02em; }
    .card { border-radius: 18px; background: linear-gradient(135deg, #0d2214 0%, #112a18 100%); border: 1px solid rgba(245,200,0,0.18); box-shadow: 0 0 32px rgba(245,200,0,0.1); padding: 18px; display: flex; flex-direction: column; gap: 12px; }
    .pill-button { padding: 16px 18px; border-radius: 999px; border: none; background: linear-gradient(135deg, #f5c800 0%, #efba30 100%); color: #060b08; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; box-shadow: 0 10px 28px rgba(245,200,0,0.35); cursor: pointer; }
    .pill-button.outline { background: transparent; border: 1px solid rgba(245,200,0,0.4); color: #f5c800; }
    .input-row { display: flex; flex-direction: column; gap: 10px; }
    .input-field { width: 100%; padding: 16px 18px; border-radius: 16px; border: 1px solid rgba(245,200,0,0.18); background: rgba(255,255,255,0.04); color: #ffffff; font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.02em; }
    .input-field::placeholder { color: rgba(255,255,255,0.4); }
    .horizontal-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .balance-card { padding: 18px; border-radius: 18px; background: linear-gradient(135deg, #0e2415 0%, #132b1c 100%); border: 1px solid rgba(245,200,0,0.18); box-shadow: 0 0 24px rgba(245,200,0,0.12); }
    .balance-label { font-size: 11px; color: #5a8a60; text-transform: uppercase; letter-spacing: 0.10em; }
    .balance-value { font-family: 'Bebas Neue', sans-serif; font-size: 36px; color: #f5c800; letter-spacing: 0.02em; }
    .divider { height: 1px; width: 100%; background: rgba(255,255,255,0.05); margin: 10px 0; }
    .list-card { display: flex; gap: 12px; align-items: center; padding: 14px; border-radius: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); }
    .avatar { width: 42px; height: 42px; border-radius: 50%; background: rgba(245,200,0,0.18); display: grid; place-items: center; color: #f5c800; font-weight: 800; }
    .list-content { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .list-title { font-size: 13px; color: #ffffff; font-weight: 700; letter-spacing: 0.04em; }
    .list-subtitle { font-size: 11px; color: #5a8a60; text-transform: uppercase; letter-spacing: 0.08em; }
    .hidden-chip { padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 0.08em; display: inline-flex; align-items: center; gap: 6px; }
    .footer-note { font-size: 11px; color: #5a8a60; text-align: center; letter-spacing: 0.08em; }
    .overlay { width: 100%; min-height: 100%; padding: 16px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 16px; background: rgba(6,11,8,0.96); }
    .overlay-card { width: 100%; max-width: 340px; border-radius: 24px; border: 1px solid rgba(245,200,0,0.22); background: rgba(13,34,20,0.96); box-shadow: 0 0 40px rgba(245,200,0,0.3); padding: 22px; display: flex; flex-direction: column; gap: 18px; align-items: center; }
    .overlay-title { font-family: 'Bebas Neue', sans-serif; font-size: 38px; color: #f5c800; text-transform: uppercase; letter-spacing: 0.02em; text-align: center; }
    .prize-photo { width: 120px; height: 120px; border-radius: 24px; border: 1px solid rgba(245,200,0,0.3); background: linear-gradient(135deg, rgba(245,200,0,0.12), rgba(255,255,255,0.08)); display: grid; place-items: center; box-shadow: 0 0 24px rgba(245,200,0,0.16); }
    .prize-photo span { font-size: 56px; color: #f5c800; }
    .winner-name { font-size: 16px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; text-align: center; }
    .winner-value { font-family: 'Bebas Neue', sans-serif; font-size: 32px; color: #f5c800; letter-spacing: 0.02em; }
    .big-count { flex: 1; display: grid; place-items: center; position: relative; }
    .big-count .number { font-family: 'Bebas Neue', sans-serif; font-size: 180px; color: #f5c800; line-height: 0.9; text-shadow: 0 0 40px rgba(245,200,0,0.35); }
    .big-count .go-text { position: absolute; bottom: 60px; font-size: 22px; text-transform: uppercase; letter-spacing: 0.12em; color: #ffffff; }
    .particle { position: absolute; width: 8px; height: 8px; border-radius: 50%; background: rgba(245,200,0,0.85); box-shadow: 0 0 12px rgba(245,200,0,0.4); }
    .nav { display: flex; justify-content: space-around; align-items: center; padding: 12px 0 8px; background: linear-gradient(180deg, rgba(10,26,14,0.82), #0a1a0e); border-top: 1px solid rgba(245,200,0,0.18); }
    .nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #5a8a60; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .nav-item.active { color: #f5c800; }
    .nav-icon { width: 28px; height: 28px; display: grid; place-items: center; font-size: 20px; }
    .logo { font-family: 'Bebas Neue', sans-serif; font-size: 38px; color: #f5c800; text-transform: uppercase; letter-spacing: 0.02em; text-align: center; }
    .subtitle { font-size: 13px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; text-align: center; line-height: 1.4; }
  </style>
`;

const screens = [
  {
    name: 'mercado-v1.png',
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Mercado de Lances</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">${style}</head><body><div class="screen"><div class="topbar"><div class="title">Mercado</div><div class="switch">⚡ Relâmpago | 🎫 Programado</div></div><div class="card"><div class="section-label">Tempo restante</div><div class="big-count"><div class="number">04:26</div><div class="go-text">Rodada ativa</div></div></div><div class="card"><div class="section-label">Seu lance</div><div class="input-row"><input class="input-field" placeholder="Ex: 5 = R$ 0,05" value=""/><button class="pill-button">Confirmar Lance</button></div></div><div class="card"><div class="section-label">Tabela de Lances</div><div class="list-card"><div class="avatar">A1</div><div class="list-content"><div class="list-title">0xAb...f123</div><div class="list-subtitle">Lance oculto</div></div><div class="hidden-chip">🔒</div></div><div class="list-card"><div class="avatar">B2</div><div class="list-content"><div class="list-title">0xCd...a456</div><div class="list-subtitle">Lance oculto</div></div><div class="hidden-chip">🔒</div></div><div class="list-card"><div class="avatar">C3</div><div class="list-content"><div class="list-title">0xEf...b789</div><div class="list-subtitle">Lance oculto</div></div><div class="hidden-chip">🔒</div></div></div><div class="nav"><div class="nav-item active"><div class="nav-icon">🏠</div>Início</div><div class="nav-item"><div class="nav-icon">🎯</div>Lances</div><div class="nav-item"><div class="nav-icon">👛</div>Carteira</div><div class="nav-item"><div class="nav-icon">⋯</div>Mais</div></div></div></body></html>`
  },
  {
    name: 'carteira-v1.png',
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Minha Carteira</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">${style}</head><body><div class="screen"><div class="topbar"><div class="title">Carteira</div><div class="switch">Saldo ativo</div></div><div class="horizontal-grid"><div class="balance-card"><div class="balance-label">Saldo Disponível</div><div class="balance-value">R$ 4.850</div></div><div class="balance-card"><div class="balance-label">Saldo de Senhas</div><div class="balance-value">8 Fichas</div></div></div><div class="card"><button class="pill-button">Comprar Fichas</button><button class="pill-button outline">Dar Lance Relâmpago</button></div><div class="card"><div class="section-label">Dados para Pagamento — PIX</div><div class="list-title">chavepix@desafiogut.com</div><div class="list-subtitle">Banco: GUT Bank • CNPJ 00.000.000/0001-00</div></div><div class="nav"><div class="nav-item active"><div class="nav-icon">🏠</div>Início</div><div class="nav-item"><div class="nav-icon">🎯</div>Lances</div><div class="nav-item"><div class="nav-icon">👛</div>Carteira</div><div class="nav-item"><div class="nav-icon">⋯</div>Mais</div></div></div></body></html>`
  },
  {
    name: 'vencedor-v1.png',
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Vencedor</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">${style}</head><body><div class="overlay"><div class="overlay-card"><div class="overlay-title">PARABÉNS!</div><div class="prize-photo"><span>🏆</span></div><div class="winner-name">Vencedor: 0xAb...f123</div><div class="winner-value">R$ 0,05</div><button class="pill-button">Nova Rodada</button></div><div class="footer-note">Transparência, Segurança e Confiança em cada lance!</div></div></body></html>`
  },
  {
    name: 'countdown-v1.png',
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Countdown</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">${style}</head><body><div class="screen" style="position: relative; overflow: hidden; justify-content: center; align-items: center;"><div class="particle" style="top: 18%; left: 16%; width: 10px; height: 10px;"></div><div class="particle" style="top: 28%; left: 72%; width: 8px; height: 8px;"></div><div class="particle" style="top: 64%; left: 24%; width: 12px; height: 12px;"></div><div class="particle" style="top: 54%; left: 60%; width: 8px; height: 8px;"></div><div class="big-count"><div class="number">3</div><div class="number" style="font-size: 120px; opacity: 0.45; position: absolute; top: 35%; left: 60%;">2</div><div class="number" style="font-size: 90px; opacity: 0.3; position: absolute; top: 55%; left: 68%;">1</div><div class="go-text">VAI! ⚡</div></div></div></body></html>`
  },
  {
    name: 'onboarding-v1.png',
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Onboarding</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">${style}</head><body><div class="screen" style="justify-content: center; align-items: center;"><div style="width: 100%; display: flex; flex-direction: column; gap: 20px; align-items: center; text-align: center;"><div class="logo">DesafioGUT</div><div class="subtitle">O Jogo do Menor Lance Único!</div><button class="pill-button">Entrar com Google</button><button class="pill-button outline">Entrar com Email</button><div class="footer-note">Transparência, Segurança e Confiança em cada lance!</div></div></div></body></html>`
  }
];

async function generateScreens() {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: MOBILE_WIDTH, height: MOBILE_HEIGHT }, deviceScaleFactor: 2 });
  try {
    for (const screen of screens) {
      await page.setContent(screen.html, { waitUntil: 'networkidle' });
      await page.screenshot({ path: path.join(outputDir, screen.name), fullPage: true });
      console.log(`Saved ${screen.name}`);
    }
  } finally {
    await browser.close();
  }
}

generateScreens();
