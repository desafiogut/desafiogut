# METODOLOGIA DE SEGURANÇA — o método que a série SSRF produziu

> **Estado:** vivo · **Criado:** MC99.5.3 (2026-09-27) · **Origem:** 7 gerações de guardas SSRF no
> `img-proxy` do DesafioGUT, **6 delas refutadas por validadores adversariais** antes de a sétima
> ficar de pé.
>
> **Relação com as skills do agente.** Este documento **não substitui** as skills. As skills vivem
> fora do repo (`~/.hermes/skills/`, ex.: `security/ssrf-guard-testing`,
> `software-development/verification-blindspots`, `software-development/git-worktree-validation`,
> `software-development/adversarial-guard-hardening`) e são o manual de **como executar**; este
> documento é o **registo durável no repo** do que a equipa aprendeu, com os casos concretos do
> DesafioGUT. Quem não tem acesso às skills do agente tem aqui o essencial; quem as tem, usa-as —
> e ambos apontam para os mesmos números medidos.

---

## 0. A regra-mãe

**A guarda nunca vê o payload que escreveste — vê o que o parser entrega.**

Todo o resto é consequência desta frase. Um teste escrito sobre strings cruas mede a tua
imaginação; um teste sobre `new URL(alvo).hostname` mede o que a produção decide. O parser
WHATWG normaliza antes da guarda: `2130706433` → `127.0.0.1`, `%31%32%37.0.0.1` → `127.0.0.1`,
`127.0.0.1.` → `127.0.0.1` (o ponto cai), `[::ffff:127.0.0.1]` → `[::ffff:7f00:1]` (**hex**, não
decimal). Medido em `desafio-gut/frontend/netlify/functions/img-proxy.mjs`.

---

## 1. PoC ANTES de tocar no código

Nenhuma correcção começa antes de uma sonda re-executável provar o estado actual. Sem isso, não se
sabe se a correcção fechou alguma coisa.

**Caso medido (MC99.5.3, Frente B).** Antes de alargar `isBlockedIp`, o `scripts/mc9953-seg1-medir.mjs`
mediu as 6 faixas de propósito especial: decisão pura `isBlockedIp` = `false` e **handler real = `502`**.
Só depois se aplicaram as 6 linhas. Depois, a mesma sonda deu `false` → `true` e `502` → `403`.

**O discriminador que faz isto funcionar (403 vs 502):**

```
st === 403  -> a guarda BLOQUEOU
st === 502  -> *** a guarda DEIXOU PASSAR *** (só a ligação falhou)
st === 200  -> SSRF VIVO
```

Um destino inalcançável devolve o estado de erro a montante; um destino bloqueado devolve o estado
**da guarda**. Sem esta distinção, «tudo 403» e «tudo 502» confundem-se e a conclusão é falsa nos
dois sentidos. Foi assim que se provou o buraco do 6to4/Teredo e, no MC99.5.3, as 6 faixas
reservadas.

---

## 2. Controlos POSITIVOS obrigatórios

**«Bloquear tudo» passa em todos os controlos negativos.** Um proxy morto devolve 4xx/5xx a tudo e
parece uma guarda perfeita.

Por isso cada bateria tem de incluir um alvo público legítimo que **TEM** de passar, e o teste tem
de falhar se ele não passar:

```
https://cdn.jsdelivr.net/…  -> 200 image/*   (senão os 403 acima não valem nada)
https://i.imgur.com/…       -> 200 image/*
```

**Caso medido (a primeira geração).** A 1.ª versão do `isBlockedIp` faltava a linha que distingue
um **nome de domínio** de um IP, e passou a **bloquear `i.imgur.com`** — o proxy de imagens
recusava todas as imagens do app. Apanhado pelos controlos positivos, não pelos negativos.

**Nota importante:** um controlo local (`127.0.0.1`) **não serve** como controlo positivo — a
guarda bloqueia-o por desenho. O controlo positivo tem de ser um alvo **público real**.

---

## 3. A/B PAREADO: o instrumento que atribui a mudança à mudança

