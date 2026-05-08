import playwright from 'playwright';
import fs from 'fs';
import path from 'path';

const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 812;
const outputDir = path.join(process.cwd(), 'public', 'assets', 'telas');

const baseStyle = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body {
      width: ${MOBILE_WIDTH}px;
      height: ${MOBILE_HEIGHT}px;
      overflow: hidden;
      background: #060b08;
      color: #ffffff;
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
      background: linear-gradient(180deg, #060b08 0%, #040b07 100%);
      position: relative;
    }
    .glass-card {
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
      border: 1px solid rgba(245,200,0,0.18);
      box-shadow: 0 0 30px rgba(245,200,0,0.12);
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
      font-size: 30px;
      line-height: 1;
      color: #f5c800;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .headline p {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #a8b685;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .kpi-card {
      border-radius: 20px;
      background: #08110b;
      border: 1px solid rgba(245,200,0,0.18);
      padding: 16px;
      display: grid;
      gap: 10px;
      min-height: 124px;
      position: relative;
    }
    .kpi-icon {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: rgba(245,200,0,0.14);
      color: #f5c800;
      font-size: 18px;
      box-shadow: inset 0 0 10px rgba(245,200,0,0.12);
    }
    .kpi-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #8c9f69;
    }
    .kpi-value {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 32px;
      line-height: 1;
      color: #f5c800;
    }
    .panel {
      border-radius: 24px;
      background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
      border: 1px solid rgba(245,200,0,0.18);
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 14px;
      border-radius: 999px;
      background: linear-gradient(135deg, #f5c800, #ffd54f);
      color: #060b08;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      box-shadow: 0 6px 18px rgba(245,200,0,0.26);
    }
    .panel-title {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 14px;
    }
    .panel-title h2 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 24px;
      color: #ffffff;
      text-transform: uppercase;
    }
    .timer-block {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    .timer-value {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 46px;
      color: #f5c800;
      line-height: 1;
      letter-spacing: 0.02em;
    }
    .timer-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #a7b07d;
      margin-bottom: 4px;
    }
    .strong-note {
      font-size: 14px;
      color: #dcd6a0;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .hero-row {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .hero-row .hero-card {
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(245,200,0,0.10), rgba(255,255,255,0.03));
      border: 1px solid rgba(245,200,0,0.18);
      padding: 18px;
      box-shadow: 0 0 28px rgba(245,200,0,0.10);
    }
    .hero-card strong {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 28px;
      color: #f5c800;
      display: block;
      margin-bottom: 8px;
    }
    .hero-card span {
      font-size: 11px;
      color: #a7b07d;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .bottom-nav {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 12px 4px 4px;
      background: linear-gradient(180deg, rgba(10,26,14,0.8) 0%, #0a1a0e 100%);
      border-top: 1px solid rgba(245,200,0,0.18);
      border-radius: 20px 20px 0 0;
    }
    .bottom-nav .item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      color: #8c9f69;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.10em;
      text-transform: uppercase;
    }
    .bottom-nav .item.active {
      color: #f5c800;
    }
    .nav-icon {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      font-size: 18px;
      border-radius: 12px;
      background: rgba(245,200,0,0.1);
    }
    .toggle-pill {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      border-radius: 999px;
      padding: 14px;
      background: rgba(245,200,0,0.08);
      border: 1px solid rgba(245,200,0,0.18);
      color: #f5c800;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      gap: 12px;
    }
    .circle-timer {
      width: 220px;
      height: 220px;
      margin: 0 auto;
      position: relative;
    }
    .circle-ring {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: conic-gradient(
        #1d8c2e 0deg 120deg,
        #f5c800 120deg 240deg,
        #e53935 240deg 360deg
      );
      display: grid;
      place-items: center;
      box-shadow: 0 0 40px rgba(245,200,0,0.25);
    }
    .circle-ring .inner {
      width: 70%;
      height: 70%;
      border-radius: 50%;
      background: #060b08;
      border: 2px solid rgba(245,200,0,0.18);
      display: grid;
      place-items: center;
      text-align: center;
      padding: 20px;
    }
    .circle-ring .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #8e9d6b;
      margin-bottom: 8px;
    }
    .circle-ring .value {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 42px;
      color: #ffffff;
      line-height: 1;
    }
    .input-pill {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .input-pill input {
      width: 100%;
      border-radius: 18px;
      border: 1px solid rgba(245,200,0,0.18);
      background: rgba(255,255,255,0.05);
      color: #ffffff;
      padding: 16px 18px;
      font-size: 20px;
      letter-spacing: 0.02em;
    }
    .input-pill input::placeholder {
      color: rgba(255,255,255,0.4);
    }
    .pill-button {
      border: none;
      border-radius: 999px;
      padding: 16px;
      background: linear-gradient(135deg, #f5c800 0%, #efba30 100%);
      color: #060b08;
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      box-shadow: 0 10px 28px rgba(245,200,0,0.35);
      cursor: pointer;
    }
    .pill-button.outline {
      background: transparent;
      color: #f5c800;
      border: 1px solid rgba(245,200,0,0.25);
      box-shadow: none;
    }
    .table-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .table-card {
      border-radius: 20px;
      border: 1px solid rgba(245,200,0,0.14);
      background: rgba(255,255,255,0.04);
      padding: 14px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: rgba(245,200,0,0.16);
      color: #f5c800;
      font-size: 16px;
      font-weight: 800;
    }
    .table-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .table-content .title {
      font-size: 13px;
      color: #ffffff;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .table-content .subtitle {
      font-size: 11px;
      color: #a7b07d;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .hidden-chip {
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.45);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }
    .stacked-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .info-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #8c9f69;
    }
    .info-value {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 30px;
      color: #f5c800;
      line-height: 1;
    }
    .info-text {
      font-size: 12px;
      line-height: 1.4;
      color: #c5cc9f;
    }
    .confetti {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .confetti div {
      position: absolute;
      width: 10px;
      height: 24px;
      background: radial-gradient(circle, #f5c800, rgba(245,200,0,0.4));
      opacity: 0.8;
      transform: rotate(20deg);
      border-radius: 6px;
      box-shadow: 0 0 24px rgba(245,200,0,0.5);
    }
    .winner-screen {
      position: relative;
      width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 28px;
      background: radial-gradient(circle at top, rgba(245,200,0,0.12), transparent 18%), linear-gradient(180deg, #060b08 0%, #040b07 100%);
    }
    .winner-frame {
      width: 100%;
      max-width: 340px;
      padding: 26px;
      border-radius: 28px;
      background: rgba(9,15,10,0.96);
      border: 1px solid rgba(245,200,0,0.28);
      box-shadow: 0 0 50px rgba(245,200,0,0.28);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      position: relative;
      overflow: hidden;
    }
    .winner-frame::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 28px;
      box-shadow: inset 0 0 80px rgba(245,200,0,0.18);
      pointer-events: none;
    }
    .winner-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 42px;
      color: #f5c800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      text-align: center;
      z-index: 1;
    }
    .prize-card {
      width: 100%;
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(245,200,0,0.12), rgba(255,255,255,0.03));
      border: 1px solid rgba(245,200,0,0.24);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      z-index: 1;
    }
    .prize-value {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 38px;
      color: #f5c800;
      line-height: 1;
    }
    .winner-hash {
      font-size: 13px;
      color: #ffffff;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-align: center;
    }
    .glow-button {
      border: none;
      border-radius: 999px;
      padding: 16px 24px;
      background: linear-gradient(135deg, #f5c800, #ffd54f);
      color: #060b08;
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      box-shadow: 0 0 36px rgba(245,200,0,0.6);
      cursor: pointer;
      z-index: 1;
    }
    .countdown-screen {
      width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 0;
      overflow: hidden;
      background: radial-gradient(circle at top, rgba(245,200,0,0.1), transparent 20%), #060b08;
      position: relative;
    }
    .countdown-bg {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }
    .particle {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: rgba(245,200,0,0.9);
      box-shadow: 0 0 18px rgba(245,200,0,0.6);
      animation: float 4s ease-in-out infinite alternate;
    }
    .particle:nth-child(1) { top: 12%; left: 18%; animation-delay: 0s; }
    .particle:nth-child(2) { top: 25%; left: 72%; animation-delay: 0.4s; }
    .particle:nth-child(3) { top: 42%; left: 30%; animation-delay: 0.2s; }
    .particle:nth-child(4) { top: 58%; left: 64%; animation-delay: 0.6s; }
    .particle:nth-child(5) { top: 80%; left: 48%; animation-delay: 0.3s; }
    .particle:nth-child(6) { top: 68%; left: 14%; animation-delay: 0.1s; }
    .particle:nth-child(7) { top: 22%; left: 50%; animation-delay: 0.5s; }
    .particle:nth-child(8) { top: 88%; left: 76%; animation-delay: 0.7s; }
    .countdown-number {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 120px;
      color: #f5c800;
      letter-spacing: 0.02em;
      opacity: 0;
      animation: pulse-scale 1.2s ease forwards;
      text-shadow: 0 0 40px rgba(245,200,0,0.4);
      line-height: 1;
    }
    .countdown-number:nth-of-type(1) { animation-delay: 0.1s; }
    .countdown-number:nth-of-type(2) { animation-delay: 0.5s; }
    .countdown-number:nth-of-type(3) { animation-delay: 0.9s; }
    .countdown-go {
      margin-top: 32px;
      font-family: 'Bebas Neue', sans-serif;
      font-size: 34px;
      color: #f5c800;
      letter-spacing: 0.08em;
      opacity: 0;
      animation: go-flare 1.2s ease forwards;
      animation-delay: 1.3s;
      text-shadow: 0 0 40px rgba(245,200,0,0.45);
    }
    @keyframes pulse-scale {
      0% { transform: scale(0.5); opacity: 0; }
      40% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes go-flare {
      0% { transform: scale(0.8); opacity: 0; }
      60% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes float {
      0% { transform: translateY(0) translateX(0); }
      100% { transform: translateY(-16px) translateX(4px); }
    }
    .onboarding-screen {
      width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 32px 18px;
      background: linear-gradient(180deg, #060b08 0%, #041007 100%);
      position: relative;
    }
    .brand-logo {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 46px;
      color: #f5c800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-shadow: 0 0 30px rgba(245,200,0,0.35);
    }
    .brand-logo::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
      transform: translateX(-120%);
      animation: shine 2.8s ease-in-out infinite;
    }
    @keyframes shine {
      0% { transform: translateX(-120%); }
      100% { transform: translateX(120%); }
    }
    .subtitle {
      margin-top: 12px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: #dcd78a;
      text-align: center;
    }
    .cta-group {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 28px;
    }
    .login-btn {
      width: 100%;
      border-radius: 999px;
      padding: 16px 18px;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 10px 28px rgba(245,200,0,0.28);
    }
    .login-btn.google {
      background: linear-gradient(135deg, #f5c800 0%, #efba30 100%);
      color: #060b08;
    }
    .login-btn.email {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(245,200,0,0.22);
      color: #f5c800;
    }
    .login-btn span {
      font-size: 20px;
    }
    .footer-note {
      margin-top: auto;
      font-size: 11px;
      text-align: center;
      color: #8c9f69;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      line-height: 1.6;
    }
  </style>
`;

const screens = [
  {
    name: 'dashboard-v2.png',
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Dashboard V2</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body><div class="screen"><div class="headline"><div><h1>Olá, DesafioGUT 👋</h1><p>Seu painel relâmpago</p></div><div class="badge">Relâmpago</div></div><div class="kpi-grid"><div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-label">Saldo</div><div class="kpi-value">R$ 4.850</div></div><div class="kpi-card"><div class="kpi-icon">🎟️</div><div class="kpi-label">Senhas</div><div class="kpi-value">8</div></div><div class="kpi-card"><div class="kpi-icon">⚡</div><div class="kpi-label">Lances Únicos</div><div class="kpi-value">13</div></div><div class="kpi-card"><div class="kpi-icon">📊</div><div class="kpi-label">Total de Lances</div><div class="kpi-value">127</div></div></div><div class="panel"><div class="panel-title"><h2>Edição Ativa</h2><span class="badge">RELÂMPAGO</span></div><div class="timer-block"><div><div class="timer-label">Próxima apuração</div><div class="timer-value">02:47</div></div><div class="strong-note">Conecte sua carteira para entrar</div></div></div><div class="hero-row"><div class="hero-card"><strong>Menor Lance Único</strong><span>R$ 0,05 — valor que aparece apenas 1 vez</span></div></div><div class="bottom-nav"><div class="item active"><div class="nav-icon">🏠</div>Início</div><div class="item"><div class="nav-icon">🎯</div>Lances</div><div class="item"><div class="nav-icon">👛</div>Carteira</div><div class="item"><div class="nav-icon">⋯</div>Mais</div></div></div></body></html>`
  },
  {
    name: 'mercado-v2.png',
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Mercado V2</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body><div class="screen"><div class="headline"><div><h1>Mercado de Lances</h1><p>Escolha seu modo</p></div></div><div class="glass-card"><div class="toggle-pill">⚡ Relâmpago&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;🎫 Programado</div><div class="circle-timer"><div class="circle-ring"><div class="inner"><div class="label">Tempo restante</div><div class="value">04:26</div></div></div></div></div><div class="glass-card"><div class="section-label">Seu lance</div><div class="input-pill"><input placeholder="Ex: 5 = R$ 0,05" /><button class="pill-button">CONFIRMAR LANCE</button></div></div><div class="glass-card"><div class="section-label">Tabela de lances</div><div class="table-list"><div class="table-card"><div class="avatar">A1</div><div class="table-content"><div class="title">0xAb...F123</div><div class="subtitle">Lance oculto</div></div><div class="hidden-chip">🔒</div></div><div class="table-card"><div class="avatar">B2</div><div class="table-content"><div class="title">0xCd...A456</div><div class="subtitle">Lance oculto</div></div><div class="hidden-chip">🔒</div></div><div class="table-card"><div class="avatar">C3</div><div class="table-content"><div class="title">0xEf...B789</div><div class="subtitle">Lance oculto</div></div><div class="hidden-chip">🔒</div></div></div></div><div class="bottom-nav"><div class="item"><div class="nav-icon">🏠</div>Início</div><div class="item active"><div class="nav-icon">🎯</div>Lances</div><div class="item"><div class="nav-icon">👛</div>Carteira</div><div class="item"><div class="nav-icon">⋯</div>Mais</div></div></div></body></html>`
  },
  {
    name: 'carteira-v2.png',
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Carteira V2</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body><div class="screen"><div class="headline"><div><h1>Minha Carteira</h1><p>Recargas e saldo</p></div></div><div class="kpi-grid"><div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-label">Saldo Disponível</div><div class="kpi-value">R$ 4.850</div></div><div class="kpi-card"><div class="kpi-icon">🎟️</div><div class="kpi-label">Saldo de Senhas</div><div class="kpi-value">8</div></div></div><div class="glass-card stacked-buttons"><button class="pill-button">COMPRAR FICHAS</button><button class="pill-button outline">DAR LANCE RELÂMPAGO</button></div><div class="glass-card"><div class="section-label">PIX e dados bancários</div><div class="info-label">Chave PIX</div><div class="info-value">chavepix@desafiogut.com</div><div class="divider"></div><div class="info-text">Banco: GUT Bank • Agência 0001 • Conta 123456-7 • CNPJ 00.000.000/0001-00</div></div><div class="bottom-nav"><div class="item"><div class="nav-icon">🏠</div>Início</div><div class="item"><div class="nav-icon">🎯</div>Lances</div><div class="item active"><div class="nav-icon">👛</div>Carteira</div><div class="item"><div class="nav-icon">⋯</div>Mais</div></div></div></body></html>`
  },
  {
    name: 'vencedor-v2.png',
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Vencedor V2</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body><div class="winner-screen"><div class="confetti"><div style="top: 8%; left: 14%; width: 8px; height: 24px;"></div><div style="top: 18%; left: 64%; width: 10px; height: 28px;"></div><div style="top: 26%; left: 35%; width: 6px; height: 20px;"></div><div style="top: 34%; left: 82%; width: 8px; height: 24px;"></div><div style="top: 46%; left: 12%; width: 10px; height: 28px;"></div><div style="top: 54%; left: 58%; width: 8px; height: 24px;"></div><div style="top: 62%; left: 28%; width: 6px; height: 18px;"></div><div style="top: 74%; left: 72%; width: 10px; height: 30px;"></div><div style="top: 82%; left: 44%; width: 8px; height: 24px;"></div></div><div class="winner-frame"><div class="winner-title">PARABÉNS!</div><div class="prize-card"><div class="winner-hash">Vencedor: 0xAb...F123</div><div class="prize-value">R$ 0,05</div></div><button class="glow-button">NOVA RODADA</button></div></div></body></html>`
  },
  {
    name: 'countdown-v2.png',
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Countdown V2</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body><div class="countdown-screen"><div class="countdown-bg"><div class="particle"></div><div class="particle"></div><div class="particle"></div><div class="particle"></div><div class="particle"></div><div class="particle"></div><div class="particle"></div><div class="particle"></div></div><div class="countdown-number">3</div><div class="countdown-number">2</div><div class="countdown-number">1</div><div class="countdown-go">VAI! ⚡</div></div></body></html>`
  },
  {
    name: 'onboarding-v2.png',
    html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Onboarding V2</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">${baseStyle}</head><body><div class="onboarding-screen"><div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 24px;"><div style="position: relative;"><div class="brand-logo">DesafioGUT</div></div><div class="subtitle">O JOGO DO MENOR LANCE ÚNICO!</div><div class="cta-group"><button class="login-btn google"><span>🟥</span>ENTRAR COM GOOGLE</button><button class="login-btn email"><span>✉️</span>ENTRAR COM EMAIL</button></div><div class="footer-note">Autenticação segura com Privy embutido e pagamento protegido.</div></div></div></body></html>`
  }
];

async function generateScreens() {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: MOBILE_WIDTH, height: MOBILE_HEIGHT }, deviceScaleFactor: 2 });

  try {
    for (const screen of screens) {
      await page.setContent(screen.html, { waitUntil: 'networkidle' });
      await page.waitForTimeout(250);
      const filePath = path.join(outputDir, screen.name);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`Saved ${screen.name}`);
    }
  } finally {
    await browser.close();
  }
}

generateScreens();
