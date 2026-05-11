/**
 * generate-v3-hifi.mjs — DesafioGUT v3 High-Fidelity Screens
 * Bebas Neue + Navy + Orange | 375×812 | Playwright
 */
import playwright from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dir, '..', 'public', 'assets', 'telas', 'v3');
fs.mkdirSync(OUT, { recursive: true });

const W = 375, H = 812;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">`;

const BASE = `
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;}
body{width:${W}px;height:${H}px;overflow:hidden;background:#050818;color:#fff;
  font-family:'Barlow',sans-serif;-webkit-font-smoothing:antialiased;}
.screen{width:100%;height:100%;display:flex;flex-direction:column;position:relative;overflow:hidden;}
.hdr{display:flex;justify-content:space-between;align-items:center;
  padding:12px 20px;background:rgba(13,18,53,0.90);border-bottom:1px solid rgba(255,149,0,0.14);flex-shrink:0;}
.hdr-t{font-family:'Bebas Neue',sans-serif;font-size:20px;color:#fff;letter-spacing:0.02em;}
.hdr-s{font-size:11px;color:#6b7db8;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:0.10em;margin-top:1px;}
.content{flex:1;overflow:hidden;padding:14px 20px;display:flex;flex-direction:column;gap:11px;}
.card{background:#0d1235;border:1px solid rgba(255,149,0,0.14);border-radius:12px;padding:14px;}
.card-p{background:linear-gradient(145deg,#131844 0%,#0d1235 100%);
  border:1px solid rgba(255,149,0,0.28);border-radius:20px;padding:18px;
  box-shadow:0 0 0 1px rgba(255,149,0,0.06),0 12px 40px rgba(5,8,24,0.50);}
.kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.kpi{background:#0d1235;border:1px solid rgba(255,149,0,0.14);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:7px;}
.kpi-ico{width:32px;height:32px;background:rgba(255,149,0,0.12);border-radius:8px;
  display:flex;align-items:center;justify-content:center;font-size:15px;}
.kpi-lbl{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;
  text-transform:uppercase;letter-spacing:0.10em;color:#6b7db8;}
.kpi-val{font-family:'Bebas Neue',sans-serif;font-size:28px;color:#fff;line-height:1;letter-spacing:0.01em;}
.kpi-val.o{color:#ff9500;}
.label{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;
  text-transform:uppercase;letter-spacing:0.10em;color:#6b7db8;}
.timer{font-family:'Bebas Neue',sans-serif;font-size:56px;color:#ff9500;
  line-height:1;letter-spacing:0.01em;font-variant-numeric:tabular-nums;}
.badge-o{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:9999px;
  background:rgba(255,149,0,0.12);color:#ff9500;border:1px solid rgba(255,149,0,0.30);
  font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;
  text-transform:uppercase;letter-spacing:0.08em;}
.btn{display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#ff9500 0%,#ff6b35 100%);
  color:#fff;border:none;border-radius:9999px;padding:14px 24px;
  font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;
  text-transform:uppercase;letter-spacing:0.08em;width:100%;
  box-shadow:0 4px 20px rgba(255,149,0,0.40);}
.btn-out{background:rgba(255,149,0,0.08);color:#ff9500;
  border:1px solid rgba(255,149,0,0.40);border-radius:9999px;
  padding:12px 24px;font-family:'Barlow Condensed',sans-serif;
  font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;
  width:100%;display:flex;align-items:center;justify-content:center;}
.nav{display:flex;align-items:center;justify-content:space-around;
  height:64px;background:rgba(13,18,53,0.95);border-top:1px solid rgba(255,149,0,0.14);flex-shrink:0;}
.ni{display:flex;flex-direction:column;align-items:center;gap:3px;
  color:#6b7db8;flex:1;padding:8px 0;position:relative;}
.ni.a{color:#ff9500;}
.ni.a::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:24px;height:2px;background:#ff9500;border-radius:0 0 2px 2px;}
.ni-ico{font-size:18px;}
.ni-lbl{font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;
  text-transform:uppercase;letter-spacing:0.07em;}
.inp{width:100%;background:#131844;border:1.5px solid rgba(255,149,0,0.14);
  border-radius:10px;padding:13px 15px;font-size:15px;font-family:'Barlow',sans-serif;
  color:#fff;outline:none;}
.mono{font-family:'JetBrains Mono',monospace;font-size:12px;color:#c8d0f0;}
.glow-bg{position:absolute;top:-80px;left:50%;transform:translateX(-50%);
  width:350px;height:220px;
  background:radial-gradient(ellipse,rgba(255,149,0,0.18) 0%,transparent 70%);
  pointer-events:none;}
`;

