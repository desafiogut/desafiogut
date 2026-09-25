# MC93-G — Sincronização do lockfile e activação do CI real

**Projeto:** DesafioGUT · **Data:** 2026-09-25 · **Commit base:** `99e78e4`
**Modo:** LEVE · **Veredito do SEG-1:** **SEGUIR** · **R19:** ativada
**Validador independente:** APROVADO COM RESSALVAS
**Veredito final:** **OBJECTIVO ATINGIDO, com ressalva material.**
Por HARD GATE 5, **não me declaro fechado** quanto a "CI verde".

---

## Veredito em cinco linhas

1. **O `ci.yml` do MC93-E correu num runner GitHub real, pela primeira vez.** Era
   a pendência material herdada. Está fechada por medição.
2. **A correcção funcionou:** `install` passou de falhar em ~3 s para **success em
   79 s**, e `lint` e `build` ficaram verdes na primeira corrida.
3. ⭐ **Duas afirmações do MC93-E deixaram de ser promessas:** os 5 testes
   `SERVIDOR:` e os 7 do cenário EVM passaram num runner, este último com
   hardhat/edr em versões que esta máquina não tem.
4. ⛔ **O CI está vermelho por duas causas, nenhuma deste MC:** um defeito meu do
   MC93-E (hash dependente de CRLF) e dívida de `npm audit` pré-existente.
5. ⛔ **A minha entrega tem prazo de validade**, e foi o Validador que o mostrou:
   o comando de build do próprio repositório desfaz o lockfile em silêncio.

---

## 1. EXECUTOR

### 1.1 A causa que o MC93-F registou estava incompleta

O MC93-F escreveu "lockfile dessincronizado", o que sugere alguém a editar o
`package.json` sem correr `npm install`. Medi, e não é isso:

- as 4 entradas em falta **não estão declaradas** no `package.json` — são transitivas
- o lock é **mais recente** que o `package.json` (MC91.6 vs MC89.47)
- zero ranges flutuantes nas 33 dependências

São **peerDependencies de pacotes de produção**: `typescript` de `abitype`,
`viem`, `ox`, `@biconomy/account`, `@solana/accounts`; `@tanstack/react-query` de
`wagmi`; `@types/react` de `valtio`, `zustand`, `@lit/react`. O npm 7+ auto-instala
peers; `--legacy-peer-deps` salta-os. Provado:

```
npm ci --dry-run                     -> EUSAGE
npm ci --dry-run --legacy-peer-deps  -> passa
```

O lock foi gerado no modo do `netlify.toml` e o `ci.yml` corre `npm ci` simples.
**Dois modos divergentes que nunca se cruzaram** até o MC93-F empurrar os 104
commits e o CI correr contra este código.

### 1.2 Só um dos quatro lockfiles estava dessincronizado

Raiz, `desafio-gut` e `netlify/functions` passam `npm ci --dry-run`. **Não lhes
toquei** — tocar seria alteração desnecessária, e cada regeneração é uma
oportunidade de bumpar transitivas sem razão.

### 1.3 A correcção, validada antes de tocar no repositório

Medida em cópia isolada (só `package.json` + lock, sem `node_modules`):

| | |
|---|---|
| pacotes | 1063 → **1067** |
| acrescentados | 4 (`typescript`, `@types/react`, `@tanstack/react-query`, `@tanstack/query-core`) |
| removidos | **0** |
| versões alteradas | **0** |
| `npm ci` estrito (ci.yml) | ✅ passa |
| `npm ci --legacy-peer-deps` (Netlify) | ✅ passa |

### 1.4 As 31 remoções que o diff escondia

`git diff --stat` mostrava 53 inserções e **31 remoções** para 4 adições. Auditei
em vez de ignorar: são 31 entradas da subárvore do vite que perderam o flag
`"dev": true`, porque `typescript` passou a ser alcançável pelo grafo de produção.

**Direcção medida: 31 dev→prod e 0 prod→dev** — instaladas em *mais* cenários,
nunca menos. E nada no repositório instala com `--omit=dev`/`--production`/
`NODE_ENV=production`/`NPM_FLAGS`; não há `.npmrc`. O Validador foi além e mediu o
efeito: sob `--omit=dev`, 932 pacotes com o lock antigo e **947** com o novo.

---

## 2. VALIDADOR (worktree próprio, sem ver o meu raciocínio)

**APROVADO COM RESSALVAS.** As sete afirmações: seis CONFIRMADAS ao número (com
controlo positivo — reproduziu o `EUSAGE` no lock antigo), uma **confirmada na
letra e refutada na substância**.

