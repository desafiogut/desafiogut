# MC93-D — Validação de contrato + sweeper da dívida órfã

**Projeto:** DesafioGUT · **Data:** 2026-09-24 · **Commit base:** `d2c4719`
**Modo:** COMPLETO (SEG-1 → SEG5) · **Veredito do SEG-1:** **AJUSTAR** · **R19:** não ativada
**Validador A** (contrato PostgREST): APROVADO COM RESSALVAS
**Validador B** (contrato on-chain): APROVADO COM RESSALVAS no código · **PARTE 1 REPROVADO**
**Veredito final:** CONCLUÍDO **com ressalva material**

---

## Veredito em cinco linhas

1. **A migração deixou de ter cobertura zero** — aplicada a um PostgreSQL real, com os 8 CHECKs exercidos.
2. **O P0 do MC93-C está provado contra o servidor**, não só pela biblioteca: `.eq(col,null)` → `22007`.
3. **O sweeper que eu criei era um moto-contínuo** — ~51.840 linhas/dia. Corrigido.
4. **A minha refutação do fork on-chain era FALSA.** O hardhat funciona, o EDR está instalado, e o operador decidiu com base no meu erro.
5. **Quarta vez consecutiva** que a validação independente encontra o que eu não encontro.

---

## 1. EXECUTOR — o que foi construído

### 1.1 O SEG-1 refutou quatro premissas; uma delas era minha e estava errada

| Premissa do enunciado | Realidade |
|---|---|
| `supabase start` corre | Docker instalado mas **parado** → o senhor mandou arrancá-lo ✅ |
| `anvil`/`hardhat node` disponíveis | anvil ausente; **mas o hardhat funciona** — ver §2.2 |
| Query com `updated_at < now() - interval` | a coluna é `atualizado_em`, e **a janela esconde o caso mais comum** |
| Ajuste do tipo de tarefa | **no-op** — já estava correcto desde o MC93-C |

Duas armadilhas de ambiente, contornadas sem tocar no que não devia: `supabase start` rebentava por causa do **BOM UTF-8** em `frontend/.env` (ficheiro de credenciais — levantei o Supabase numa pasta limpa fora do repo) e o container `storage-api` ficava unhealthy (excluí os serviços supérfluos).

### 1.2 O que ficou medido contra software real

| | |
|---|---|
| `.eq(col, null)` numa TIMESTAMPTZ | **ERRO `22007`** — confirma o P0 do MC93-C |
| `.is(col, null)` | funciona |
| `.eq(col, false)` num booleano | funciona — o CAS do store estava certo |
| compare-and-set | 1.ª reclamação: 1 linha · 2.ª: **0** |
| upsert parcial | **preserva** as não listadas — o MC93-C assumiu, agora está medido |
| CHECKs da migração | recusam maiúsculas, negativos, liquidar sem bónus |

### 1.3 O sweeper, e as três decisões que o afastam do enunciado

Critério de **estado, não de idade**; **no-op enquanto a emissão estiver desarmada**; e `order`+`limit` no **servidor** com dedup contra a fila.

---

## 2. VALIDADORES — em série, em worktrees separados

A regra nasceu do MC93-C, onde dois validadores em paralelo se contaminaram. Desta vez funcionou: nenhum viu o trabalho do outro, e a árvore principal ficou intacta.

### 2.1 Validador A — contrato PostgREST

| | Achado | Estado |
|---|---|---|
| ⛔ | **`.select()` no CAS não estava protegido.** Tirá-lo é invisível aos duplos; em produção o PostgREST devolve `204`/`null`, o código julga que perdeu a corrida e **o bónus nunca é concedido** | corrigido, mata nos 2 sítios |
| ⛔ | **`limit` no cliente**: com 1500 órfãs o sweeper via 1000 e reportava 1000 — mentia. Sem `order`, sem garantia de progresso | corrigido (servidor) |
| ⛔ | **O sweeper era um moto-contínuo** — defeito que eu tinha acabado de introduzir | corrigido (no-op + dedup) |
| ⚠️ | **8 de 16 métodos dos duplos divergem do real**, todos na direcção permissiva | documentado |
| ⚠️ | **Os testes de nível 2 estão saltados em CI** — os únicos que exercem a migração | **por fazer** |

### 2.2 Validador B — e a parte que é sobre mim

**A minha refutação do fork era falsa.** Reconfirmei por execução:

