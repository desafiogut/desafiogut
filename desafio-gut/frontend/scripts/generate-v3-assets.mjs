/**
 * generate-v3-assets.mjs
 * DesafioGUT v3 — Navy × Orange Luxury
 * Gera 15 assets via Playwright: 6 telas + 4 GUTO + 5 logos
 * Run: node scripts/generate-v3-assets.mjs
 */
import playwright from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TELAS_DIR  = path.join(ROOT, 'public', 'assets', 'telas', 'v3');
const GUTO_DIR   = path.join(ROOT, 'public', 'assets', 'guto',  'v2');
const LOGOS_DIR  = path.join(ROOT, 'public', 'assets', 'logos', 'v2');
const GUTO_SRC   = path.join(ROOT, 'public', 'assets', 'telas', 'guto tradicional.png');

[TELAS_DIR, GUTO_DIR, LOGOS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const W = 375, H = 812;

// ─────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────
const T = {
  bg:      '#050818',
  bg2:     '#030611',
  surface: '#0d1235',
  surfAlt: '#131844',
  border:  'rgba(255,107,53,0.14)',
  orange:  '#ff6b35',
  warm:    '#ff9500',
  text:    '#ffffff',
  body:    '#c8d0f0',
  muted:   '#6b7db8',
  success: '#00e5a0',
  error:   '#ff3d71',
};

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">`;

const BASE_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; height:100%; }
  body {
    width:${W}px; height:${H}px; overflow:hidden;
    background:${T.bg}; color:${T.text};
    font-family:'Inter',sans-serif;
    -webkit-font-smoothing:antialiased;
  }
  .screen { width:100%; height:100%; display:flex; flex-direction:column; position:relative; overflow:hidden; }
  .header {
    display:flex; justify-content:space-between; align-items:center;
    padding:12px 20px; background:rgba(13,18,53,0.85);
    border-bottom:1px solid ${T.border}; flex-shrink:0;
  }
  .header-title { font-family:'Montserrat',sans-serif; font-size:16px; font-weight:900; text-transform:uppercase; letter-spacing:0.02em; }
  .header-sub   { font-size:11px; color:${T.muted}; margin-top:1px; }
  .content { flex:1; overflow:hidden; padding:16px; display:flex; flex-direction:column; gap:12px; }
  .card {
    background:${T.surface}; border:1px solid ${T.border};
    border-radius:12px; padding:16px;
  }
  .card-alt { background:${T.surfAlt}; }
  .card-premium {
    background:linear-gradient(145deg,${T.surfAlt} 0%,${T.surface} 100%);
    border:1px solid rgba(255,149,0,0.28); border-radius:20px; padding:20px;
    box-shadow:0 0 0 1px rgba(255,107,53,0.06), 0 12px 40px rgba(5,8,24,0.5);
  }
  .kpi-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .kpi-card { background:${T.surface}; border:1px solid ${T.border}; border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:8px; }
  .kpi-icon { width:34px; height:34px; border-radius:8px; background:rgba(255,107,53,0.12); display:flex; align-items:center; justify-content:center; font-size:16px; }
  .kpi-label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:${T.muted}; }
  .kpi-value { font-family:'Montserrat',sans-serif; font-size:26px; font-weight:800; color:${T.text}; font-variant-numeric:tabular-nums; line-height:1; }
  .kpi-value.orange { color:${T.warm}; }
  .label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:${T.muted}; }
  .display { font-family:'Montserrat',sans-serif; font-weight:900; text-transform:uppercase; }
  .timer { font-family:'Montserrat',sans-serif; font-weight:900; font-variant-numeric:tabular-nums; color:${T.warm}; letter-spacing:-0.02em; }
  .badge {
    display:inline-flex; align-items:center; gap:4px;
    padding:3px 8px; border-radius:9999px;
    font-family:'Inter',sans-serif; font-size:10px; font-weight:600;
    text-transform:uppercase; letter-spacing:0.07em;
  }
  .badge-orange { background:rgba(255,107,53,0.12); color:${T.warm}; border:1px solid rgba(255,107,53,0.28); }
  .badge-success{ background:rgba(0,229,160,0.12);  color:${T.success}; border:1px solid rgba(0,229,160,0.28); }
  .btn {
    display:flex; align-items:center; justify-content:center;
    background:linear-gradient(135deg,${T.orange} 0%,${T.warm} 100%);
    color:#fff; border:none; border-radius:9999px;
    padding:14px 28px; font-family:'Montserrat',sans-serif;
    font-size:14px; font-weight:800; text-transform:uppercase;
    letter-spacing:0.06em; cursor:pointer; width:100%;
    box-shadow:0 4px 20px rgba(255,107,53,0.35);
  }
  .btn-outline {
    background:rgba(255,107,53,0.08); color:${T.orange};
    border:1px solid rgba(255,107,53,0.40); border-radius:9999px;
    padding:12px 24px; font-family:'Montserrat',sans-serif;
    font-size:13px; font-weight:700; text-transform:uppercase;
    letter-spacing:0.05em; width:100%; display:flex;
    align-items:center; justify-content:center;
  }
  .bottom-nav {
    display:flex; align-items:center; justify-content:space-around;
    height:64px; background:rgba(13,18,53,0.95);
    border-top:1px solid ${T.border}; flex-shrink:0;
  }
  .nav-item { display:flex; flex-direction:column; align-items:center; gap:3px; color:${T.muted}; flex:1; padding:8px 0; }
  .nav-item.active { color:${T.orange}; }
  .nav-item.active .nav-bar { background:${T.orange}; }
  .nav-bar { width:24px; height:2px; background:transparent; border-radius:1px; margin-bottom:-2px; }
  .nav-icon { font-size:18px; }
  .nav-label { font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; }
  .glow-bg {
    position:absolute; top:-60px; left:50%; transform:translateX(-50%);
    width:300px; height:200px;
    background:radial-gradient(ellipse, rgba(255,107,53,0.18) 0%, transparent 70%);
    pointer-events:none;
  }
