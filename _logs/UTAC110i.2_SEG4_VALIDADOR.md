# UTAC110i.2 — SEG4 · VALIDADOR ADVERSARIAL

Worktree próprio: `C:\Users\Moltbot\tmp-utac110i2-val\wt` (HEAD `52c5b9d` + a alteração aplicada por
patch, sem commit). Subagente independente, instruído a **TENTAR REFUTAR** as alegações A-E e a
medir tudo por si (ler o meu relatório não conta como medição).
Duração: 603 s · 50 chamadas de API.

## Veredicto

> **APROVADO COM RESSALVAS.**

As três frentes foram confirmadas por medição **dele**, não pela leitura dos meus logs:

| alegação | veredicto dele | como mediu |
|---|---|---|
| **A** — no APK o detetor devolve `android` | **CONFIRMADA** | construiu o **seu próprio** `dist-val/` (126 chunks) a partir do worktree; `@capacitor/core@8.4.2` **empacotado** (não externalizado — `vite.config.js` não tem `external`), `androidBridge` presente em 2 chunks, `isNativePlatform` 5×; no Node dá `web/false/false` ⇒ cai em `pwa` |
| **B** — flag ligada no Android e só no Android | **CONFIRMADA** | endpoint de produção nos 3 valores **e** leitura directa do `config_remota` com a anon key; as 5 flags de transição idênticas nos três; `isLeilaoAtivo` intacto; **as duas fontes (Blob e Supabase) concordam** |
| **C** — o PIX do Passe deixou de ser alcançável no APK | **CONFIRMADA** | `grep` de todos os caminhos ao Passe: `useComprarPasse` é o único (só `MinhaCarteira.jsx:102`), o modal não faz `fetch`, o `ComprarFichasModal` vai a `/criar-pix` (saldo). Ordem gate→bloqueio→`apiPost` lida; `finally` repõe `emCurso`/`loading` |
| **D** — PWA e iOS não perderam o PIX | **CONFIRMADA** | correu o ficheiro: 15/15; mutante dele M5 (qualquer nativo) → vermelho em «iOS ⇒ PIX» |
| **E** — os testes novos mordem | **PARCIALMENTE REFUTADA** | 6 mutantes dele mortos; **M7 (remover o `setErro` do bloqueio) SOBREVIVEU** (`pass=58 fail=0`) |

## Refutações que ele trouxe — e o que fiz com elas

### ⚠️ R1 — O ESTADO `erro` do bloqueio não tinha rede de teste (procedente, CORRIGIDO)

Ele mediu que remover `setErro(MSG_PIX_NO_APK)` do bloco da frente C deixava a bateria **toda verde**.
Causa: as minhas asserções liam o objecto **devolvido** por `comprar()`, e nenhuma lia o **estado
`erro` do hook** — que é o que o ecrã mostra (`ComprarPasseModal`, `role="alert"`; e o toast da
Carteira). É exactamente o mesmo buraco que o UTAC110i.1b fechou para o ramo nativo (mutante D7) —
e eu repeti-o.

- **Correcção:** teste novo `(C/estado) o bloqueio da frente C põe a mensagem no ESTADO erro do hook`
  em `utac110i1-front-billing.test.mjs` (`assert.match(c.resultado().erro, /desafiogut\.com/)`).
- **Prova de que agora morde:** mutante **C4** acrescentado ao meu instrumento, com a mesma mutação do
  M7 dele → **RED** (fail=1). Bateria passou de 7/7 para **8/8**
  (`_logs/UTAC110i.2_SEG4_MUTACAO-POS-VALIDADOR.txt`).

### ⚠️ R2 — O meu comentário sobre `isNativePlatform()` era FACTUALMENTE FALSO (procedente, CORRIGIDO)

Eu tinha escrito em `useRecursosApp.js` que `isNativePlatform()` «torna isto não falsificável: uma
página web devolve `false` mesmo que alguém injecte um `Capacitor` falso». **É falso.** Ele mediu com
o pacote real:

```
node -e "globalThis.androidBridge={}; const {Capacitor}=require('@capacitor/core');
         console.log(Capacitor.getPlatform(), Capacitor.isNativePlatform())"
→ android true
```

