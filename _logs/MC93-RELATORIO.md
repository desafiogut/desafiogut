# MC93-A — Motor de pontuação do torneio de habilidade

**Projeto:** DesafioGUT · **Data:** 2026-09-23 · **Commit base:** `e6703e2`
**Modo:** COMPLETO (SEG-1 → SEG5) · **Veredito do SEG-1:** **AJUSTAR** · **R19:** não ativada
**Decisão do operador (R18):** escopo reduzido a **MC93-A — motor puro**
**Validação independente:** APROVADO COM RESSALVAS → 6 defeitos reais corrigidos

---

## Veredito em cinco linhas

1. **O enunciado tinha 7 de 9 premissas erradas.** Dois dos ficheiros que autorizava alterar não existem; três das quatro tabelas que dava como existentes não existem; a baseline de testes era 842 e é 403.
2. **O "bónus de 20 senhas" não é um `UPDATE`** — é uma transação on-chain em mainnet, com gas real e R$ 40,00 de valor emitido por sequência. A R2 estava declarada "custo zero" sobre premissa falsa.
3. **Entregue:** o motor puro, 33 testes, especificação. **Não entregue:** persistência, endpoints, gancho de rodada e emissão — por decisão do operador.
4. **436/436 verdes, zero ficheiros modificados.** O motor não tem chamador: zero efeito em produção.
5. **A minha prova de mutação deu 12/12 mortos e estava errada.** A validação independente encontrou seis defeitos reais — entre eles um lance `null` a ganhar a rodada.

---

## 1. EXECUTOR — o que foi construído

### 1.1 O hard gate mudou o MC

O SEG-1 testou nove premissas contra o código. Sete refutadas:

| Premissa | Realidade (verificada) |
|---|---|
| `lance-programado.mjs` | **não existe** |
| `admin-cotas.mjs` como padrão | **não existe** — o padrão é `guardAdmin` |
| tabela `edicoes` | **não existe** — é `mapping` no contrato `LeilaoGUT` |
| tabela `usuarios` | **não existe** — a chave é o `endereco` (Privy) |
| tabela `senhas` | **não existe** |
| `lances` com `usuario_id`/`criado_em`/`repetido` | tem `endereco`/`created_at`/`payload`; **0 linhas** |
| baseline 842 verdes | **403** (medido) |
| `pytest` / `ruff` | são de Python; aqui é `node --test` e `eslint` |
| gancho de fim de rodada em `lance-relampago.mjs` | é endpoint **por lance**; o fecho está em `consolidar-lances.mjs` |

E seis contradições de política, das quais duas decisivas: o MC é Nível 3 (muda o mecanismo) enquanto a decisão citada era Nível 2; e constrói o motor do torneio **proibindo** tocar o regulamento — a inversão "mecanismo antes da promessa" que o MC00.0 já tinha identificado.

Verdicto **AJUSTAR**, três opções apresentadas ao operador, que escolheu o motor puro.

### 1.2 O que o motor faz

`_lib/pontuacao-utils.mjs` — três funções públicas, sem I/O executado:

- `calcularPontosRodada(lances)` → `Map<endereco, {pontos, acertos, menorUnico}>`
- `detectarConsecutivos(historico)` → `{bonus, sequenciaAtual, maiorSequencia, pontosBonus, senhasBonus}`
- `atualizarRanking(pontuacoes)` → `[{endereco, pontosTotais, posicao}]`

Regras em `REGRAS` (`Object.freeze`): mínimo 1 centavo (Art. XXIII), +1 por acerto, +3 pelo menor único, 5 acertos → +5 pontos e 20 senhas. **Quando o MC95 fixar o regulamento, muda-se ali — num sítio só.** Três testes fixam os cinco números **em literal**, para que uma alteração seja consciente.

Duas decisões de desenho que valem mais do que o código:

