import playwright from 'playwright';
import fs from 'fs';
import path from 'path';

const outputDir = path.join(process.cwd(), 'public', 'assets', 'logos');

const baseStyle = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
  </style>
`;

// GUT Logo Symbol SVG (abstract geometric shape)
const gutSymbol = `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <!-- Outer ring -->
    <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
    
    <!-- Letter G shape -->
    <g>
      <path d="M 50 25 A 25 25 0 0 0 50 75 A 25 25 0 0 0 50 25 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="60" y1="50" x2="75" y2="50" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </g>
    
    <!-- Accent dot -->
    <circle cx="50" cy="35" r="4" fill="currentColor" opacity="0.8"/>
  </svg>
`;

const logos = [
  {
    name: 'gut-logo-horizontal.png',
    width: 480,
    height: 120,
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GUT Logo Horizontal</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body style="width: 480px; height: 120px; background: #000000; display: flex; align-items: center; justify-content: center; padding: 20px; gap: 16px;"><div style="width: 80px; height: 80px; color: #ffa500; flex-shrink: 0;">${gutSymbol}</div><div style="display: flex; flex-direction: column; gap: 4px; justify-content: center;"><div style="font-family: 'Bebas Neue', sans-serif; font-size: 48px; color: #ffa500; text-transform: uppercase; letter-spacing: 0.08em; line-height: 1; font-weight: 900;">GUT</div><div style="font-family: 'Barlow Condensed', sans-serif; font-size: 11px; color: #a7b07d; text-transform: uppercase; letter-spacing: 0.2em;">Desafio Leiloeiro</div></div></body></html>`
  },
  {
    name: 'gut-logo-vertical.png',
    width: 180,
    height: 220,
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GUT Logo Vertical</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body style="width: 180px; height: 220px; background: linear-gradient(180deg, #000000 0%, #001020 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; gap: 8px;"><div style="width: 100px; height: 100px; color: #ffa500;">${gutSymbol}</div><div style="font-family: 'Bebas Neue', sans-serif; font-size: 40px; color: #ffa500; text-transform: uppercase; letter-spacing: 0.08em; line-height: 1; text-align: center; font-weight: 900;">GUT</div><div style="font-family: 'Barlow Condensed', sans-serif; font-size: 10px; color: #a7b07d; text-transform: uppercase; letter-spacing: 0.16em; text-align: center; width: 100%;">Desafio<br/>Leiloeiro</div></body></html>`
  },
  {
    name: 'gut-logo-icon.png',
    width: 200,
    height: 200,
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GUT Logo Icon</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">${baseStyle}</head><body style="width: 200px; height: 200px; background: linear-gradient(135deg, rgba(255,165,0,0.1), rgba(0,16,32,0.8)); display: flex; align-items: center; justify-content: center; border-radius: 40px; border: 2px solid rgba(255,165,0,0.25); position: relative; overflow: hidden;"><div style="position: absolute; inset: 0; background: radial-gradient(circle at top right, rgba(255,165,0,0.1), transparent); pointer-events: none;"></div><div style="width: 140px; height: 140px; color: #ffa500; position: relative; z-index: 1; filter: drop-shadow(0 4px 12px rgba(255,165,0,0.3));">${gutSymbol}</div></body></html>`
  },
  {
    name: 'gut-favicon.png',
    width: 256,
    height: 256,
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GUT Favicon</title>${baseStyle}</head><body style="width: 256px; height: 256px; background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%); display: flex; align-items: center; justify-content: center; margin: 0; padding: 0;"><div style="width: 200px; height: 200px; color: #ffffff; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25));">${gutSymbol}</div></body></html>`
  },
  {
    name: 'gut-logo-full-dark.png',
    width: 560,
    height: 140,
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GUT Logo Dark</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body style="width: 560px; height: 140px; background: linear-gradient(180deg, #000000 0%, #001020 100%); display: flex; align-items: center; justify-content: center; padding: 20px; gap: 20px;"><div style="width: 100px; height: 100px; color: #ffa500; flex-shrink: 0;">${gutSymbol}</div><div style="display: flex; flex-direction: column; gap: 6px;"><div style="font-family: 'Bebas Neue', sans-serif; font-size: 52px; color: #ffa500; text-transform: uppercase; letter-spacing: 0.1em; line-height: 1; font-weight: 900; text-shadow: 0 0 20px rgba(255,165,0,0.25);">GUT</div><div style="font-family: 'Barlow Condensed', sans-serif; font-size: 12px; color: #dcd78a; text-transform: uppercase; letter-spacing: 0.22em;">DESAFIO DO MENOR LANCE</div></div></body></html>`
  }
];

async function generateLogos() {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const browser = await playwright.chromium.launch();

  try {
    for (const logo of logos) {
      const page = await browser.newPage({
        viewport: { width: logo.width, height: logo.height },
        deviceScaleFactor: 2
      });

      await page.setContent(logo.html, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const filePath = path.join(outputDir, logo.name);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`✅ Saved ${logo.name} (${logo.width}x${logo.height})`);

      await page.close();
    }
    console.log(`\n🎨 Todos os logos GUT foram gerados com sucesso!`);
  } finally {
    await browser.close();
  }
}

generateLogos();