### ⛔ A-1 — A minha entrega tem prazo de validade

Verifiquei por execução própria antes de aceitar. Com o lock **novo**:

```
npm install --package-lock-only --legacy-peer-deps
  entradas: 1067 -> 1063
  sha do lock:            044780d8f5bdc5bf -> d1f12aafefad249c
  sha do lock PRÉ-MC93-G:                     d1f12aafefad249c   ← byte-idêntico
  e o npm ci volta a dar o MESMO EUSAGE nos MESMOS 4 pacotes
```

E o npm diz apenas **`up to date in 3s`** — em silêncio. Quem correr o build do
Netlify localmente, ou `npm run build:apk` (que chama `netlify build`), fica com o
lockfile revertido sem aviso, e o primeiro commit que o inclua parte o CI outra vez.

**Os dois modos não coexistem.** `npm ci` exige os peers; `npm install
--legacy-peer-deps` apaga-os. Nada arbitra, e nenhum teste detecta a reversão.

*Nota de justiça, medida:* o **build** do Netlify não quebra — o `npm install` é
permissivo e a árvore resolvida é idêntica. O dano é só no lockfile.

### ⛔ A-2 — O guarda da EVM não corre quando é mais necessário

| guarda | `if: always()` | no run real |
|---|---|---|
| `Prova de que o NIVEL 2 nao saltou` | ✅ tem | correu, `saltados=0` |
| `Prova de que a EVM nao saltou` | ⛔ **não tem** | **`skipped`** |

E o meu `mc93e-ci-config.test.mjs` exige `if: always()` para o primeiro (linha 193)
e **não** para o segundo (196-200). A lição que eu próprio escrevi no MC93-E —
*"Achado M17: sem isto, se o passo dos testes falhar a prova nem corre"* — foi
aplicada a metade dos sítios, e o meu teste de configuração passou **verde** com a
assimetria dentro. Só soube que os 7 testes de EVM correram por ler o log à mão.

### ⛔ A-3 — O CRLF causa duas falhas, não uma

O Validador foi compilar; eu não tinha ido. Com solc 0.8.26 (a versão que a fixture
declara), a partir da mesma fonte nas duas formas:

```
CRLF -> bytecode e4018201…  == fixture.bytecode ? TRUE
LF   -> bytecode bbd90c2c…  == fixture.bytecode ? FALSE
divergência a partir do hex 10012 de 10098 (cauda = metadados)
```

