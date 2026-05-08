import playwright from 'playwright';
import fs from 'fs';
import path from 'path';

const outputDir = path.join(process.cwd(), 'public', 'assets', 'guto');

const baseStyle = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'Bebas Neue', 'Barlow Condensed', sans-serif;
    }
  </style>
`;

const gutoSVG = `
  <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
    <!-- Corpo principal -->
    <ellipse cx="100" cy="120" rx="60" ry="80" fill="#ffa500" opacity="0.95"/>
    
    <!-- Detalhes laterais -->
    <circle cx="55" cy="100" r="12" fill="#ff8c00"/>
    <circle cx="145" cy="100" r="12" fill="#ff8c00"/>
    
    <!-- Cabeça -->
    <circle cx="100" cy="50" r="45" fill="#ffa500"/>
    
    <!-- Olhos -->
    <circle cx="85" cy="40" r="8" fill="#000000"/>
    <circle cx="115" cy="40" r="8" fill="#000000"/>
    <circle cx="86" cy="38" r="3" fill="#ffffff"/>
    <circle cx="116" cy="38" r="3" fill="#ffffff"/>
    
    <!-- Boca -->
    <path d="M 95 55 Q 100 60 105 55" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round"/>
    
    <!-- Nariz -->
    <circle cx="100" cy="50" r="4" fill="#ff8c00"/>
    
    <!-- Pés -->
    <ellipse cx="75" cy="195" rx="15" ry="20" fill="#ff8c00"/>
    <ellipse cx="125" cy="195" rx="15" ry="20" fill="#ff8c00"/>
    
    <!-- Braços -->
    <g id="left-arm">
      <rect x="30" y="90" width="25" height="18" rx="9" fill="#ffa500"/>
      <circle cx="28" cy="99" r="11" fill="#ff8c00"/>
    </g>
    <g id="right-arm">
      <rect x="145" y="90" width="25" height="18" rx="9" fill="#ffa500"/>
      <circle cx="172" cy="99" r="11" fill="#ff8c00"/>
    </g>
  </svg>