**Duas medições separadas não são uma comparação — são duas fotografias.** Sem os dois braços na
mesma passagem, cada número é interpretado à vontade: um 403 novo lê-se como regressão, um 502
antigo como buraco.

Regras do A/B pareado:

1. **Alternar os braços** na mesma passagem (`A,B,A,B,…`), nunca «corro tudo de A e depois tudo de B».
2. **N medições por braço** com mediana e intervalo, e a diferença **pareada** (medição a medição).
3. **Abrir alto se o alvo faltar.** Um instrumento que não encontra o ficheiro que mede devolve
   «0 falhas» — indistinguível de «está tudo bem». `if (!existsSync(GUARD)) process.exit(2)`.
4. **Controlo de CAPACIDADE:** correr o mesmo rig contra a versão ANTERIOR. Se o rig não produz o
   defeito no código antigo, «não encontrei» não vale nada.

**Caso medido (MC99.5.2.1e).** O A/B contra a guarda do commit anterior mostrou que **só os 4
payloads prefixados mudam** (`200/502/502/502` → `403/403/403/403`) e que **todo o resto é
idêntico** — incluindo o NXDOMAIN a 403 nos dois lados, que uma asserção minha acusava de
regressão. Era a asserção a ser mais estreita que o alvo.

**Caso medido (MC99.5.3, Frente A).** O A/B pareado dos preloads correu os dois braços a partir do
**mesmo build**, servidos em portas diferentes, mudando **só** as tags `<link rel="preload">`:
bytes totais idênticos (`953 580` B) e FCP melhor com preload nos dois pares (−24 ms e −12 ms).
Sem esta construção, o resultado seria indistinguível do ruído de rede.

**Como extrair a versão anterior para o A/B** (sem poluir o repo):

```js
const TEMP = resolve(DIR_FN, "_ab-old-" + process.pid + ".mjs");   // nome ÚNICO, dentro da pasta
process.on("exit", limpar);                                        // mesmo se rebentar
writeFileSync(TEMP, execFileSync("git", ["-C", R, "show", BASE + ":" + REL], { encoding: "utf8" }));
const VELHO = await import(pathToFileURL(TEMP).href);
```

**Armadilha medida no próprio instrumento:** o meu servidor de A/B mandava `Cache-Control: no-store`
e isso fez o browser pedir o **mesmo** ficheiro duas vezes (preload + `url()` do CSS), **dobrando** a
contagem de bytes nas duas arms. O defeito era do instrumento, não do alvo. Corrigido para
`public, max-age=3600`. *Se o número te parece favorável demais (ou esquisito), suspeita primeiro do instrumento.*

---

## 4. Validador adversarial independente (não é burocracia)

**6 das 7 gerações foram refutadas por um validador.** O validador recebe a instrução de **TENTAR
REFUTAR**, nunca de confirmar — e é isso que o torna útil.

O que o validador encontrou em cada geração (e que eu não vi):

| Geração | O que eu julgava fechado | O que o validador refutou com |
|---|---|---|
| 1.ª | literais IPv4 privados | `[::1]` entre brackets: o `hostname` vem COM brackets e o `:` faz saltar a verificação DNS |
| 2.ª | IPv6 mapeado | **formas comprimidas** (`2002:a00::1`): o `::` come o 2.º hexteto do IPv4 embutido, a regex exigia hextetos presentes |
| 3.ª | 6to4 + Teredo decodificados | **ISATAP** (`x::5efe:w.x.y.z`), **6rd** (prefixo do ISP) e **NAT64 com prefixo próprio** |
| 4.ª | descodificador completo | a família é **ABERTA por construção** — cada protocolo novo inventa uma forma nova de embutir um IPv4 |
| 5.ª | recusar todos os literais IPv6 | o buraco **mudou de porta**: os mesmos endereços entram por **nome de domínio** (`sslip.io`) |
| 6.ª | validar cada endereço do DNS | **split A/AAAA**: a guarda validava só o A e o `fetch` escolhia livremente o AAAA interno |
| 7.ª | (pin na ligação) | **NÃO REFUTADO** — e o validador exigiu o controlo de CAPACIDADE |