`;

function html(title, body, extraStyle = '') {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">${FONTS}<style>${BASE_CSS}${extraStyle}</style></head><body>${body}</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────
// NAV COMPONENT
// ─────────────────────────────────────────────────────────────────────
function nav(active) {
  const items = [
    { id: 'inicio',    icon: '🏠', label: 'INÍCIO'   },
    { id: 'lances',   icon: '🎯', label: 'LANCES'   },
    { id: 'carteira', icon: '💳', label: 'CARTEIRA' },
    { id: 'mais',     icon: '⋯',  label: 'MAIS'     },
  ];
  return `<nav class="bottom-nav">${items.map(i => `
    <div class="nav-item ${i.id === active ? 'active' : ''}">
      <div class="nav-bar"></div>
      <span class="nav-icon">${i.icon}</span>
      <span class="nav-label">${i.label}</span>
    </div>`).join('')}</nav>`;
}

// ─────────────────────────────────────────────────────────────────────
// TELAS
// ─────────────────────────────────────────────────────────────────────
const telas = [
  // 1. Dashboard
  {
    file: 'dashboard-v3.png',
    html: html('Dashboard', `
    <div class="screen">
      <div class="glow-bg"></div>
      <div class="header">
        <div>
          <div class="header-title" style="font-size:18px">OLÁ, DESAFIOGUT 👋</div>
          <div class="header-sub">SEU PAINEL RELÂMPAGO</div>
        </div>
        <div class="badge badge-orange" style="font-size:11px;padding:5px 10px">⚡ RELÂMPAGO</div>
      </div>
      <div class="content">
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-label">SALDO</div><div class="kpi-value orange">R$ 4.850</div></div>
          <div class="kpi-card"><div class="kpi-icon">🔑</div><div class="kpi-label">SENHAS</div><div class="kpi-value">8</div></div>
          <div class="kpi-card"><div class="kpi-icon">⚡</div><div class="kpi-label">LANCES ÚNICOS</div><div class="kpi-value">13</div></div>
          <div class="kpi-card"><div class="kpi-icon">📊</div><div class="kpi-label">TOTAL LANCES</div><div class="kpi-value">127</div></div>
        </div>
        <div class="card-premium">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div class="display" style="font-size:14px;font-weight:900">EDIÇÃO ATIVA</div>
            <div class="badge badge-orange">⚡ RELÂMPAGO</div>
          </div>
          <div class="label" style="margin-bottom:4px">PRÓXIMA APURAÇÃO</div>
          <div class="timer" style="font-size:52px;line-height:1">02:47</div>
          <div style="font-size:11px;color:${T.muted};margin-top:8px">CONECTE SUA CARTEIRA PARA ENTRAR</div>
        </div>
        <div class="card" style="border-color:rgba(255,149,0,0.25)">
          <div class="display" style="font-size:20px;color:${T.warm}">MENOR LANCE ÚNICO</div>
          <div style="font-size:12px;color:${T.muted};margin-top:4px">R$ 0,05 — VALOR QUE APARECE APENAS 1 VEZ</div>
        </div>
      </div>
      ${nav('inicio')}
    </div>`)
  },

  // 2. Mercado
  {
    file: 'mercado-v3.png',
    html: html('Mercado', `
    <div class="screen">
      <div class="header">
        <div>
          <div class="header-title">MERCADO DE LANCES</div>
          <div class="header-sub">ESCOLHA SEU MODO</div>
        </div>
      </div>
      <div class="content" style="align-items:center;gap:16px">
        <div style="display:flex;gap:8px;width:100%">
          <div class="badge badge-orange" style="flex:1;justify-content:center;padding:8px">⚡ RELÂMPAGO</div>
          <div class="badge" style="flex:1;justify-content:center;padding:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:${T.muted}">📅 PROGRAMADO</div>
        </div>
        <div style="position:relative;width:170px;height:170px">
          <svg width="170" height="170" viewBox="0 0 170 170">
            <circle cx="85" cy="85" r="75" fill="none" stroke="${T.surfAlt}" stroke-width="10"/>
            <circle cx="85" cy="85" r="75" fill="none" stroke="${T.orange}" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="471" stroke-dashoffset="160" transform="rotate(-90 85 85)"
              style="filter:drop-shadow(0 0 6px rgba(255,107,53,0.6))"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${T.muted}">TEMPO RESTANTE</div>
            <div class="timer" style="font-size:36px;margin-top:2px">04:26</div>
          </div>
        </div>
        <div style="width:100%">
          <div class="label" style="margin-bottom:6px">SEU LANCE</div>
          <div style="background:${T.surfAlt};border:1.5px solid ${T.border};border-radius:10px;padding:14px 16px;font-size:15px;color:${T.muted}">Ex: 5 = R$ 0,05</div>
        </div>
        <div class="btn">CONFIRMAR LANCE</div>
        <div style="width:100%">
          <div class="label" style="margin-bottom:8px">TABELA DE LANCES</div>
          ${['A1','A2','A3'].map((r,i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px;background:${T.surface};border:1px solid ${T.border};border-radius:8px;margin-bottom:6px">
            <div style="width:26px;height:26px;background:rgba(255,107,53,0.12);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;color:${T.warm}">${r}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${T.body};flex:1">0XAB...F12${i+3}</div>
            <div style="font-size:10px;color:${T.muted}">LANCE OCULTO</div>
          </div>`).join('')}
        </div>
      </div>
      ${nav('lances')}
    </div>`)
  },

  // 3. Carteira
  {
    file: 'carteira-v3.png',
    html: html('Carteira', `
    <div class="screen">
      <div class="header">
        <div>
          <div class="header-title">MINHA CARTEIRA</div>
          <div class="header-sub">SALDOS E HISTÓRICO</div>
        </div>
      </div>
      <div class="content">
        <div class="card-premium" style="display:flex;flex-direction:column;gap:12px">
          <div class="label">SALDO DE SENHAS</div>
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;background:rgba(255,107,53,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px">🔑</div>
            <div>
              <div class="display" style="font-size:32px;color:${T.warm}">8</div>
              <div style="font-size:11px;color:${T.muted}">fichas disponíveis</div>
            </div>
          </div>
          <div class="btn" style="margin-top:4px">COMPRAR MAIS SENHAS</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="card" style="text-align:center">
            <div class="label">LANCES DADOS</div>
            <div class="display" style="font-size:28px;margin-top:6px">47</div>
          </div>
          <div class="card" style="text-align:center">
            <div class="label">VITÓRIAS</div>
            <div class="display" style="font-size:28px;color:${T.success};margin-top:6px">3</div>
          </div>
        </div>
        <div>
          <div class="label" style="margin-bottom:8px">HISTÓRICO RECENTE</div>
          ${[
            {txt:'Lance R$ 0,05',sub:'Edição R-1 · 2min atrás',icon:'🎯',c:T.warm},
            {txt:'Compra 5 senhas',sub:'PIX · R$ 10,00 · hoje',icon:'💳',c:T.success},
            {txt:'Lance R$ 0,12',sub:'Edição R-1 · 15min atrás',icon:'🎯',c:T.warm},
          ].map(r => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px;background:${T.surface};border:1px solid ${T.border};border-radius:8px;margin-bottom:6px">
            <div style="width:36px;height:36px;background:rgba(255,107,53,0.10);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px">${r.icon}</div>
            <div style="flex:1"><div style="font-size:13px;font-weight:600;color:${r.c}">${r.txt}</div><div style="font-size:11px;color:${T.muted};margin-top:2px">${r.sub}</div></div>
          </div>`).join('')}
        </div>
      </div>
      ${nav('carteira')}
    </div>`)
  },

  // 4. Vencedor
  {
    file: 'vencedor-v3.png',
    html: html('Vencedor', `
    <div class="screen" style="align-items:center;justify-content:center;background:radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,149,0,0.22) 0%, rgba(255,107,53,0.10) 40%, transparent 70%), ${T.bg}">
      <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">
        ${Array.from({length:30}).map((_,i) => {
          const x = Math.round(Math.random()*375), y = Math.round(Math.random()*400);
          const sz = Math.round(Math.random()*8+3);
          const c = i%3===0?T.orange:i%3===1?T.warm:'#fff';
          return `<div style="position:absolute;left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;background:${c};border-radius:${i%2?'50%':'2px'};opacity:0.7"></div>`;
        }).join('')}
      </div>
      <div style="text-align:center;padding:40px 24px;position:relative;z-index:1">
        <div class="display" style="font-size:54px;color:${T.warm};text-shadow:0 0 30px rgba(255,149,0,0.55);margin-bottom:8px">PARABÉNS!</div>
        <div style="font-size:14px;color:${T.body};margin-bottom:24px">🏆 MENOR LANCE ÚNICO</div>
        <div style="background:${T.surface};border:1px solid rgba(255,149,0,0.30);border-radius:20px;padding:24px 32px">
          <div class="label" style="margin-bottom:6px">VENCEDOR</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:${T.muted};margin-bottom:12px">0XAB...F123</div>
          <div class="timer" style="font-size:44px">R$ 0,05</div>
        </div>
        <div class="btn" style="margin-top:24px">NOVA RODADA</div>
      </div>
    </div>`)
  },

  // 5. Countdown
  {
    file: 'countdown-v3.png',
    html: html('Countdown', `
    <div class="screen" style="align-items:center;justify-content:space-evenly;background:${T.bg2}">
      <div style="position:absolute;top:20%;left:50%;transform:translateX(-50%);width:250px;height:250px;background:radial-gradient(circle,rgba(255,149,0,0.25),transparent 70%);pointer-events:none"></div>
      <div style="position:absolute;bottom:20%;left:50%;transform:translateX(-50%);width:180px;height:180px;background:radial-gradient(circle,rgba(255,107,53,0.18),transparent 70%);pointer-events:none"></div>
      ${[3,1].map((n,i) => `
      <div style="text-align:center;position:relative;z-index:1">
        <div style="font-family:'Montserrat',sans-serif;font-size:160px;font-weight:900;color:${T.warm};line-height:0.88;text-shadow:0 0 48px rgba(255,149,0,0.60),0 0 80px rgba(255,107,53,0.30)">${n}</div>
      </div>`).join('<div style="width:4px;height:4px;background:rgba(255,149,0,0.5);border-radius:50%;margin:0 auto"></div>')}
      ${Array.from({length:8}).map((_,i) => {
        const x=Math.round(Math.random()*375), y=Math.round(Math.random()*812);
        return `<div style="position:absolute;left:${x}px;top:${y}px;width:5px;height:5px;background:${T.warm};border-radius:50%;opacity:0.5;z-index:0"></div>`;
      }).join('')}
    </div>`)
  },

  // 6. Onboarding
  {
    file: 'onboarding-v3.png',
    html: html('Onboarding', `
    <div class="screen" style="align-items:center;justify-content:center;padding:32px 24px;background:linear-gradient(160deg, ${T.surfAlt} 0%, ${T.bg} 55%, #0a0e1f 100%)">
      <div style="position:absolute;top:-80px;left:50%;transform:translateX(-50%);width:400px;height:300px;background:radial-gradient(ellipse,rgba(255,107,53,0.15),transparent 70%);pointer-events:none"></div>
      <div style="text-align:center;width:100%;position:relative;z-index:1">
        <div style="font-family:'Montserrat',sans-serif;font-size:22px;font-weight:900;color:${T.orange};letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px">DesafioGUT</div>
        <div style="width:60px;height:3px;background:linear-gradient(90deg,${T.orange},${T.warm});border-radius:2px;margin:0 auto 24px"></div>
        <div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,${T.surfAlt},${T.surface});border:2px solid rgba(255,107,53,0.30);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:52px;box-shadow:0 0 30px rgba(255,107,53,0.20)">🏆</div>
        <div class="display" style="font-size:26px;color:${T.text};margin-bottom:8px">O JOGO DO<br/>MENOR LANCE ÚNICO</div>
        <div style="font-size:13px;color:${T.muted};margin-bottom:32px;line-height:1.5">Dê o menor lance que aparece 1x só e ganhe prêmios inacreditáveis</div>
        <div class="btn" style="margin-bottom:12px">🔵 ENTRAR COM GOOGLE</div>
        <div class="btn-outline" style="margin-bottom:24px">✉️ ENTRAR COM EMAIL</div>
        <div style="font-size:11px;color:${T.muted}">Cada senha custa apenas <span style="color:${T.warm};font-weight:700">R$ 2,00</span></div>
      </div>
    </div>`)
  },
];

// ─────────────────────────────────────────────────────────────────────
// GUTO VARIATIONS (HTML/CSS com img base ou ilustração)
// ─────────────────────────────────────────────────────────────────────
// Embed GUTO as base64 so Playwright's setContent() can load it (file:// URLs don't work in setContent)
const gutoBase64 = fs.existsSync(GUTO_SRC)
  ? `data:image/png;base64,${fs.readFileSync(GUTO_SRC).toString('base64')}`
  : null;

const gutos = [
  // 1. Logo
  {
    file: 'guto-logo-v2.png', w: 480, h: 160,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:480px;height:160px;background:${T.bg};display:flex;align-items:center;padding:16px 24px;gap:16px;font-family:'Montserrat',sans-serif;-webkit-font-smoothing:antialiased;}</style></head><body>
      ${gutoBase64 ? `<img src="${gutoBase64}" style="height:128px;width:auto;filter:hue-rotate(180deg) saturate(1.5) brightness(0.9);">` : '<div style="width:90px;height:128px;background:linear-gradient(135deg,#1a2260,#0d1235);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:48px">👨‍💼</div>'}
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="font-size:52px;font-weight:900;color:${T.orange};text-transform:uppercase;letter-spacing:0.04em;line-height:1">GUT</div>
        <div style="font-size:11px;font-weight:600;color:${T.muted};text-transform:uppercase;letter-spacing:0.18em">DesafioGUT</div>
        <div style="width:32px;height:2px;background:${T.orange};border-radius:1px"></div>
      </div>
    </body></html>`
  },
  // 2. Avatar
  {
    file: 'guto-avatar-v2.png', w: 200, h: 200,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:200px;height:200px;background:${T.bg};display:flex;align-items:center;justify-content:center;-webkit-font-smoothing:antialiased;}</style></head><body>
      <div style="width:180px;height:180px;border-radius:50%;background:linear-gradient(135deg,${T.surfAlt},${T.surface});border:3px solid rgba(255,107,53,0.45);overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 0 24px rgba(255,107,53,0.25)">
        ${gutoBase64 ? `<img src="${gutoBase64}" style="height:200px;width:auto;object-fit:cover;object-position:top center;filter:hue-rotate(200deg) saturate(1.3) brightness(0.95);">` : '<div style="font-size:80px">👨‍💼</div>'}
      </div>
    </body></html>`
  },
  // 3. Ícone
  {
    file: 'guto-icon-v2.png', w: 256, h: 256,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:256px;height:256px;background:${T.bg};display:flex;align-items:center;justify-content:center;-webkit-font-smoothing:antialiased;}</style></head><body>
      <div style="width:220px;height:220px;border-radius:48px;background:linear-gradient(135deg,${T.surfAlt},${T.surface});border:2px solid rgba(255,107,53,0.30);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 0 40px rgba(255,107,53,0.20)">
        ${gutoBase64 ? `<img src="${gutoBase64}" style="height:200px;width:auto;filter:hue-rotate(200deg) saturate(1.4) brightness(0.95);">` : '<div style="font-size:100px">👨‍💼</div>'}
      </div>
    </body></html>`
  },
  // 4. Celebrando
  {
    file: 'guto-celebrando-v2.png', w: 400, h: 500,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:400px;height:500px;background:radial-gradient(ellipse 80% 60% at 50% 60%, rgba(255,149,0,0.25), rgba(255,107,53,0.12) 50%, ${T.bg} 80%);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;-webkit-font-smoothing:antialiased;}</style></head><body>
      <div style="font-family:'Montserrat',sans-serif;font-size:28px;font-weight:900;color:${T.warm};text-shadow:0 0 20px rgba(255,149,0,0.5);text-transform:uppercase;margin-bottom:16px;position:relative;z-index:2">🏆 VENCEDOR!</div>
      <div style="position:relative;z-index:2">
        ${gutoBase64 ? `<img src="${gutoBase64}" style="height:280px;width:auto;filter:hue-rotate(180deg) saturate(1.5) brightness(1.0);drop-shadow(0 8px 24px rgba(255,107,53,0.4));">` : '<div style="font-size:120px;text-align:center">🥳</div>'}
      </div>
      <div style="font-family:'Montserrat',sans-serif;font-size:22px;font-weight:800;color:${T.warm};margin-top:12px;position:relative;z-index:2">R$ 0,05</div>
      ${Array.from({length:20}).map((_,i) => {
        const x=Math.round(Math.random()*400), y=Math.round(Math.random()*500);
        const c=i%3===0?T.orange:i%3===1?T.warm:'#fff';
        return `<div style="position:absolute;left:${x}px;top:${y}px;width:6px;height:6px;background:${c};border-radius:${i%2?'50%':'2px'};opacity:0.8;z-index:1"></div>`;
      }).join('')}
    </body></html>`
  },
];

// ─────────────────────────────────────────────────────────────────────
// LOGOS v2
// ─────────────────────────────────────────────────────────────────────
const gutSymbol = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="2" opacity="0.25"/>
  <path d="M 50 22 A 28 28 0 1 0 50 78 A 28 28 0 0 0 50 22 Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <line x1="58" y1="50" x2="78" y2="50" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <circle cx="50" cy="32" r="5" fill="currentColor" opacity="0.85"/>
</svg>`;