- **Reutiliza `apurarMenorLanceUnico`** (`_lib/simulador.mjs`) em vez de reimplementar "lance único". Duas definições podiam divergir — o defeito que o MC88.43 documentou para o estado da edição.
- **Calcula e não executa.** `detectarConsecutivos` devolve `senhasBonus` — *o que seria devido*. Não credita. Porque creditar é uma transação em mainnet.

---

## 2. VALIDADOR — o que a verificação independente apanhou

**APROVADO COM RESSALVAS.** 38 sondas próprias, 14 mutações diferentes das minhas. Relatório: `_logs/MC93_SEG4_VALIDACAO.txt`. Verifiquei cada alegação grave por execução antes de aceitar — **todas se confirmaram**.

| # | Defeito | Confirmação |
|---|---|---|
| D1 ⛔ | **`valorCentavos: null` ganhava a rodada.** `Number.isInteger(Number(null))` é `true` → lance de 0 centavos, único, o mais baixo, 4 pontos | `calcularPontosRodada([{endereco:A, valorCentavos:null},…])` → `{"pontos":4,"menorUnico":true}` |
| D2 ⛔ | Zero e negativos pontuavam, contra o Art. XXIII | `-5` → 4 pontos, vencedor |
| D3 ⛔ | Lance sem dono era eleito menor único e o **+3 evaporava-se** | B e C com 1 ponto; ninguém com o bónus |
| D4 ⛔ | `atualizarRanking(new Map([[42,…]]))` → `TypeError` | caminho do Map não normalizava; o da lista sim |
| D5 ⚠️ | `detectarConsecutivos` falhava **aberto**: `{acertou:"sim"}` pagava 20 senhas | `Boolean("sim") === true` |
| D6 ⚠️ | O ranking não agregava: a mesma carteira em duas posições | — |
| D7 ⚠️ | **As minhas duas asserções de garantia eram falsas**: a de pureza é cega através do import (`simulador.mjs` importa `@netlify/blobs`); a de "não duplicar" só via a *linha* de import — apagar a *chamada* e reimplementar deixava tudo verde | `simulador.mjs:11` |

**D1 tem caminho real, e é o achado mais sério:** `_lib/data-store-supabase.mjs:117` grava `valor_centavos = null` **de propósito** para marcar um lance inválido. Duas convenções opostas no mesmo sistema — o que um módulo marca como lixo, o outro elegia como campeão.

**Causa raiz, medida:** `Number.isInteger` **não coage**. O defeito era inteiramente o `Number()` que eu lhe tinha posto à volta.

Uma alegação foi **refutada com evidência**: a mutação `typeof === "number"` → `true` sobreviveu, mas é **mutante equivalente** — `Number.isInteger` já é estrito para `null`/`""`/`false`/`[]`/`"50"`/`true`/`0.5`. A verificação era redundante e foi **removida**: código mais curto, mesmo comportamento.

---

## 3. DOCUMENTADOR — estado, registo e pendências

### 3.1 Números finais (verificados por execução)

| | |
|---|---|
| Suíte do MC93 | **33/33** (21 → 24 → 33) |
| Suíte completa | **436/436, zero falhas** (baseline 403 + 33) |
| Ficheiros **modificados** | **nenhum** — `git status --porcelain \| grep -v '^??'` vazio |
| Mutantes | **25 aplicados · 24 mortos · 1 equivalente** (código simplificado) |
| Boulder Loop | SEG2: 2/3 · SEG4: 3 rondas de mutação |

### 3.2 Registo operacional (R13)

| Regra | Estado |
|---|---|
| **R1** zero alteração desnecessária | ✅ nenhum ficheiro modificado; nenhum endpoint importa o módulo |
| **R2** custo financeiro | ⚠️ **declarada suspensa sobre premissa falsa.** Nenhum custo foi incorrido porque a emissão não foi implementada. **Reativar antes do MC93-B.** |
| **R3** rastreabilidade | ✅ 9 ficheiros em `_logs/`, formato fixo |
| **R4/R5** dados sensíveis, credenciais | ✅ nenhum dado pessoal, nenhuma credencial |
| **R6** skills ECC | ⚠️ 10 de 11 existem; **`mutation-test` está ausente** → mutação feita à mão. `caveman` existe (errata: declarei-a ausente sem verificar e corrigi) |
| **R14** CLAUDE.md | ✅ atualizado antes do commit (405 → 504 linhas) |
| **R16** mutação | ✅ 25 mutantes; a 1ª ronda expôs asserções que partilhavam a constante com o código |

