// UTAC108e — controlo «estado» das pranchas v2 (com edição / sem edição). Mockup, não é produção.
// Os outros controlos (variante, largura) e os auditores (toque ≥ 48 px, Regra 1) são os do
// `../mockup.js` aprovado no 107a-front; aqui só se volta a correr o auditor depois de mudar o estado.
(function () {
  "use strict";
  document.querySelectorAll("[data-grupo-estado]").forEach((grupo) => {
    const fone = document.getElementById(grupo.dataset.grupoEstado);
    const botoes = grupo.querySelectorAll("button[data-estado]");
    botoes.forEach((b) => b.addEventListener("click", () => {
      botoes.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      fone.dataset.estado = b.dataset.estado;
      if (window.GUT) requestAnimationFrame(window.GUT.auditarTudo);
    }));
  });
})();
