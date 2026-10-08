// utac108f-sem-lojista.test.mjs — UTAC108f. O lojista saiu do app (decisão estrutural do manifesto 108a;
// o Marinho trata dos lojistas pessoalmente). Guardas: nada do lojista volta, e o que FICA (admin, cotas.mjs,
// admin/Cotas.jsx, os endpoints vivos) continua lá.
// Corre com:  node --test src/__tests__/utac108f-sem-lojista.test.mjs   (a partir de desafio-gut/frontend)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRONT = resolve(SRC, "..");
const ler = (p) => readFileSync(resolve(SRC, p), "utf8");
const codigo = (s) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

test("rotas: nenhuma rota `/corporativo*`, `/seguranca` nem `/seja-nosso-parceiro` no router", () => {
  const app = codigo(ler("App.jsx"));
  assert.doesNotMatch(app, /path="\/corporativo/);
  assert.doesNotMatch(app, /path="\/seguranca"/);
  assert.doesNotMatch(app, /path="\/seja-nosso-parceiro"/);
  assert.doesNotMatch(app, /CorporativoRoute|temAcessoDiretoCadastro|Navigate to="\/corporativo"/);
  // controlo: o admin, o retorno OAuth e o catch-all continuam
  assert.match(app, /<Route path="\/admin" element=\{<AdminAuthProvider><AdminLayout \/><\/AdminAuthProvider>\}>/);
  assert.match(app, /<Route path="cotas"\s+element=\{<AdminCotas \/>\} \/>/);
  assert.match(app, /<Route path="\/redirect"/);
  assert.match(app, /<Route path="\*" element=\{<Navigate to="\/" replace \/>\} \/>/);
});

test("navegação: sem abas/itens do lojista no BottomNav e na Sidebar; sem atalho «Parceiro» no Início", () => {
  const bn = codigo(ler("widgets/layout/BottomNav.jsx"));
  const sb = codigo(ler("widgets/layout/Sidebar.jsx"));
  for (const [nome, c] of [["BottomNav", bn], ["Sidebar", sb]]) {
    assert.doesNotMatch(c, /CORP_TABS|CORPORATIVO_ITEMS|\/corporativo|\/seguranca|seja-nosso-parceiro|tipoUsuario/, `${nome} ainda tem o lojista`);
  }
  assert.doesNotMatch(codigo(ler("pages/Dashboard.jsx")), /seja-nosso-parceiro|Seja Nosso Parceiro/);
  // controlo: as 4 abas do comprador continuam
  for (const p of ["/carteira", "/mercado", "/ofertas-programadas"]) assert.match(bn, new RegExp(`path: "${p}"`));
});

test("contexto: o isolamento que mandava o lojista para /corporativo saiu (R18-B)", () => {
  const ac = codigo(ler("context/AppContext.jsx"));
  assert.doesNotMatch(ac, /rotasProibidas|navigate\("\/corporativo"/);
  // o tipo continua a ser calculado — o «Sem saldo» (108c, R18-B) depende dele
  assert.match(ac, /const tipoProvavel = /);
  assert.match(codigo(ler("components/SemSaldoBanner.jsx")), /tipoProvavel === "corporativo"/);
});

test("ficheiros do lojista apagados; os partilhados/admin FICAM", () => {
  for (const p of ["pages/CorporativoDashboard.jsx", "pages/CorporativoCotas.jsx", "pages/CorporativoBanners.jsx",
    "pages/CorporativoAnalytics.jsx", "pages/CorporativoCarteira.jsx", "pages/CorporativoCupons.jsx",
    "pages/SejaNossoParceiro.jsx", "pages/Seguranca.jsx", "components/CotaInativa.jsx", "components/BannerUpload.jsx",
    "components/BannerCard.jsx", "components/WalletCard.jsx", "lib/acessoDiretoCadastro.js",
    "components/glass/ModeSelector.jsx", "components/SemEdicaoAviso.jsx"]) {
    assert.equal(existsSync(resolve(SRC, p)), false, `${p} voltou`);
  }
  for (const p of ["pages/admin/Cotas.jsx", "pages/admin/Aprovacoes.jsx", "pages/Cadastro.jsx", "pages/LoginEmail.jsx"]) {
    assert.equal(existsSync(resolve(SRC, p)), true, `${p} foi apagado (não devia)`);
  }
});

test("backend: cotas.mjs e os endpoints vivos (pagamento, rastreio, LGPD, crons) continuam (R18-A)", () => {
  for (const ep of ["cotas", "webhook-mercadopago", "webhook-frenet", "exportar-dados", "health",
    "consolidar-lances", "pontuacao", "fila-processor-scheduled", "scheduled-encerrar-especial"]) {
    assert.ok(existsSync(resolve(FRONT, "netlify", "functions", `${ep}.mjs`)), `${ep}.mjs foi removido`);
  }
});
