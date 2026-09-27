// mc9953-servir-dist.mjs — servidor estático mínimo para o A/B pareado do MC99.5.3.
// Uso: node scripts/mc9953-servir-dist.mjs <pasta-dist> <porta>
// Serve o build REAL (mesmos ficheiros que o Netlify publica), sem compressão — o que interessa
// aqui é a CONTAGEM DE BYTES e a ORDEM dos pedidos, não o br do Netlify (os woff2 e o webp já vêm
// comprimidos, logo br não muda nada nestes formatos).
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const DIR = resolve(process.argv[2] || ".");
const PORTA = Number(process.argv[3] || 0);
if (!existsSync(DIR)) { console.error("ABORTA: pasta ausente " + DIR); process.exit(2); }

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".woff2": "font/woff2", ".webp": "image/webp",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".webm": "video/webm", ".mp4": "video/mp4", ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".map": "application/json",
};

const srv = createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  let p = normalize(decodeURIComponent(u.pathname)).replace(/^([/\\])+/, "");
  // O fallback do SPA só vale para ROTAS (sem extensão). Um asset inexistente tem de dar 404 —
  // senão um ficheiro que a build deixou de emitir aparece como `200 text/html` e a medição mente.
  if (p === "" || (extname(p) === "" && (!existsSync(join(DIR, p)) || statSync(join(DIR, p)).isDirectory()))) {
    p = "index.html";
  }
  const alvo = join(DIR, p);
  if (!existsSync(alvo) || statSync(alvo).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  const b = readFileSync(alvo);
  // ⚠️ NÃO pôr `no-store` aqui: foi o meu 1.º erro nesta medição. Sem cache utilizável, o browser
  // volta a pedir o MESMO ficheiro (o preload e o url() do CSS contam como 2 pedidos) e a contagem
  // de bytes sai DOBRADA — um artefacto do instrumento, não do Netlify (que serve os assets com
  // cache imutável). Com `public, max-age=3600` o preload é consumido, como em produção.
  res.writeHead(200, { "Content-Type": MIME[extname(alvo).toLowerCase()] || "application/octet-stream", "Content-Length": b.length, "Cache-Control": "public, max-age=3600" });
  res.end(b);
});
srv.on("error", (e) => { console.error("ERRO no servidor: " + e.message); process.exit(2); });
srv.listen(PORTA, "127.0.0.1", () => {
  console.log("SERVINDO " + DIR + " em http://127.0.0.1:" + srv.address().port + "/");
});