O solc embute um bloco CBOR com o **hash IPFS da fonte**, logo o bytecode depende
dos bytes exactos. ⇒ O teste do solc — hoje saltado — **também falharia em Linux**
se alguém seguisse a instrução do próprio skip, e com a mensagem errada ("foi
editada à mão?"). **A fixture do MC93-E não é reproduzível fora de Windows.**

### ⚠️ A-4 — Não existe `.gitattributes`

Com `core.autocrlf=true` global e sem `*.sol text eol=lf`, todo o ficheiro de texto
chega ao disco em CRLF e ao runner em LF. A-3 é a primeira manifestação; qualquer
fixture de bytes futura repete-a. **Regenerar a fixture sozinho não resolve.**

---

## 3. DOCUMENTADOR

### 3.1 O run real: 36080693006

| job | resultado | |
|---|---|---|
| `install` | ✅ success | 79 s — **1.ª vez**; antes falhava em ~3 s |
| `lint` | ✅ success | 69 s |
| `build` | ✅ success | 69 s |
| `test-functions` | ⛔ failure | **583 testes · 580 ✔ · 1 ✖ · 2 ﹣** |
| `test-onchain` | ⛔ failure | **24 testes · 22 ✔ · 1 ✖ · 1 ﹣** |
| `audit` | ⛔ failure | dívida pré-existente |

⭐ **Os cinco testes `SERVIDOR:` passaram** — Postgres 17 + PostgREST v12.2.3 +
papéis + migração + JWT funcionam num runner. O guarda deu `passados=9 saltados=0`.

⭐ **Os 7 testes do cenário EVM passaram**, com **hardhat 3.4.2 + edr next.29** —
versões que esta máquina não tem (tem 2.28.0 / next.17). A portabilidade contra a
API pública do EDR estava argumentada no MC93-E; agora está medida.

### 3.2 As duas causas do vermelho, separadas (HARD GATE 5)

**CAUSA 1 — `sha256` da fixture. Defeito meu, do MC93-E.**
```
em disco (Windows, CRLF) : 3a3c6ed8e6f259cf…   <- gravado na fixture
normalizado a LF         : ee745ccbe27a73c9…   <- o que o runner calculou
core.autocrlf            : true
```
`scripts/gerar-fixture-evm.cjs` hasheia bytes crus. **O teste nunca poderia passar
em CI**, e os avisos `LF will be replaced by CRLF` que vi em cada commit do
MC93-E/F eram a pista que não liguei.

**CAUSA 2 — `npm audit`. Dívida pré-existente.** `@xmldom/xmldom` (13 high),
`brace-expansion` (2 high), cadeia `decode-uri-component → wagmi`. O Validador
correu o audit nos **dois** lockfiles: **38 vulnerabilidades, 10 high, exit 1,
idêntico**. Desimputado por medição, não por alegação.

### 3.3 Métricas (SEG5.6)

- **lockfiles dessincronizados:** 1 de 4
- **tempo entre push e conclusão do CI:** push 01:08:18Z → run concluído ~01:12:30Z
  ≈ **4 min 10 s**. O `install`, que antes falhava em 3 s, levou 79 s.
- **jobs que correram pela primeira vez:** 5 (`lint`, `build`, `test-functions`,
  `test-onchain`, `audit`)

### 3.4 Decisões do operador (R18)

| # | Decisão | Onde |
|---|---|---|
| 1 | MC dedicado ao lockfile antes do MC94 | enunciado · SEG-1 · aqui |
| 2 | Modo LEVE, foco único | enunciado · SEG1 · aqui |
| 3 | CI verde como critério de fecho | enunciado · SEG1.4 · §3.5 aqui |

### 3.5 Declaração de R15 e de R19

**R15:** nenhuma correcção de rota foi necessária — a única decisão de execução foi
regenerar o lock em modo **estrito** e não com `--legacy-peer-deps`, o que está
justificado no SEG1.1 (o modo permissivo reproduziria o lock actual e não
corrigiria nada). Zero ficheiros de aplicação tocados.

**R19 (ativada):** o SEG-1 declarou, **antes de executar**, que era improvável o CI
ficar verde, porque corrigir o `install` desbloqueava cinco jobs nunca corridos.
Não propus ampliação, porque corrigir o que aparecesse a jusante seria código de
aplicação (HARD GATE 3). ⇒ A previsão confirmou-se, e o resultado é informação
nova, não um `.1` deste MC.

⚠️ **HARD GATE 5, lido à letra:** o critério era "CI verde". O CI correu e está
vermelho. **Não me declaro fechado** nesse ponto. O que se fechou — e está medido —
é a pendência "o `ci.yml` nunca correu num runner real".

---

## 4. ⛔ O que o próximo MC tem de fechar

1. **A-1 — um modo de instalação só.** `.npmrc` com `legacy-peer-deps=true` +
   lock regenerado nesse modo, **ou** `netlify.toml` a usar `npm ci`. Sem isto,
   este MC tem prazo de validade. *(Fora do âmbito: nem `.npmrc` nem
   `netlify.toml` estão autorizados aqui.)*
2. **A-4 + A-3 — `.gitattributes` com `*.sol text eol=lf`**, `git add
   --renormalize`, e só depois regenerar a fixture. Fecha as duas falhas de CRLF.
3. **A-2 — `if: always()` no `Prova de que a EVM nao saltou`**, e a asserção
   correspondente no `mc93e-ci-config.test.mjs`.
4. `npm audit` — dívida própria, independente disto.
5. `test_limiteMaxLancesUnicos()` do Foundry — herdado do MC93-F.
6. Chave Alchemy por rotacionar — operador (R5).

---

## 5. A lição

Este MC existia para tirar um lockfile do caminho, e tirou. Mas o que fica é outra
coisa: **três dos quatro defeitos que ele revelou são meus, do MC93-E, e nenhum
era visível sem um runner real.**

O hash da fixture não podia passar em CI — não "podia falhar": **não podia
passar**. O guarda que escrevi para provar que a EVM não saltava não corre quando a
EVM falha, e o teste que escrevi para impedir exactamente essa omissão só a
verifica em metade dos sítios. E a fixture que criei para ser portável não é
reproduzível fora do meu sistema operativo.

Escrevi no MC93-E que "um teste verde escrito por quem escreveu o código mede a
coerência entre os dois". Isto acrescenta uma segunda metade: **um teste que só
correu na máquina de quem o escreveu mede também o sistema operativo dele.**
