# MC93-E — CI de contrato a correr + EVM local

**Projeto:** DesafioGUT · **Data:** 2026-09-24 · **Commit base:** `f8bc6c0`
**Modo:** COMPLETO (SEG-1 → SEG5) · **Veredito do SEG-1:** **AJUSTAR** · **R19:** não ativada
**Validador A** (CI + PostgREST): APROVADO COM RESSALVAS — 2 achados ⛔
**Validador B** (on-chain + arnês): APROVADO COM RESSALVAS — 2 achados ⛔
**Veredito final:** CONCLUÍDO **com ressalva material** (ver §5)

---

## Veredito em cinco linhas

1. **As duas pendências do MC93-D estão fechadas** — o nível 2 corre em CI, e o
   cenário on-chain existe. Medido, não afirmado.
2. **A minha correcção do CI nunca ficaria verde**, e não era por causa dela: dois
   testes antigos importam um pacote que o CI não instala. O Validador A apanhou.
3. **O meu gate da EVM não provava nada** — um `describe` saltado é invisível ao
   contador de saltos. O Validador B apanhou.
4. **`indexed` não entra no `topic0`**, e a corrupção que isso permite é
   silenciosa. O teste de deriva estava cego, apesar de eu o vender como correcção.
5. **Quinta vez consecutiva** que a validação independente encontra o que eu não
   encontro. E duas vezes, neste MC, o achado foi sobre o meu método.

---

## 1. EXECUTOR — o que foi construído

### 1.1 O SEG-1 refutou duas premissas do enunciado, por medição

| Premissa | Realidade medida |
|---|---|
| HARD GATE 3 via `act` | `act` **ausente**; cumprido por equivalente (Docker, mesmas imagens) |
| Fork via `ALCHEMY_URL` | é **credencial** (R5); os 3 RPC públicos testados recusaram |
| Nível 2 salta em CI | ✅ **confirmada** — `ci.yml` sem `env:` nem `services:` |

**Achado novo, fora do enunciado:** há uma chave de API Alchemy em texto simples
em `desafio-gut/hardhat.config.cjs`, **commitada desde o MC89.14** (`a2c40ee`).
Não foi tocada (R5). É acção do operador, e é a única coisa deste MC com prazo.

### 1.2 O erro de método que deu forma a tudo o resto

O MC93-D ensinou que `package.json` ≠ `node_modules`. Este mediu a terceira:

| fonte | hardhat | edr | solc |
|---|---|---|---|
| `node_modules` (esta árvore) | 2.28.0 | next.17 | 0.8.26 |
| `package.json` | `^3.4.0` | — | — |
| **`package-lock.json` — o que o CI corre** | **3.4.2** | **next.29** | **ausente** |

O meu primeiro protótipo usava `hardhat/internal/...` e funcionava. Teria dado
verde aqui e partido no CI. Reescrito contra a API pública do EDR — e a
portabilidade foi depois **provada a sério pelo Validador B**, que correu a suíte
contra o binário do next.29 (tirado da cache do npm, sem rede). A minha prova —
diffar a linha de `createProvider` — **não podia** revelar mudanças dentro de
`ProviderConfig`. A conclusão era certa; a evidência não a sustentava.

### 1.3 O que foi entregue

| | |
|---|---|
| CI de contrato | Postgres 17 (`service:`) + papéis + migração + PostgREST v12.2.3 + JWT |
| Guarda anti-regressão | `mc93e-ci-config.test.mjs` + um passo no próprio CI |
| Cenário on-chain | EVM em-processo sobre a API pública do EDR, ~2 s, sem rede |
| Fixture | ABI+bytecode versionados (`artifacts/` está em `.gitignore`) |
| Equivalente local | `ci-postgrest-local.sh` — mesmas imagens, com teste que o prova |

---

## 2. VALIDADORES — em série, em worktrees separados

### 2.1 Validador A — e o defeito que tornava tudo invisível

| | Achado | Estado |
|---|---|---|
| ⛔ | **O job não podia ficar verde.** `@aws-sdk/client-kms` não está no lockfile das functions; `mock.module` exige que resolva. Em CI: `ERR_MODULE_NOT_FOUND` | corrigido (`npm ci` no frontend) + **guarda geral** |
| ⛔ | **O teste dos CHECKs da migração era vácuo** — `assert.ok(error)`. Passava com a **tabela apagada** | corrigido: exige SQLSTATE `23514` |
| ⚠️ | **A minha guarda do `ci.yml` deixou passar 19 de 25 mutações (24 %)** | reescrita; 17/17 mortas |

**Três dessas mutações sobreviviam porque a asserção casava com um COMENTÁRIO**
do YAML. É a terceira vez no projeto — a primeira numa asserção em vez de numa
mutação.

⚠️ **Uma recomendação dele NÃO foi seguida, e a razão é o próprio achado dele:**
propôs usar `js-yaml` para parsear o workflow. Medido — `js-yaml` também não está
no lockfile das functions. A receita reproduziria a doença que o diagnóstico
tinha acabado de identificar.

### 2.2 Validador B — e dois defeitos que eu tinha vendido como correcções