const logos = [
  {
    file: 'gut-logo-horizontal-v2.png', w: 480, h: 120,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:480px;height:120px;background:${T.bg};display:flex;align-items:center;justify-content:center;padding:20px 28px;gap:18px;font-family:'Montserrat',sans-serif;-webkit-font-smoothing:antialiased;}</style></head><body>
      <div style="width:76px;height:76px;color:${T.orange};flex-shrink:0;filter:drop-shadow(0 0 8px rgba(255,107,53,0.40))">${gutSymbol}</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <div style="font-size:52px;font-weight:900;color:${T.orange};line-height:1;letter-spacing:0.06em">GUT</div>
        <div style="font-size:11px;font-weight:600;color:${T.muted};text-transform:uppercase;letter-spacing:0.20em">DesafioGUT</div>
      </div>
    </body></html>`
  },
  {
    file: 'gut-logo-vertical-v2.png', w: 200, h: 240,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:200px;height:240px;background:${T.bg};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;gap:10px;font-family:'Montserrat',sans-serif;-webkit-font-smoothing:antialiased;}</style></head><body>
      <div style="width:100px;height:100px;color:${T.orange};filter:drop-shadow(0 0 10px rgba(255,107,53,0.35))">${gutSymbol}</div>
      <div style="font-size:48px;font-weight:900;color:${T.orange};letter-spacing:0.06em;line-height:1">GUT</div>
      <div style="font-size:10px;font-weight:600;color:${T.muted};text-transform:uppercase;letter-spacing:0.18em;text-align:center">DESAFIOGUT</div>
    </body></html>`
  },
  {
    file: 'gut-logo-icon-v2.png', w: 256, h: 256,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{width:256px;height:256px;background:${T.bg};display:flex;align-items:center;justify-content:center;}</style></head><body>
      <div style="width:200px;height:200px;background:linear-gradient(135deg,rgba(255,107,53,0.15),rgba(13,18,53,0.9));border:2px solid rgba(255,107,53,0.30);border-radius:44px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 32px rgba(255,107,53,0.20)">
        <div style="width:140px;height:140px;color:${T.orange};filter:drop-shadow(0 0 12px rgba(255,107,53,0.45))">${gutSymbol}</div>
      </div>
    </body></html>`
  },
  {
    file: 'gut-favicon-v2.png', w: 256, h: 256,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:256px;height:256px;background:linear-gradient(135deg,${T.orange} 0%,${T.warm} 100%);display:flex;align-items:center;justify-content:center;font-family:'Montserrat',sans-serif;}</style></head><body>
      <div style="font-size:140px;font-weight:900;color:#fff;text-shadow:0 4px 16px rgba(0,0,0,0.20);line-height:1">G</div>
    </body></html>`
  },
  {
    file: 'gut-logo-full-dark-v2.png', w: 560, h: 140,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:560px;height:140px;background:linear-gradient(160deg,${T.surfAlt} 0%,${T.bg} 60%);display:flex;align-items:center;padding:20px 28px;gap:20px;font-family:'Montserrat',sans-serif;-webkit-font-smoothing:antialiased;}</style></head><body>
      ${gutoBase64 ? `<img src="${gutoBase64}" style="height:100px;width:auto;filter:hue-rotate(200deg) saturate(1.4) brightness(0.9);flex-shrink:0;">` : `<div style="width:90px;height:100px;color:${T.orange};flex-shrink:0">${gutSymbol}</div>`}
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="font-size:42px;font-weight:900;color:${T.orange};letter-spacing:0.06em;line-height:1;text-shadow:0 0 20px rgba(255,107,53,0.25)">DesafioGUT</div>
        <div style="font-size:11px;font-weight:600;color:${T.muted};text-transform:uppercase;letter-spacing:0.20em">O JOGO DO MENOR LANCE ÚNICO</div>
      </div>
      <div style="margin-left:auto;width:56px;height:56px;color:${T.orange};flex-shrink:0;opacity:0.7">${gutSymbol}</div>
    </body></html>`
  },
];

// ─────────────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('🚀 DesafioGUT v3 — Gerando 15 assets...\n');
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  let ok = 0, fail = 0;

  async function shoot(htmlContent, outPath, w, h) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(htmlContent, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: w, height: h } });
    const stat = fs.statSync(outPath);
    const kb = Math.round(stat.size / 1024);
    if (kb > 0) {
      console.log(`  ✅ ${path.basename(outPath)}  ${kb} KB`);
      ok++;
    } else {
      console.log(`  ❌ ${path.basename(outPath)}  0 KB — FALHOU`);
      fail++;
    }
  }

  console.log('── TELAS (6) ──────────────────────────────────');
  for (const t of telas) {
    const out = path.join(TELAS_DIR, t.file);
    await shoot(t.html, out, W, H);
  }

  console.log('\n── GUTO (4) ───────────────────────────────────');
  for (const g of gutos) {
    const out = path.join(GUTO_DIR, g.file);
    await shoot(g.html, out, g.w, g.h);
  }

  console.log('\n── LOGOS (5) ──────────────────────────────────');
  for (const l of logos) {
    const out = path.join(LOGOS_DIR, l.file);
    await shoot(l.html, out, l.w, l.h);
  }

  await browser.close();
  console.log(`\n── RESULTADO ─────────────────────────────────`);
  console.log(`  ✅ ${ok}/15 gerados com sucesso`);
  if (fail) console.log(`  ❌ ${fail} falhas`);
}

run().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
