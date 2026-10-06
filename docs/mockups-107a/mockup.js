// UTAC107a-front — comportamento partilhado das pranchas de mockup (não é código de produção).
// 1) variantes  2) largura do ecrã (375 / 768 / 1024)  3) AUDITORES automáticos que correm no
// próprio browser: área de toque ≥ 48 px e Regra 1 (texto do conteúdo dentro de vidro).
// Os auditores leem o DOM renderizado — o número que aparece no ecrã é medido, não declarado.
(function () {
  "use strict";
  const MIN_TOQUE = 48;
  // Exceções da Regra 1 (decisão 10 do operador): BottomNav, modais, botões, rodapé.
  const PERMITIDO = ".glass, .vidro-antigo, .btn, button, .bottomnav, .modal, .rodape-legal, .campo, .marca, .barra-sis";
  const INTERACTIVO = "button, a[href], summary, input, select, textarea, [role=button], [role=tab]";

  function visivel(el) {
    if (!el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  }

  function auditar(fone) {
    const tela = fone.querySelector(".tela") || fone;
    // limpa marcas antigas
    fone.querySelectorAll(".falha-toque, .falha-glass").forEach((e) => e.classList.remove("falha-toque", "falha-glass"));
    // 1 — toque
    const alvos = [...fone.querySelectorAll(INTERACTIVO)].filter(visivel);
    const pequenos = alvos.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width < MIN_TOQUE || r.height < MIN_TOQUE;
    });
    pequenos.forEach((el) => el.classList.add("falha-toque"));
    // 2 — Regra 1
    const fora = new Set();
    const w = document.createTreeWalker(tela, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    let n;
    while ((n = w.nextNode())) {
      const p = n.parentElement;
      if (!p || !visivel(p)) continue;
      if (p.closest(PERMITIDO)) continue;
      fora.add(p);
    }
    fora.forEach((el) => el.classList.add("falha-glass"));
    const out = document.querySelector(`[data-relatorio="${fone.id}"]`);
    if (out) {
      const okT = pequenos.length === 0, okG = fora.size === 0;
      out.innerHTML =
        `<div class="${okT ? "ok" : "falha"}">toque: ${alvos.length} alvos · ${pequenos.length} &lt; ${MIN_TOQUE}px` +
        (pequenos.length ? ` (${pequenos.slice(0, 4).map((e) => { const r = e.getBoundingClientRect(); return Math.round(r.width) + "×" + Math.round(r.height); }).join(", ")}${pequenos.length > 4 ? "…" : ""})` : "") + `</div>` +
        `<div class="${okG ? "ok" : "falha"}">Regra 1: ${fora.size} bloco(s) de texto fora de vidro</div>`;
      out.dataset.toque = String(pequenos.length);
      out.dataset.regra1 = String(fora.size);
    }
    return { alvos: alvos.length, pequenos: pequenos.length, fora: fora.size };
  }

  function auditarTudo() {
    document.querySelectorAll(".fone[id]").forEach(auditar);
  }

  // variantes: <div data-variantes="x"> … botões [data-v] + painéis [data-painel]
  document.querySelectorAll("[data-grupo-v]").forEach((grupo) => {
    const alvo = document.getElementById(grupo.dataset.grupoV);
    const botoes = grupo.querySelectorAll("button[data-v]");
    botoes.forEach((b) => b.addEventListener("click", () => {
      botoes.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      alvo.querySelectorAll("[data-painel]").forEach((p) => { p.hidden = p.dataset.painel !== b.dataset.v; });
      const leg = document.querySelector(`[data-legenda="${grupo.dataset.grupoV}"]`);
      if (leg) leg.textContent = b.dataset.desc || "";
      requestAnimationFrame(auditarTudo);
    }));
    const inicial = grupo.querySelector('button[aria-pressed="true"]') || botoes[0];
    if (inicial) inicial.click();
  });

  // largura: aplica-se aos telefones «depois»
  document.querySelectorAll("[data-larguras]").forEach((grupo) => {
    const botoes = grupo.querySelectorAll("button[data-largura]");
    botoes.forEach((b) => b.addEventListener("click", () => {
      botoes.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      document.querySelectorAll(".fone.depois").forEach((f) => {
        if (b.dataset.largura === "375") f.removeAttribute("data-largura"); else f.dataset.largura = b.dataset.largura;
      });
      setTimeout(auditarTudo, 300);
    }));
  });

  // contraste WCAG (para tokens.html): cor de texto sobre o vidro composto sobre o fundo
  function hex(h) { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
  function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function razao(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function mistura(fg, a, bg) { return fg.map((v, i) => Math.round(a * v + (1 - a) * bg[i])); }
  window.GUT = { auditarTudo, auditar, contraste: { hex, razao, mistura } };

  window.addEventListener("load", auditarTudo);
  window.addEventListener("resize", () => { clearTimeout(window.__gutT); window.__gutT = setTimeout(auditarTudo, 200); });
})();