| | Achado | Estado |
|---|---|---|
| ⛔ | **O gate da EVM não provava nada.** Um `describe` saltado não conta em `# skipped`; e o `grep "adicionarSenhas"` era satisfeito pelo teste de *selectores*, que nem toca na EVM | gate ancorado no **nome do teste decisivo** |
| ⛔ | **O teste de deriva era cego a `indexed` e à ordem** dos parâmetros do mesmo tipo | compara `indexed`, nomes e `stateMutability` |
| ⚠️ | A fixture só estava amarrada ao seu ABI pelo teste que **salta em CI** | selector de cada função tem de estar no bytecode |
| ⚠️ | **A minha ressalva "não é prendível" era falsa** | corrigido; ver abaixo |
| ⚠️ | "Só a coordenação credita senhas" não fixava a razão — ele trocou a mensagem por uma **enganadora** e passou | literal |

**O `indexed` merece o seu parágrafo.** `topic0 = keccak(sighash)`, e o sighash
não inclui `indexed`. Tirá-lo de `LanceDado.lancador` **mantém o mesmo topic0**,
e `getLanceDadoEvents` — que lê `args[0..4]` por posição — passa a devolver
lançador errado, `valor: 0`, `repetido: true`, **sem lançar excepção**.
`monitor-onchain.mjs` detectaria "anomalias" sobre lixo. Não é uma falha; é
corrupção silenciosa.

**E a ressalva falsa é a lição mais dura deste MC.** Eu escrevi, no próprio
teste, que o defeito da cache do ethers era "dependente de temporização" e não se
prendia. Não era o relógio: a cache é indexada pelos **argumentos**, e eu usava
`111` e depois `222` — duas chaves, nunca havia acerto. Com o mesmo argumento
reproduz 5 em 5. **Declarei uma impossibilidade a partir de uma tentativa
falhada** — exactamente o erro do SEG-1 do MC93-D, em ponto pequeno.

---

## 3. DOCUMENTADOR

### 3.1 Números

| | tests | pass | fail | skipped |
|---|---|---|---|---|
| base MC93-D | 543 | 535 | 0 | 8 |
| MC93-E, sem servidor | 590 | 584 | 0 | 6 |
| **MC93-E, condições do CI** | **590** | **589** | **0** | **1** |

O único salto é a leitura da mainnet, bloqueada pela R5 — e agora com alavanca
(`MAINNET_RPC_URL`), que antes não existia.

**Mutação: 39 mutantes · 37 mortos · 2 equivalentes declarados · 0 vivos**, em
três rondas (a própria, as que sobreviveram ao A, as que sobreviveram ao B).

### 3.2 As duas métricas que o enunciado pede

**Os validadores apanharam o que o Executor não viu?** Sim, os dois: 4 achados ⛔
e 13 mutações vivas que eu dava por cobertas. **Quinta vez consecutiva.**

**O que mudou de método?** Três coisas, todas nascidas de erro medido:
1. A verdade que o CI corre é o **`package-lock.json`** — há agora um teste que o exige.
2. Asserções sobre configuração executável leem-se **sem comentários** e ancoradas
   no **passo exacto**, nunca no agregado.
3. Uma impossibilidade declarada a partir de uma tentativa falhada **não é uma
   medição**.

---

## 4. ⛔ Para o operador

**ROTAR a chave Alchemy de `desafio-gut/hardhat.config.cjs`.** Texto simples,
commitada desde `a2c40ee` (MC89.14). Apagar o ficheiro não a tira do histórico.
Não foi tocada. Mesma classe da chave DeepSeek do MC89 e da EOA do MC59.11.

---

## 5. L-4 — o que não foi medido

1. ⛔ **O `ci.yml` nunca correu num runner do GitHub.** Sem `act`. Por provar:
   `${{ env.X }}` dentro de `run`, `$GITHUB_ENV` entre passos, `if: always()`, e
   `--network host` a alcançar um `services:` mapeado.
2. ⛔ **Deriva entre a fonte e o bytecode deployado em `0x0052…16cd`.**
3. ⚠️ Adulterar os `settings` da fixture continua invisível em CI.
4. ⚠️ A sentinela de rede do Validador B é JS; o addon nativo do EDR não foi
   medido ao nível do SO.
5. Cobertura global não medida.
6. ⚠️ **As correcções feitas depois dos dois validadores não passaram por uma
   terceira validação.** A ressalva é material.

---

## 6. A lição, ao quinto MC

O MC93-D acabou comigo a escrever que tinha confundido `package.json` com
`node_modules`. Este MC começou por eu medir a terceira fonte — e acabou com a
mesma armadilha a apanhar-me outra vez, do lado do CI, num ficheiro que nem era
meu.

Mas a parte que fica não é essa. É que **duas vezes, neste MC, eu vendi como
correcção uma coisa que não corrigia nada**: um gate que não conseguia ver a EVM
por correr, e um teste de deriva cego precisamente ao caso que corrompe dados em
silêncio. Os dois passavam. Os dois tinham comentários a explicar porque eram
rigorosos.

**Um teste verde escrito por quem escreveu o código mede a coerência entre os
dois, não a verdade de nenhum.** É a mesma frase do MC93-D. A diferença é que
desta vez ela aplica-se aos testes que eu escrevi *para corrigir* esse problema.