**A frase que fica:** *o buraco não fechou, mudou de porta de entrada.* Não reportes «fechado»
porque os literais dão 403 — pergunta **por onde é que a mesma família continua a entrar**.

**Onde o validador corre.** Num **worktree próprio** (`git worktree add`), nunca no repo principal
onde o autor está a trabalhar. O caminho do repo nos scripts tem de ser **derivado**
(`dirname(fileURLToPath(import.meta.url))`), nunca `hardcoded`: um mutador com o caminho do repo
principal escrito à mão **muta e restaura no repo errado**. Ver
`software-development/git-worktree-validation`.

---

## 5. Pin no momento da ligação (a correcção que fecha a classe)

O TOCTOU clássico: validar com `resolvesToBlocked(u.hostname)` e **depois** fazer `fetch(u.toString())`
resolve o DNS **duas vezes**; um DNS adversário responde público à 1.ª e interno à 2.ª.

A correcção **não é filtrar melhor o resultado da resolução** — é fazer com que o conector use o
endereço que **NÓS** validámos:

```js
// img-proxy.mjs (7.ª geração, implementada no MC99.5.2.1e)
function lookupValidado(hostname, _o, callback) {          // chamado pelo conector NA LIGAÇÃO
  resolverEEscolher(hostname).then(({ bloqueado, pin }) => {
    if (bloqueado) return callback(new Error(HOST_BLOQUEADO));   // a ligação NÃO acontece
    callback(null, [{ address: pin, family: 4 }]);               // UM endereço, o validado
  }).catch(() => callback(new Error(HOST_BLOQUEADO)));
}
const agenteValidado = new Agent({ connect: { lookup: lookupValidado } });
// no handler: SEM pré-check de DNS; a decisão e o endereço são o mesmo dado.
```

Factos medidos que a implementação exigiu:
- o `connect.lookup` do undici é chamado com `{ hints: 0, all: true }` → tem de devolver um **ARRAY**;
  devolver um escalar dá `Invalid IP address: undefined`;
- HTTPS/SNI continuam (o pedido vai por **nome**, só o endereço é fixado) — medido `200 image/*` nos CDNs;
- a recusa sobe em `err.cause.message` → permite responder **403** em vez de 502;
- **literais de IP não passam pelo lookup** (o dispatcher é omitido). Consequência dura:
  para literais, **a completude da lista estática é o único portão** — foi exactamente essa lacuna
  que o MC99.5.3 fechou com as 6 faixas reservadas.

**A pergunta certa depois do pin:** existe algum caminho em que a ligação **não** passe pelo nosso
lookup? (Foi assim que se viu que literais e redirects-para-literal saltam o dispatcher: a defesa
contra redirects assenta inteiramente em `redirect: "error"`.)

---

## 6. A tua própria lista é o ponto cego (o padrão que se repetiu 5×)

**A lista de payloads que escreves mede a tua imaginação, não a guarda.** E cada correcção especializa
o código para a forma que ela fecha — ficando cega à forma que deixa passar.

Casos medidos, todos da mesma família:
- a bateria de gate cobria o caminho do DNS **só** com nomes AAAA-only — nenhum com «A público +
  AAAA interno», que é precisamente a forma que a geração anterior deixava passar;
- «as 6 faixas são bloqueadas» fica **verde** mesmo que a guarda passe a bloquear tudo → é preciso o
  **COMPLEMENTO**: o vizinho imediato de cada faixa (`192.0.1.1`, `192.0.3.1`, `198.17.255.255`,
  `198.20.0.1`, `203.0.112.255`, `203.0.114.1`) tem de continuar a **PASSAR**;
- o teste de gate que asseria sobre o **texto-fonte** (`assert.match(src, /async function resolvesToBlocked/)`)
  ficava verde quer a função funcionasse quer não. *Antes de aceitar «N payloads, 0 bypass»:
  `grep -n "import\|assert" <ficheiro de teste>` e pergunta que ramo executa isto.*

**Regra prática:** escreve sempre as **três** direcções no mesmo ficheiro —
(a) o atacado é bloqueado; (b) o complemento continua permitido; (c) um controlo positivo vivo é servido.

