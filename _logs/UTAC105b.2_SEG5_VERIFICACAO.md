# UTAC105b.2 — SEG5 · Verificação ad-hoc (2026-10-01)

## 5.1 Script ad-hoc
`C:/Users/Moltbot/tmp-utac105b2/seg5-utac105b2.mjs` — nome único, corre **uma vez**, fora do repo.
Corrido por cópia temporária em `netlify/functions/_tests/` (o duplo `@netlify/blobs` só resolve dentro da
árvore do frontend) e **apagada** no fim — conferido. Saída completa: `_logs/UTAC105b.2_SEG5_saida.txt`.

## 5.2 Saída real — **VERDE 14/14**
```
VERDE   anónimo + endereço da vítima → 401 e NÃO escreve   [status=401 escreveu=false]
VERDE   dono legítimo → 201 e escreve                      [status=201]
VERDE   admin → 201 e escreve                              [status=201]
VERDE   cota NOVA legítima → 201 e cria                    [status=201 id=cnpj:77788899000183]
VERDE   POST genérico PRESERVA `endereco`                  [endereco=0xaabb…ccdd]
VERDE   falha de leitura do store → 502 e NÃO escreve       [status=502]
VERDE   header 'bearer' minúsculo NÃO autoriza             [status=401]
VERDE   autenticado NÃO dono → 403 e NÃO escreve            [status=403]
VERDE   admin + cota nova → 201                            [status=201]
VERDE   [CONTROLO+] prova de posse → o registo É escrito (efeito visível)   [empresa=NOME NOVO]
VERDE   [CONTROLO+] o mesmo efeito NÃO passa sem prova de posse             [status=401]
VERDE   [V-1] dono repete → pagamento preservado (categoria/vendida/valor)  [cat=ouro vendida=true valor=55000]
VERDE   [V-2] POST genérico preserva tipo/empresa/segmento/pedidoId         [tipo=corporativo empresa=LOJA DA VITIMA pedidoId=ped-123]
VERDE   [V-2] e o DONO continua a conseguir update-corporativo (200, não 404) [status=200]
VEREDITO: VERDE  (14/14 verificacoes)
```
Cobre o 5.2 do enunciado (anónimo→403/401 sem escrever · dono→201 · admin→201 · cota nova→201 · POST
genérico preserva `endereco` · suíte) **e** os dois achados do SEG3 — as verificações `[V-1]`/`[V-2]` são
os **contra-testes** das correcções feitas depois do veredicto.

## 5.3 Controlos positivos
Dois, ambos VERDE: (a) com prova de posse o registo **é mesmo escrito** (a empresa muda — sem isto, um
«não escreveu» seria indistinguível de um medidor cego); (b) o **mesmo** efeito **não** passa sem prova
de posse. E, no lado dos instrumentos, a mutação inteira tem mutantes **equivalentes declarados** — o
que prova que a bateria distingue RED de «não aplicado»/«no-op» em vez de os confundir.

## 5.4 Suíte
`node scripts/mc966-suite-harness.mjs ambos` (da raiz, foreground) → **frontend 535/535 (inalterado) ·
backend 956/962** (= 931/937 do baseline **+25**, os testes deste UTAC) · **VEREDITO VERDE**.

## 5.5 VEREDITO DO SEG5: **SEGUIR** — verificação ad-hoc verde, com controlos positivos e com os
contra-testes das correcções pós-veredicto.
