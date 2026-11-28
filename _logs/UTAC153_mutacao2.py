import io, os, shutil, hashlib, subprocess
os.chdir(r"C:\Users\Moltbot\Desktop\DESAFIOGUT\desafio-gut\frontend\netlify\functions")
T = ["_tests/utac153-cors-ios.test.mjs", "_tests/mc8816-cors-todas-respostas.test.mjs"]
def md5(p): return hashlib.md5(open(p,"rb").read()).hexdigest()
def fails():
    r = subprocess.run(["node","--test","--experimental-test-module-mocks",*T], capture_output=True, text=True, encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL, timeout=600)
    l = [x for x in (r.stdout+r.stderr).splitlines() if x.startswith("ℹ fail")]; return int(l[-1].split()[-1]) if l else -1
M = [("M9 resposta antes do preflight (admin-config)", "admin-config.mjs", "const pf = respostaPreflight(req);", "const x0 = 1; const pf = respostaPreflight(req);"),
     ("M10 429 volta à constante", "_lib/rate-limiter.mjs", "          ...cabecalhosCors(),", '          ...cabecalhosCors("https://localhost"),')]
print("baseline", fails())
for n, f, a, b in M:
    o = md5(f); bk = f + ".u153bak"; shutil.copy2(f, bk)
    try:
        s = io.open(f, encoding="utf-8", newline="").read(); assert s.count(a) == 1, (n, s.count(a))
        io.open(f, "w", encoding="utf-8", newline="").write(s.replace(a, b)); k = fails()
    finally:
        shutil.copy2(bk, f); os.remove(bk)
    print(f"{n}: fail={k} -> {'RED' if k > 0 else 'SOBREVIVE'} | md5 {'IDENTICO' if md5(f) == o else 'DIFERENTE'}")