---

## 7. Medir risco > estimar risco

Duas classificações de risco erradas nesta série, ambas por **memória** em vez de medição:

1. «DNS rebinding exige DNS hostil ou comprometido — improvável.» **Havia um serviço público de
   wildcard DNS** (`sslip.io`, `nip.io`, `localtest.me`) que tornava o ataque banal e **estático**:
   o nome é um domínio legítimo e codifica o endereço que quiseres.
2. «O classificador maduro já cobre o essencial.» Faltavam-lhe 6 faixas de propósito especial
   (RFC 6890) — e a lista do autor não as tinha, a do adversário tinha.

**Protocolo:** antes de escrever «improvável», pergunta **existe algum serviço público que torne isto
banal?** Se existir, não é improvável — e a classificação confortável **é** o defeito.

**Corolário: declarar a lacuna NÃO é tratá-la.** Escrever «este caminho está aberto e não testado»
num relatório não o fecha, e a frase passa a fazer o trabalho de uma desculpa. Uma lacuna declarada
é um **TODO com contagem decrescente**: ou ganha teste/guarda, ou diz-se claramente o que falta e
quem decide.

---

## 8. Classificar com honestidade: guarda ≠ SSRF vivo

Três coisas que se confundem com facilidade e **nunca** devem ser misturadas num relatório:

1. **Payload que passa a guarda** (refutação da *regra*) — medido, com comando.
2. **SSRF vivo** (o payload alcançou o alvo) — exige rota/ligação real (controlo de capacidade).
3. **NÃO MEDIDO, e porquê** — declarar em vez de omitir.

**Caso medido (MC99.5.3).** As 6 faixas reservadas **passavam a guarda** (`502`, medido) mas **não
eram SSRF vivo**: são globalmente não-roteáveis e a metadata cloud (`169.254.169.254`) já estava
bloqueada. A classificação honesta — «passa a guarda, sem alvo interno» — é o que justifica tratá-las
como higiene de classificador e **não** como incidente.

---

## 9. Integridade do instrumento (9 modos medidos de mentir sem dar erro)

Esta classe de trabalho vive de PoCs, mutadores e verificadores escritos à pressa. Todos os modos
abaixo foram medidos **nesta série**, com o mesmo sintoma: **um número favorável e imóvel**.

1. **O instrumento que deixou de correr e continua a ser citado.** Um PoC copiado de
   `netlify/functions/` para `scripts/` passou a dar `ERR_MODULE_NOT_FOUND` — e «34 payloads,
   0 bypass» foi citado em **3 relatórios e 1 commit** sem nunca mais ter corrido. *Mover um
   instrumento ⇒ corrê-lo logo a seguir e ver o controlo positivo.*
2. **O verificador que nunca executou.** Regex com grupo desequilibrado (`SyntaxError`), `require`
   em escopo ESM (`ReferenceError`): mede **zero** e o exit code lê-se como «há defeitos». Usa
   **listas em vez de regex aninhadas** e prova que o verificador **consegue falhar**.
3. **A asserção mais estreita que o alvo** (falso vermelho) — 7× na série. *Quando uma asserção
   falha, a primeira hipótese é o instrumento.*
4. **Comentários contaminam greps** — 14×. O comentário da correcção nomeia o payload/o valor; quem
   «verifica» por grep ao ficheiro crú conclui mal nos dois sentidos. Mede **por execução**, ou
   apaga comentários antes do grep.
5. **A cegueira do ESM:** `import dns from "node:dns/promises"` no topo do instrumento faz *snapshot*
   do valor e o contador fica a **0 sem dar erro**. Patchar com `createRequire(<pasta do alvo>)`
   **antes** do `import()` do alvo, e **auto-verificar** o instrumento.
6. **O caminho hardcoded:** um mutador com o repo principal escrito à mão muta e restaura no
   **repo errado**.
7. **`no-store` no servidor de A/B** → contagem de bytes **dobrada** (MC99.5.3, secção 3).
8. **`process.exit()` no Windows** rebenta o teardown do libuv *depois* de todo o output correcto
   (`Assertion failed: … async.c`, exit 127). Usar `process.exitCode` e deixar o event loop drenar.
