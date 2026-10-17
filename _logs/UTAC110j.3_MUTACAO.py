import hashlib, shutil, subprocess, sys, os
os.chdir(r"C:\Users\Moltbot\Desktop\DESAFIOGUT\desafio-gut\frontend")
BK=sys.argv[1]
GATE="src/components/TermosConsentimento.jsx"; CART="src/pages/MinhaCarteira.jsx"; CAR="src/components/CarrosselGUTO.jsx"
TESTES=["src/__tests__/utac110j3-gate-carteira.test.mjs","src/__tests__/utac110f-front-missoes.test.mjs","src/pages/__tests__/utac110g1-carteira-resgate.test.mjs"]
md5=lambda p: hashlib.md5(open(p,"rb").read()).hexdigest()
def rep(a,b):
    def f(s, a=a, b=b):
        if chr(13)+chr(10) in s: a, b = a.replace(chr(10), chr(13)+chr(10)), b.replace(chr(10), chr(13)+chr(10))
        assert s.count(a)==1,(a[:50],s.count(a)); return s.replace(a,b)
    return f
def antiga(s):  # repõe a ordem antiga: botões depois do resgate
    return open(BK+"/MinhaCarteira.bak.jsx",encoding="utf-8").read()
MUT=[
 ("M1 gate volta ao PNG estático",GATE,rep('<CarrosselGUTO size={TAMANHO_GUTO_GATE} slides={GUTO_GATE} />','<img src="/assets/guto/custom/guto-bemvindo.png" alt="GUTO" width={96} height={96} />')),
 ("M2 outro slide (não o das edições)",GATE,rep('Object.freeze([SLIDES[6]])','Object.freeze([SLIDES[0]])')),
 ("M3 sem nome acessível",GATE,rep(' role="img" aria-label="GUTO mascote"','')),
 ("M4 Carteira com a ordem antiga",CART,antiga),
 ("M5 vídeo sem muted (autoplay bloqueado)",CAR,rep('            muted\n','')),
 ("M6 vídeo sem fallback onError",CAR,rep('            onError={() => setFailed(true)}\n','')),
 ("M7 aviso 402 depois dos saldos",CART,lambda s: (lambda i,j,k: s[:i]+s[j:k]+s[i:j]+s[k:])(s.index("              {passeSemSaldo && ("), s.index("              {/* UTAC110d-front (Frente A)"), s.index("              {pontosErro && ("))),
]
ok=0
for nome,alvo,f in MUT:
    orig=open(alvo,"rb").read(); h0=md5(alvo)
    s=orig.decode("utf-8"); m=f(s); assert m!=s
    open(alvo,"wb").write(m.encode("utf-8")); assert md5(alvo)!=h0, "mutante não entrou"
    r=subprocess.run(["node","--test",*TESTES],capture_output=True,text=True,encoding="utf-8",stdin=subprocess.DEVNULL,timeout=300)
    open(alvo,"wb").write(orig); assert md5(alvo)==h0, "restauro falhou"
    fail=[l for l in r.stdout.splitlines() if l.startswith("ℹ fail")]
    n=int(fail[0].split()[-1]) if fail else -1
    print(f"{nome}: fail={n} -> {'PROVADO' if n>0 else 'SOBREVIVEU'}"); ok+= n>0
print(f"{ok}/{len(MUT)} PROVADOS")