`isNativePlatform()` é **derivado** de `getPlatform()` (`@capacitor/core/dist/index.js:48`), que lê
`win.androidBridge` (`index.js:28-39`). Quem escreva `window.androidBridge = {}` **antes** do import
faz a página passar por Android.

- **Impacto real (medido e aceite):** nenhum privilégio. O PWA que se julgar Android **perde** o
  leilão (vista de conformidade) e **perde** o PIX — é auto-prejuízo. O servidor não usa isto para
  autorizar nada (escritas exigem sessão; a validação da compra é server-side).
- **Correcção:** o comentário foi reescrito para dizer a verdade — o par protege contra um
  `getPlatform()` injectado **depois** do import, não contra a forja do bridge antes; risco aceite e
  porquê. O **comportamento não mudou** (o guarda continua a ser útil: sem ele, `getPlatform()` era
  uma string pura).
- **Nota sobre o teste (c):** ele existe para fixar a intenção do guarda, mas o estado que exercita
  (`getPlatform()="android"` com `isNativePlatform()=false`) **não é alcançável com o pacote real**
  — é um estado que só o duplo produz. Fica declarado como teste de contrato do guarda, não como
  prova de segurança.

### ℹ️ R3 — «`PWA_PASSE` é decorativa / URL duplicado» (NÃO procedente — refuto com medição)

Ele escreveu que a mensagem «já contém o literal `desafiogut.com`» e que trocar a constante só quebra
por acaso. **Medido no ficheiro:** a mensagem é

```js
const PWA_PASSE = "https://desafiogut.com";
const MSG_PIX_NO_APK = "… não com saldo. " +
  `Se a loja não abrir, compre em ${PWA_PASSE.replace("https://", "")}, no seu navegador.`;
```

— **não há literal duplicado**: o domínio vem **só** da constante. A prova está no próprio resultado
dele: o mutante **M8'** («`PWA_PASSE` → domínio falso») **morreu**, com 1 falha — se houvesse literal
duplicado, o `assert.match` continuaria a passar. A conclusão dele contradiz a medição dele. Nada a
corrigir; registado para não se «corrigir» o que está certo.

### ℹ️ R4 — `ComprarFichasModal` (saldo R$ por PIX) no APK

Ele **concorda** que está fora do escopo deste UTAC (é recarga de moeda, não o Passe), e mantém o
risco de política declarado. É o que já está na **DEBT-058** (alta).

### ℹ️ R5 — o artefacto do repo era pré-correcção

Confirmou o que eu já tinha declarado como ERRATA no SEG-1: `android/app/src/main/assets/public/` com
mtime `out 14 01:58`, anterior à alteração (`out 18 09:44`). Não o usou como prova — construiu o dele.

### ℹ️ R6 — ruído de ambiente no arnês

Na 1.ª corrida dele, 2 `node.exe` órfãos fizeram **1/58** falhar no teste `(c)`; 5 repetições limpas
deram 58/58. Protocolo: correr este arnês sem outros processos node; falhas isoladas no `(c)` são
ruído, não defeito. (Nota: a minha bateria e a dele produziram o mesmo 58/58 estável.)

## Achados dele que NÃO exigiram alteração

- Execução num **APK real**: também ele não conseguiu (sem dispositivo). Coincide com a DEBT-062.
- Blob lido só indirectamente (via endpoint, que é o consumidor) — sem escrita em produção.
- Notou que o `index-*.js` **publicado** no Netlify não contém `supabase.co` ⇒ o site servido usa o
  caminho da função. Não bloqueia (as duas fontes concordam, medido no ponto B); é a mesma matéria da
  **DEBT-061**.

## Estado depois do tratamento

| item | antes do veredicto | depois |
|---|---|---|
| mutantes | 7/7 | **8/8** (C4 = o M7 dele) |
| testes (4 ficheiros de rede) | 58/58 | **59/59** |
| comentário `isNativePlatform` | falso | corrigido e declarado |
| suíte completa | 1202/1202 · 1351/1357 | re-medida (ver `_SEG4_SUITE-POS-VALIDADOR.txt`) |

**Ressalvas do validador: fechadas as duas accionáveis (R1, R2). R3 refutada com a medição dele
próprio. R4/R5/R6 são declarações, não defeitos.**