```
node_modules/hardhat                         → 2.28.0
node_modules/@nomicfoundation/hardhat-ethers → 4.0.9   (par CORRECTO)
./node_modules/.bin/hardhat --version        → 2.28.0, exit 0
@nomicfoundation/edr                         → INSTALADO
```

**Causa do meu erro:** o `package.json` *pina* `^3.4.0`, mas o *instalado* é 2.28.0 — e a mensagem de erro que reportei vinha do hardhat v3.9.1 da **cache do `npx`**. Li o `package.json` e um erro, sem confirmar a versão instalada.

E o argumento de mérito também não se sustinha: num fork credita-se com a mesma função, personificando o mesmo coordenador; e o CI Foundry mede o **código-fonte**, não o bytecode deployado nem o endereço que o backend usa.

O Validador B levantou uma EVM local **e** um fork de mainnet **sem instalar nada**, e correu o cenário completo: `adicionarSenhas(20)` → saldo 20 → `abrirEdicao` → `darLance` → saldo 19 → `apurarVencedor`, com controlo negativo.

**Outros dois achados dele, corrigidos:**

- ⚠️ **Poluição de protótipo armava a emissão.** `process.env.X` resolve pela cadeia de protótipos: `Object.prototype.BONUS_EMISSAO_ATIVA = "true"` armava a emissão sem variável nenhuma — e ele chegou a creditar por essa via. Foi a única de 7 tentativas que passou. Corrigido com `Object.hasOwn`.
- ⚠️ **`CONTRATO_ADDRESS` tem fallback para `0x273Ef9…445e`, que tem zero bytecode.** `adicionarSenhas` contra um endereço sem código **não reverte** — status 1 — e o worker marcaria a dívida liquidada sem ninguém receber senhas. Só `verificarCoordenacao()` impede, e removê-la sobrevivia à suíte. Coberto por teste (o `contract.mjs` não é alterável neste MC).

---

## 3. DOCUMENTADOR

### 3.1 Números

**543 testes · 535 verdes · 0 falhas · 8 saltados.** Mutação própria: 10 aplicados, 10 mortos, mais 3 controlos de correcção. R1: só `fila-processor-scheduled.mjs`, a spec e — ao abrigo de R15 — `bonus-emissao.mjs`.

⚠️ **Um falso sobrevivente no meu harness**, o terceiro do projeto: o HARD GATE 4 resolveu o problema do comentário, e apareceu logo outro, por `replace` multilinha que não aplicou. A regra completa é **assertar que o ficheiro mudou**, não só que o padrão existia.

### 3.2 As duas métricas que o enunciado pediu

**Os validadores apanharam o que o Executor não viu?** Sim, ambos. O A apanhou um defeito que eu tinha acabado de introduzir; o B provou que a minha refutação era falsa e fechou a única via de emissão indevida que passou. **Quarta vez consecutiva.**

**Quantos duplos divergiram do contrato real?** **8 de 16 métodos, todos na direcção permissiva.** É a medida do custo acumulado do erro de método — e a explicação de por que três P0 do MC93-C passaram despercebidos.

### 3.3 Pendências

1. ⛔ **Ligar o nível 2 em CI** — maior efeito, menor custo.
2. ⛔ **O fork on-chain** — possível, e por fazer.
3. Antes de activar a emissão: migração em produção + R2 reativada.

### 3.4 L-4

Sem mainnet real; sem PostgREST de produção; cobertura global não medida; o Supabase local ficou a ouvir em `0.0.0.0` durante o MC (parado no fecho).
⚠️ **As correcções deste MC não passaram por uma terceira validação.**

---

## 4. A lição, ao quarto MC

Este MC existia para corrigir um erro de método: os duplos herdavam as minhas suposições. Mediu-se, e a resposta é **8 de 16**.

Mas a lição mais dura não é essa. É que **eu refutei uma premissa do enunciado com confiança, por escrito, e estava errado** — e o senhor tomou uma decisão com base nisso. Li um `package.json` e uma mensagem de erro, e chamei-lhe medição. O mesmo padrão que passei quatro MCs a apontar no código apareceu no meu próprio SEG-1: **afirmar sem verificar o artefacto real**.

O `package.json` diz o que se pediu. `node_modules` diz o que se tem. Não são a mesma coisa — e é sempre a segunda que corre.