function page(title, body, extra = '') {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">${FONTS}
<style>${BASE}${extra}</style></head><body>${body}</body></html>`;
}

function nav(active) {
  const items = [
    { id: 'i', ico: '🏠', lbl: 'INÍCIO' },
    { id: 'l', ico: '🎯', lbl: 'LANCES' },
    { id: 'c', ico: '💳', lbl: 'CARTEIRA' },
    { id: 'm', ico: '···', lbl: 'MAIS' },
  ];
  return `<nav class="nav">${items.map(it =>
    `<div class="ni ${it.id === active ? 'a' : ''}">
      <div class="ni-ico">${it.ico}</div>
      <div class="ni-lbl">${it.lbl}</div>
    </div>`).join('')}</nav>`;
}

const GUTO_SRC = path.join(__dir, '..', 'public', 'assets', 'telas', 'guto tradicional.png');
const GUTO_B64 = fs.existsSync(GUTO_SRC)
  ? `data:image/png;base64,${fs.readFileSync(GUTO_SRC).toString('base64')}` : null;

// ─── 6 TELAS ──────────────────────────────────────────────────────────────

const telas = [

  // 1 — Dashboard
  { file: 'dashboard-v3.png', html: page('Dashboard', `
  <div class="screen">
    <div class="glow-bg"></div>
    <div class="hdr">
      <div>
        <div class="hdr-t">OLÁ, DESAFIOGUT 👋</div>
        <div class="hdr-s">SEU PAINEL RELÂMPAGO</div>
      </div>
      <div class="badge-o">⚡ RELÂMPAGO</div>
    </div>
    <div class="content">
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-ico">💰</div><div class="kpi-lbl">SALDO</div><div class="kpi-val o">R$ 4.850</div></div>
        <div class="kpi"><div class="kpi-ico">🔑</div><div class="kpi-lbl">SENHAS</div><div class="kpi-val">8</div></div>
        <div class="kpi"><div class="kpi-ico">⚡</div><div class="kpi-lbl">LANCES ÚNICOS</div><div class="kpi-val">13</div></div>
        <div class="kpi"><div class="kpi-ico">📊</div><div class="kpi-lbl">TOTAL LANCES</div><div class="kpi-val">127</div></div>
      </div>
      <div class="card-p">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:0.02em">EDIÇÃO ATIVA</div>
          <div class="badge-o">⚡ AO VIVO</div>
        </div>
        <div class="label" style="margin-bottom:3px">PRÓXIMA APURAÇÃO</div>
        <div class="timer">02:47</div>
        <div style="font-size:11px;color:#6b7db8;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:0.08em;margin-top:6px">CONECTE SUA CARTEIRA PARA ENTRAR</div>
      </div>
      <div class="card" style="border-color:rgba(255,149,0,0.25)">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:#ff9500;letter-spacing:0.02em">MENOR LANCE ÚNICO</div>
        <div style="font-size:11px;color:#6b7db8;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:0.08em;margin-top:4px">R$ 0,05 — VALOR QUE APARECE APENAS 1 VEZ</div>
      </div>
    </div>
    ${nav('i')}
  </div>`) },

  // 2 — Mercado
  { file: 'mercado-v3.png', html: page('Mercado', `
  <div class="screen">
    <div class="hdr">
      <div>
        <div class="hdr-t">MERCADO DE LANCES</div>
        <div class="hdr-s">ESCOLHA SEU MODO</div>
      </div>
    </div>
    <div class="content" style="align-items:center;gap:14px">
      <div style="display:flex;gap:8px;width:100%">
        <div class="badge-o" style="flex:1;justify-content:center;padding:8px">⚡ RELÂMPAGO</div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:8px;border-radius:9999px;
          background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
          font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;
          text-transform:uppercase;letter-spacing:0.08em;color:#6b7db8">📅 PROGRAMADO</div>
      </div>
      <div style="position:relative;width:165px;height:165px">
        <svg width="165" height="165" viewBox="0 0 165 165">
          <circle cx="82.5" cy="82.5" r="72" fill="none" stroke="#131844" stroke-width="10"/>
          <circle cx="82.5" cy="82.5" r="72" fill="none" stroke="#ff9500" stroke-width="10"
            stroke-linecap="round" stroke-dasharray="452" stroke-dashoffset="150"
            transform="rotate(-90 82.5 82.5)"
            style="filter:drop-shadow(0 0 6px rgba(255,149,0,0.65))"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div class="label">TEMPO</div>
          <div class="timer" style="font-size:34px">04:26</div>
        </div>
      </div>
      <div style="width:100%">
        <div class="label" style="margin-bottom:6px">SEU LANCE</div>
        <div class="inp" style="color:#3d4f8a">Ex: 5 = R$ 0,05</div>
      </div>
      <div class="btn">CONFIRMAR LANCE</div>
      <div style="width:100%">
        <div class="label" style="margin-bottom:7px">TABELA DE LANCES</div>
        ${['0XAB...F123','0XC0...4456','0XEF...B789'].map((addr,i) => `
        <div style="display:flex;align-items:center;gap:9px;padding:9px 12px;background:#0d1235;
          border:1px solid rgba(255,149,0,0.12);border-radius:8px;margin-bottom:5px">
          <div style="width:24px;height:24px;background:rgba(255,149,0,0.12);border-radius:50%;
            display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;
            font-size:12px;color:#ff9500">A${i+1}</div>
          <div class="mono" style="flex:1">${addr}</div>
          <div style="font-size:10px;color:#6b7db8;font-family:'Barlow Condensed',sans-serif;
            text-transform:uppercase;letter-spacing:0.07em">OCULTO</div>
        </div>`).join('')}
      </div>
    </div>
    ${nav('l')}
  </div>`) },

  // 3 — Carteira
  { file: 'carteira-v3.png', html: page('Carteira', `
  <div class="screen">
    <div class="hdr">
      <div>
        <div class="hdr-t">MINHA CARTEIRA</div>
        <div class="hdr-s">SALDOS E HISTÓRICO</div>
      </div>
    </div>
    <div class="content">
      <div class="card-p" style="display:flex;flex-direction:column;gap:12px">
        <div class="label">SALDO DE SENHAS</div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;background:rgba(255,149,0,0.14);border-radius:12px;
            display:flex;align-items:center;justify-content:center;font-size:22px">🔑</div>
          <div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:38px;color:#ff9500;line-height:1;letter-spacing:0.01em">8</div>
            <div style="font-size:11px;color:#6b7db8;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:0.08em">fichas disponíveis</div>
          </div>
        </div>
        <div class="btn" style="margin-top:4px">COMPRAR SENHAS — R$ 2,00</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="card" style="text-align:center">
          <div class="label">LANCES</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;margin-top:5px;letter-spacing:0.01em">47</div>
        </div>
        <div class="card" style="text-align:center">
          <div class="label">VITÓRIAS</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:#00c853;margin-top:5px;letter-spacing:0.01em">3</div>
        </div>
      </div>
      <div>
        <div class="label" style="margin-bottom:7px">HISTÓRICO RECENTE</div>
        ${[
          {ico:'🎯',txt:'Lance R$ 0,05',sub:'Edição R-1 · 2min atrás',c:'#ff9500'},
          {ico:'💳',txt:'Compra 5 senhas',sub:'PIX · R$ 10,00 · hoje',c:'#00c853'},
          {ico:'🎯',txt:'Lance R$ 0,12',sub:'Edição R-1 · 15min atrás',c:'#ff9500'},
          {ico:'🏆',txt:'Vitória R$ 0,05',sub:'Edição R-0 · ontem',c:'#ffd700'},
        ].map(r => `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#0d1235;
          border:1px solid rgba(255,149,0,0.10);border-radius:8px;margin-bottom:5px">
          <div style="width:34px;height:34px;background:rgba(255,149,0,0.09);border-radius:8px;
            display:flex;align-items:center;justify-content:center;font-size:15px">${r.ico}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:${r.c};font-family:'Barlow Condensed',sans-serif">${r.txt}</div>
            <div style="font-size:11px;color:#6b7db8;margin-top:1px;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:0.06em">${r.sub}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>
    ${nav('c')}
  </div>`) },

  // 4 — Vencedor
  { file: 'vencedor-v3.png', html: page('Vencedor', `
  <div class="screen" style="align-items:center;justify-content:center;padding:32px 24px;
    background:radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,149,0,0.24) 0%, rgba(255,107,53,0.12) 40%, #050818 70%);">
    <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">
      ${Array.from({length:28}).map((_,i) => {
        const x=Math.round(Math.random()*375), y=Math.round(Math.random()*400);
        const s=Math.round(Math.random()*8+3);
        const c=i%4===0?'#ff9500':i%4===1?'#ffd700':i%4===2?'#ff6b35':'#fff';
        return `<div style="position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;
          background:${c};border-radius:${i%2?'50%':'2px'};opacity:0.8"></div>`;
      }).join('')}
    </div>
    <div style="text-align:center;z-index:1;width:100%">
      <div style="font-size:14px;color:#c8d0f0;font-family:'Barlow Condensed',sans-serif;
        text-transform:uppercase;letter-spacing:0.10em;margin-bottom:8px">🏆 MENOR LANCE ÚNICO</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:60px;color:#ff9500;
        text-shadow:0 0 32px rgba(255,149,0,0.60);letter-spacing:0.02em;margin-bottom:20px">PARABÉNS!</div>
      <div style="background:#0d1235;border:1px solid rgba(255,149,0,0.32);border-radius:20px;padding:24px 28px;margin-bottom:20px">
        <div class="label" style="margin-bottom:5px">VENCEDOR</div>
        <div class="mono" style="margin-bottom:10px">0XAB...F123</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:48px;color:#ff9500;
          letter-spacing:0.01em;font-variant-numeric:tabular-nums;
          text-shadow:0 0 20px rgba(255,149,0,0.45)">R$ 0,05</div>
      </div>
      <div class="btn">NOVA RODADA</div>
    </div>
  </div>`) },

  // 5 — Countdown
  { file: 'countdown-v3.png', html: page('Countdown', `
  <div class="screen" style="align-items:center;justify-content:space-evenly;background:#030611">
    <div style="position:absolute;top:15%;left:50%;transform:translateX(-50%);
      width:280px;height:280px;background:radial-gradient(circle,rgba(255,149,0,0.28),transparent 70%);pointer-events:none"></div>
    <div style="position:absolute;bottom:18%;left:50%;transform:translateX(-50%);
      width:200px;height:200px;background:radial-gradient(circle,rgba(255,107,53,0.20),transparent 70%);pointer-events:none"></div>
    <div style="text-align:center;z-index:1">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:170px;color:#ff9500;line-height:0.88;
        text-shadow:0 0 60px rgba(255,149,0,0.65),0 0 100px rgba(255,107,53,0.30);letter-spacing:-0.02em">3</div>
    </div>
    <div style="width:5px;height:5px;background:rgba(255,149,0,0.55);border-radius:50%;z-index:1"></div>
    <div style="text-align:center;z-index:1">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:170px;color:#ff9500;line-height:0.88;
        text-shadow:0 0 60px rgba(255,149,0,0.65),0 0 100px rgba(255,107,53,0.30);letter-spacing:-0.02em">1</div>
    </div>
    ${Array.from({length:10}).map((_,i)=>{
      const x=Math.round(Math.random()*375),y=Math.round(Math.random()*812);
      return `<div style="position:absolute;left:${x}px;top:${y}px;width:4px;height:4px;background:#ff9500;border-radius:50%;opacity:0.55"></div>`;
    }).join('')}
  </div>`) },

  // 6 — Onboarding
  { file: 'onboarding-v3.png', html: page('Onboarding', `
  <div class="screen" style="align-items:center;justify-content:center;padding:32px 24px;
    background:linear-gradient(160deg,#131844 0%,#050818 55%,#0a0e1f 100%)">
    <div style="position:absolute;top:-60px;left:50%;transform:translateX(-50%);
      width:400px;height:280px;background:radial-gradient(ellipse,rgba(255,149,0,0.16),transparent 70%);pointer-events:none"></div>
    <div style="text-align:center;width:100%;z-index:1">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:#ff9500;
        letter-spacing:0.04em;margin-bottom:3px">DesafioGUT</div>
      <div style="width:50px;height:3px;background:linear-gradient(90deg,#ff9500,#ff6b35);
        border-radius:2px;margin:0 auto 20px"></div>
      ${GUTO_B64 ? `
      <div style="width:110px;height:110px;border-radius:50%;
        background:linear-gradient(135deg,#131844,#0d1235);
        border:2px solid rgba(255,149,0,0.32);overflow:hidden;margin:0 auto 16px;
        box-shadow:0 0 28px rgba(255,149,0,0.22)">
        <img src="${GUTO_B64}" style="height:115px;width:auto;
          filter:hue-rotate(200deg) saturate(1.4) brightness(0.92);margin-left:-5px">
      </div>` : `
      <div style="width:110px;height:110px;border-radius:50%;background:rgba(255,149,0,0.14);
        border:2px solid rgba(255,149,0,0.30);display:flex;align-items:center;
        justify-content:center;margin:0 auto 16px;font-size:52px">🏆</div>`}
      <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:#fff;
        letter-spacing:0.02em;line-height:1.05;margin-bottom:8px">O JOGO DO<br/>MENOR LANCE ÚNICO</div>
      <div style="font-size:13px;color:#c8d0f0;margin-bottom:28px;line-height:1.5;
        font-family:'Barlow',sans-serif">Dê o menor lance que aparece 1× só<br>e ganhe prêmios inacreditáveis</div>
      <div class="btn" style="margin-bottom:10px">🔵 ENTRAR COM GOOGLE</div>
      <div class="btn-out" style="margin-bottom:20px">✉️ ENTRAR COM EMAIL</div>
      <div style="font-size:11px;color:#6b7db8;font-family:'Barlow Condensed',sans-serif;
        text-transform:uppercase;letter-spacing:0.08em">
        Cada senha custa apenas <span style="color:#ff9500;font-weight:700">R$ 2,00</span>
      </div>
    </div>
  </div>`) },
];

// ─── RUNNER ───────────────────────────────────────────────────────────────

async function run() {
  console.log('🎨 DesafioGUT v3 Hi-Fi — Bebas Neue + Navy + Orange\n');
  const browser = await playwright.chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 2 });
  const pg  = await ctx.newPage();
  let ok = 0, fail = 0;

  for (const { file, html } of telas) {
    const out = path.join(OUT, file);
    await pg.setViewportSize({ width: W, height: H });
    await pg.setContent(html, { waitUntil: 'networkidle', timeout: 15000 });
    await pg.waitForTimeout(600);
    await pg.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } });
    const kb = Math.round(fs.statSync(out).size / 1024);
    if (kb > 0) { console.log(`  ✅ ${file}  ${kb} KB`); ok++; }
    else        { console.log(`  ❌ ${file}  0 KB`);     fail++; }
  }

  await browser.close();
  console.log(`\n── ${ok}/6 telas geradas ──`);
  if (fail) { console.log(`   ${fail} falhas`); process.exit(1); }
}

run().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