### 3.3 R18 — decisão do operador

**Uma.** Perante o veredito AJUSTAR, o operador escolheu **"MC93-A: só o motor puro"** entre três opções. Consequência: SEG3 não executado. Registada no log do SEG5, no CLAUDE.md e aqui.

### 3.4 R15 — correcção além do previsto

Exercida uma vez, dentro dos ficheiros autorizados: os seis defeitos acima, mais as duas asserções que davam garantia falsa. A correcção estendeu-se ao que o MC tornou falso — `docs/TORNEIO-HABILIDADE.md` e o log do SEG4.

### 3.5 R19

**Não ativada**, declarado no SEG-1 antes de executar. Falham as três condições de exceção da própria regra: autorização nova de custo, segurança não prevista num endpoint que emite valor, e divisão já feita pelo operador em MC94/95/96.

### 3.6 O que NÃO foi medido (L-4)

- **Sem dados reais.** O leilão está travado (`EM_BREVE_MODE = true`; `isLeilaoAtivo:{ios:false,android:false}`) — não existem rodadas. A suíte é a **única** prova de correcção.
- **Sem integração.** O motor não tem chamador. Que funcione ligado a `consolidar-lances.mjs` é hipótese, não facto.
- **Cobertura não medida** — o projeto não tem alvo configurado; os alvos do enunciado (91,2%/89,8%) não têm com que ser comparados.
- **Suíte de segurança não isolável** — os testes de segurança estão distribuídos, todos verdes dentro dos 436.
- **Sem frontend** (MC94), **sem testes de carga**, **sem saldo de gas on-chain**.
- **Valor vivo do Blob `config-experiencia:recursos_app`** continua por ler (pendência herdada do MC00.0/N8).

---

## 4. O que falta para o MC93-B

**Bloqueado por cinco decisões**, três com efeito financeiro directo:

1. **O que é um "ciclo"?** `rankings_ciclo.ciclo_id` não tem definição em lado nenhum — não é implementável.
2. **Critério de desempate** — decide prémio.
3. **Limite de bónus por participante/ciclo** — hoje não existe nenhum; decide custo.
4. **Reativar a R2** para o crédito on-chain das senhas.
5. **Natureza jurídica do "torneio de habilidade"** — D2/D4 do MC00.0, em aberto.

E quatro decisões técnicas: onde vive o catálogo de pontuações; se se inverte a dependência do `@netlify/blobs`; o gancho em `consolidar-lances.mjs` (não em `lance-relampago.mjs`); idempotência do crédito, no padrão de `wallet_idem`.

> ⚠️ **Conflito de sequência, por registo:** este MC construiu o mecanismo do torneio enquanto o regulamento continua a prometer "O MENOR LANCE ÚNICO GANHA" (Art. 8) e prémio em dinheiro (Art. 14). É a inversão que o MC00.0 identificou. O motor foi mantido **puro e sem chamador** precisamente para que essa divergência não chegue a produção antes do MC95.

---

## 5. A lição que fica

A minha própria prova de mutação deu **12 mortos em 12** e eu dei o segmento por fechado. Um validador independente, com sondas que eu não me tinha lembrado de escrever, encontrou seis defeitos reais — incluindo um lance nulo a ganhar a rodada, com caminho de dados real para lá chegar.

Uma prova de mutação só é tão boa quanto os mutantes que alguém se lembra de escrever. **Foi a independência que pagou, não o método.** É a segunda vez neste projeto.
