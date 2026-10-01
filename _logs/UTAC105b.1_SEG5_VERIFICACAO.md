# UTAC105b.1 — SEG5 · Verificação ad-hoc (2026-10-01)

## 5.1 Script ad-hoc
`C:/Users/Moltbot/tmp-utac105b1/seg5-utac105b1.mjs` — nome único, corre **uma vez**, fora do repo.
Corrido através de uma **cópia temporária** em `netlify/functions/_tests/` (o duplo `@netlify/blobs`
só resolve dentro da árvore do frontend) **apagada no fim** — verificado.

## 5.2 Saída real — VERDE 13/13
```
VERDE  sem token → 401 e NAO escreve  [status=401 escreveu=false empresa="Original"]
VERDE  token de OUTRO → 403 e NAO escreve  [status=403 escreveu=false empresa="Original"]
VERDE  token do DONO → 200 e escreve  [status=200 escreveu=true empresa="Nova"]
VERDE  ADMIN → 200 e escreve  [status=200 escreveu=true empresa="Nova"]
VERDE  token EXPIRADO → 401 e NAO escreve  [status=401 escreveu=false]
VERDE  header 'bearer' minúsculo NAO autoriza  [status=401]
VERDE  header 'Bearer ' vazio NAO autoriza  [status=401]
VERDE  conhecer o cliente_id NAO autoriza  [status=401]
VERDE  dono de OUTRA cota (cliente_id de terceiro) → 403  [status=403 escreveu=false]
VERDE  GET ?cliente_id com token do dono continua a responder 200  [status=200]
VERDE  GET ?cliente_id SEM token continua 401 (regra MC87 intacta)  [status=401]
VERDE  [CONTROLO+] o efeito é VISÍVEL: empresa muda  [empresa="ADULTERADO"]
VERDE  [CONTROLO+] o mesmo efeito NÃO passa sem token  [status=401 empresa="Original"]
VEREDITO: VERDE  (13 verificacoes)
```
Os 5.2 do enunciado estão todos cobertos: sem token → 401 · token alheio → 403 · dono → 200 · admin →
200 · **nenhum outro endpoint afectado** (as duas verificações do ramo vizinho `GET`, que continua
`200` com token do dono e `401` sem token — regra MC87 intacta).

## 5.3 Controlo positivo
Duas verificações embutidas, ambas VERDE: (a) o efeito **é visível** (gravar muda mesmo a empresa —
sem isto, um «não escreveu» seria indistinguível de um medidor cego); (b) o **mesmo** efeito **não
passa** sem token. Ausência de prova ≠ prova de ausência.

## 5.4 Verificação em PRODUÇÃO — feita pelo OPERADOR (não pelo executor)
> «Verificado em produção: `update-corporativo` sem token → **401 ✅**; `GET /cotas` → **200 ✅**.
> Comportamento é o pretendido.»
O executor **não** tinha autorização para tocar em Supabase/Netlify e **não** exercitou o painel num
browser. Esta medição independente, em produção, **fecha a única lacuna** que o SEG2 tinha declarado
(o painel real). Atribuída ao operador — não é medição do executor. (O operador confirmou-o na
mensagem de 2026-10-01, depois de notar que o commit foi publicado pelo push da sessão paralela.)

## 5.5 Suíte
`node scripts/mc966-suite-harness.mjs ambos` (da raiz, foreground) →
**frontend VERDE 535/535 · backend VERDE 931/937** (= 913/919 do baseline **+18**, os testes deste
UTAC). **VEREDITO: VERDE.**

## 5.6 VEREDITO DO SEG5: **SEGUIR** — verificação ad-hoc verde, com controlos positivos, e produção
confirmada de forma independente pelo operador.