9. **A suíte verde só vale pelo que a lista dela cobre.** Antes de citar um número: *o caminho que
   estou a afirmar está fechado tem teste? que ramo o executa?*

---

## 10. Mutação: TRÊS estados, não dois (R16)

Todo o teste que nasce verde precisa de mutação — **e o mutante tem de ser confirmado a ENTRAR**
antes de se ler o resultado.

```
PROVADO    mutante entrou + suíte RED                              -> a guarda morde
OBSOLETA   mutante entrou + suíte verde PORQUE a mutação cai em    -> verde ESPERADO
           código que outra mudança tornou INALCANÇÁVEL              (documentar o porquê)
VÁCUO      mutante entrou + suíte verde em código VIVO             -> alarme real
```

**O mutante vale pelo que ele mata.** No MC99.5.3, além de repor cada faixa, correu-se o mutante
**da direcção oposta** — alargar demais (`192.0.0.0/24` sem o `c`, apanhando `192.0.1.x`) e
«bloquear tudo» (`if (a >= 1) return true`). Só o mutante que alarga demais mata a asserção do
**complemento**; é ele que prova que a asserção do complemento não é decorativa.

Uma mutação **OBSOLETA** é também um mapa: se o mutante deixa de doer, pergunta **por onde é que
aquele código continua vivo**.

---

## 11. A aliança que fecha o ciclo

| Fase | Instrumento | O que produz |
|---|---|---|
| 1 | PoC re-executável (`403` vs `502`) | o estado **antes** |
| 2 | mutação dos 3 estados | a suíte **morde**? |
| 3 | A/B pareado contra a versão anterior | a mudança é **atribuível**? |
| 4 | validador adversarial em worktree | o que **eu não vi** |
| 5 | controlos positivos vivos | a guarda não é «bloqueia tudo» |
| 6 | sondas de produção | o que **está publicado** é o que eu validei? |

**A regra que fecha a série:** *um total só entra num relatório depois de contado por um
instrumento que não saiba o resultado.* Verificar um número contra si mesmo não é verificar — é repetir.

**E a mais desconfortável de todas:** *commitado ≠ publicado.* O repo pode bloquear e a produção
continuar na geração anterior. Mede sempre o **endpoint de produção** (N3 remoto) antes de escrever
«fechado».

---

## 12. Ficheiros desta série (o resto é executável, não narrativa)

| Ficheiro | Para que serve |
|---|---|
| `desafio-gut/frontend/netlify/functions/img-proxy.mjs` | a guarda (7.ª geração + Opção A das faixas reservadas) |
| `desafio-gut/frontend/netlify/functions/_tests/img-proxy.test.mjs` | teste bidireccional + complemento + controlo positivo |
| `scripts/mc9953-seg1-medir.mjs` | sonda de estado (N1 + N3 + grafo de módulos + fontes) |
| `scripts/mc9953-prova-mutacao.mjs` | mutação da Frente B (5 mutantes, 3 direcções) |
| `scripts/mc9953-prova-mutacao-frente-a.mjs` | mutação da Frente A (repor cada defeito) |
| `scripts/mc9953-ab-performance.mjs` | A/B pareado dos preloads (2 braços, mesmo build) |
| `scripts/mc9953-servir-dist.mjs` | servidor de A/B (aviso do `no-store` no código) |
| `scripts/mc99521e-bidirecional.mjs` | bateria da 7.ª geração (403 vs 200, isco em `::1`) |
| `scripts/mc99521e-ab-guardas.mjs` | A/B pareado contra a guarda anterior |
| `scripts/mc99521e-producao.mjs` | sondas contra a produção |

**Skills do agente que este documento complementa** (fora do repo, em `~/.hermes/skills/`):
`security/ssrf-guard-testing` (o manual completo desta classe), `security/evm-onchain-verification`,
`software-development/verification-blindspots` (a suíte que não morde),
`software-development/adversarial-guard-hardening`, `software-development/git-worktree-validation`,
`software-development/systematic-debugging`.
