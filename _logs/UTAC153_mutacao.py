# UTAC153 — prova de mutação do CORS. Restauro por cópia + md5.
import io, os, hashlib, shutil, subprocess, sys
os.chdir(r"C:\Users\Moltbot\Desktop\DESAFIOGUT\desafio-gut\frontend\netlify\functions")
TESTES = ["_tests/utac153-cors-ios.test.mjs", "_tests/mc8816-cors-todas-respostas.test.mjs"]
BAK = os.environ.get("TEMP", ".") + r"\utac153_bak"
os.makedirs(BAK, exist_ok=True)
def md5(p): return hashlib.md5(open(p, "rb").read()).hexdigest()
def correr():
    r = subprocess.run(["node", "--test", "--experimental-test-module-mocks", *TESTES], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL, timeout=600)
    fail = [l for l in (r.stdout + r.stderr).splitlines() if l.startswith("ℹ fail")]
    return int(fail[-1].split()[-1]) if fail else -1

C = "_lib/cors.mjs"
MUTANTES = [
  ("M1 reflecte qualquer origem", C,
   'return typeof origem === "string" && ORIGENS_NATIVAS_PERMITIDAS.includes(origem) ? origem : ORIGEM_APK;',
   'return typeof origem === "string" && origem ? origem : ORIGEM_APK;'),
  ("M2 comparação sem caixa (toLowerCase)", C,
   'ORIGENS_NATIVAS_PERMITIDAS.includes(origem) ? origem : ORIGEM_APK;',
   'ORIGENS_NATIVAS_PERMITIDAS.includes(origem.toLowerCase()) ? origem : ORIGEM_APK;'),
  ("M3 preflight não regista a origem", C,
   "  registarOrigemDoPedido(req);\n  if (req?.method", "  if (req?.method"),
  ("M4 cabecalhosCors ignora o contexto", C,
   "export function cabecalhosCors(origem = contextoCors.getStore()?.origem) {",
   "export function cabecalhosCors(origem) {"),
  ("M5 jsonCacheavel volta à constante", "_lib/http-cache.mjs",
   '...cabecalhosCors(req?.headers?.get?.("origin") ?? undefined),', "...cabecalhosCors(null),"),
  ("M6 jsonResponse volta à constante", "_lib/validate.mjs",
   "      ...cabecalhosCors(),", '      ...cabecalhosCors("https://localhost"),'),
  ("M7 contexto global em vez de por pedido", C,
   "  contextoCors.enterWith({ origem });",
   "  globalThis.__o = origem; contextoCors.enterWith({ get origem() { return globalThis.__o; } });"),
  ("M8 iOS sai da lista", C,
   '  "capacitor://localhost",  // iOS (Capacitor)\n', ""),
]
base = correr(); print("baseline fail =", base)
if base != 0: print("PARAR"); sys.exit(2)
res = []
for nome, f, old, new in MUTANTES:
    orig = md5(f); bak = os.path.join(BAK, os.path.basename(f)); shutil.copy2(f, bak)
    try:
        s = io.open(f, encoding="utf-8", newline="").read()
        if "\r\n" in s: old, new = old.replace("\n", "\r\n"), new.replace("\n", "\r\n")
        assert s.count(old) == 1, (nome, s.count(old))
        io.open(f, "w", encoding="utf-8", newline="").write(s.replace(old, new)); n = correr()
    finally:
        shutil.copy2(bak, f)
    ok = md5(f) == orig; res.append(n > base)
    print(f"{nome}: fail={n} -> {'RED (morde)' if n > base else 'SOBREVIVE'} | restauro md5 {'IDENTICO' if ok else 'DIFERENTE <-- PARAR'}")
    if not ok: sys.exit(3)
print(f"mortos {sum(res)}/{len(res)}")