`;

const variations = [
  {
    name: 'guto-logo.png',
    width: 400,
    height: 300,
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GUTO Logo</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body style="width: 400px; height: 300px; background: linear-gradient(180deg, #000000 0%, #001020 100%); flex-direction: column; gap: 12px; padding: 20px;"><div style="flex: 1; display: flex; justify-content: center; align-items: center; width: 100%;">${gutoSVG}</div><div style="text-align: center; width: 100%;"><div style="font-family: 'Bebas Neue', sans-serif; font-size: 36px; color: #ffa500; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 900; text-shadow: 0 0 20px rgba(255,165,0,0.5);">DesafioGUT</div><div style="font-family: 'Barlow Condensed', sans-serif; font-size: 12px; color: #a7b07d; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 4px;">O Jogo do Menor Lance</div></div></body></html>`
  },
  {
    name: 'guto-avatar.png',
    width: 220,
    height: 220,
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GUTO Avatar</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">${baseStyle}</head><body style="width: 220px; height: 220px; background: radial-gradient(circle at center, rgba(255,165,0,0.08), transparent); border-radius: 50%; border: 2px solid rgba(255,165,0,0.25); overflow: hidden;"><div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%); clip-path: circle(50%);"><svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" width="140" height="160" style="filter: brightness(1.15) drop-shadow(0 4px 12px rgba(0,0,0,0.3));"><ellipse cx="100" cy="120" rx="60" ry="80" fill="#ffffff" opacity="0.9"/><circle cx="100" cy="50" r="45" fill="#ffffff"/><circle cx="85" cy="40" r="8" fill="#ff8c00"/><circle cx="115" cy="40" r="8" fill="#ff8c00"/><circle cx="86" cy="38" r="3" fill="#ffffff"/><circle cx="116" cy="38" r="3" fill="#ffffff"/><path d="M 95 55 Q 100 60 105 55" stroke="#ff8c00" stroke-width="2" fill="none"/><circle cx="75" cy="195" rx="15" ry="20" fill="#ffffff"/><circle cx="125" cy="195" rx="15" ry="20" fill="#ffffff"/></svg></div></body></html>`
  },
  {
    name: 'guto-icon-animated.png',
    width: 120,
    height: 120,
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GUTO Icon</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet"><style>@keyframes bounce { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-8px) scale(1.05); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } } body { width: 120px; height: 120px; background: linear-gradient(135deg, rgba(255,165,0,0.12), rgba(0,16,32,0.8)); display: flex; justify-content: center; align-items: center; border-radius: 30px; border: 1px solid rgba(255,165,0,0.25); overflow: hidden; margin: 0; padding: 0; animation: pulse 2.5s ease-in-out infinite; } svg { width: 80px; height: 100px; animation: bounce 1.8s ease-in-out infinite; filter: drop-shadow(0 4px 8px rgba(255,165,0,0.3)); } </style></head><body><svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg"><ellipse cx="100" cy="120" rx="60" ry="80" fill="#ffa500"/><circle cx="100" cy="50" r="45" fill="#ffa500"/><circle cx="85" cy="40" r="8" fill="#000000"/><circle cx="115" cy="40" r="8" fill="#000000"/><circle cx="86" cy="38" r="3" fill="#ffffff"/><circle cx="116" cy="38" r="3" fill="#ffffff"/><path d="M 95 55 Q 100 60 105 55" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round"/></svg></body></html>`
  },
  {
    name: 'guto-celebrando.png',
    width: 380,
    height: 420,
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GUTO Celebrando</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;700;800&display=swap" rel="stylesheet"><style>@keyframes float-up { 0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(-120px) translateX(20px) rotate(360deg); opacity: 0; } } @keyframes wave { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-20deg); } 75% { transform: rotate(20deg); } } @keyframes spin-slow { 0%, 100% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } body { width: 380px; height: 420px; background: linear-gradient(180deg, #000000 0%, #001020 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; margin: 0; overflow: hidden; position: relative; } .confetti { position: absolute; pointer-events: none; } .confetti-piece { position: absolute; width: 12px; height: 18px; background: linear-gradient(45deg, #ffa500, #ff8c00); border-radius: 3px; animation: float-up 2.2s ease-in forwards; box-shadow: 0 0 12px rgba(255,165,0,0.6); } .guto-container { display: flex; justify-content: center; align-items: center; position: relative; z-index: 5; margin-bottom: 20px; } .guto-container svg { width: 200px; height: 240px; filter: drop-shadow(0 8px 24px rgba(255,165,0,0.35)); } #left-arm { animation: wave 0.8s ease-in-out infinite; transform-origin: 42px 99px; } #right-arm { animation: wave 0.8s ease-in-out infinite reverse; transform-origin: 158px 99px; } .celebration-text { font-family: 'Bebas Neue', sans-serif; font-size: 42px; color: #ffa500; text-transform: uppercase; text-align: center; letter-spacing: 0.04em; text-shadow: 0 0 30px rgba(255,165,0,0.5); line-height: 1; margin-bottom: 12px; animation: spin-slow 3s linear infinite; } .sub-text { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; color: #a7b07d; text-transform: uppercase; letter-spacing: 0.14em; text-align: center; } </style></head><body><div class="confetti" id="confetti-container"></div><div class="guto-container">${gutoSVG}</div><div class="celebration-text">PARABÉNS!</div><div class="sub-text">Você é o vencedor! 🏆</div><script>const container = document.getElementById('confetti-container'); for (let i = 0; i < 18; i++) { const piece = document.createElement('div'); piece.className = 'confetti-piece'; piece.style.left = Math.random() * 340 + 20 + 'px'; piece.style.top = 200 + 'px'; piece.style.animationDelay = (i * 0.12) + 's'; piece.style.background = i % 3 === 0 ? 'linear-gradient(45deg, #ffa500, #ff8c00)' : i % 3 === 1 ? 'linear-gradient(45deg, #ff8c00, #ff6b00)' : 'linear-gradient(45deg, #ffb700, #ffa500)'; container.appendChild(piece); }</script></body></html>`
  }
];

async function generateVariations() {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const browser = await playwright.chromium.launch();

  try {
    for (const variation of variations) {
      const page = await browser.newPage({
        viewport: { width: variation.width, height: variation.height },
        deviceScaleFactor: 2
      });

      await page.setContent(variation.html, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      const filePath = path.join(outputDir, variation.name);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`✅ Saved ${variation.name} (${variation.width}x${variation.height})`);

      await page.close();
    }
    console.log(`\n🎉 Todas as variações do GUTO foram geradas com sucesso!`);
  } finally {
    await browser.close();
  }
}

generateVariations();