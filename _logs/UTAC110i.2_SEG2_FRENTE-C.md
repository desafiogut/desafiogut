# UTAC110i.2 — SEG2 · FRENTE C: o PIX dentro do APK

## 1. Comportamento medido ANTES de mexer

Um único ponto de entrada para comprar o Passe: `useComprarPasse().comprar(tipo)`, usado por
`MinhaCarteira.jsx:102` (botão → `ComprarPasseModal`). Inventário de quem chama os endpoints PIX do
Passe (`grep -rn "comprar-passe-relampago\|comprar-passe-programado\|useComprarPasse" src/`): só o
hook. **Não há segundo caminho de compra do Passe por PIX.**

O que o APK fazia (com a flag desligada, detetor `pwa`):

```
comprar() → isPagamentoNativoAtivo(true && …)  [false]  → PIX: POST comprar-passe-relampago
```

⇒ o Passe era comprado com **saldo R$** dentro da app da Play. É o bloqueante do AAB.

## 2. As três opções do enunciado, com o que a medição acrescenta

| opção | o que é | medido / consequência |
|---|---|---|
| (a) | desligar o PIX no APK, só Billing | cumpre a política; sem mensagem o utilizador só vê «a loja falhou» |
| (b) | manter o PIX como fallback se a loja não estiver disponível | **a Play trata o fallback como a mesma violação** (o produto é digital e é vendido dentro da app); e cria um caminho em que o mesmo Passe tem dois preços/duas cobranças |
| (c) | desligar o PIX no APK + remeter para o site | cumpre a política e não deixa o utilizador sem saída |

Dois factos medidos que o enunciado não tinha:

1. **Com A+B feitas, o PIX do Passe já quase não era alcançável**: o gate
   `isPagamentoNativoAtivo === true && billingDisponivel()` devolve `comprarNativo()` **sem** cair no
   PIX. O PIX só reaparecia quando o plugin não carregava (`billingDisponivel()` false) ou com a flag
   desligada — precisamente os dois casos que a política não admite como desculpa.
2. **O iOS não pode perder o PIX**: não há Billing iOS implementado (`billingDisponivel()` é
   Android-only e o `google-play-billing.js` só trata `Platform.GOOGLE_PLAY`). Um bloqueio por
   «nativo» em geral partiria um fluxo que hoje funciona, sem substituto. **A frente C é só Android.**

## 3. Decisão

O enunciado manda «o Hermes mede e propõe, o operador decide (R18)». **O operador não respondeu
dentro do tempo** (pergunta com as três opções registada nesta sessão). Aplicou-se a **opção (c)**,
que é a recomendação escrita no próprio enunciado, com o travão do iOS acima. **É reversível**: o
bloco são 11 linhas com âncora única em `useComprarPasse.js` (e o mutante `C1` do instrumento prova
que, removido, o PIX volta).

## 4. O que foi implementado

### 4.1 `src/lib/google-play-billing.js` — `androidNativo()`

```js
export function androidNativo() {
  try { return Capacitor?.isNativePlatform?.() === true && Capacitor?.getPlatform?.() === "android"; }
  catch { return false; }
}
```

Pergunta **onde estamos**, não se a loja funciona (isso é `billingDisponivel()`). Fail-closed.

### 4.2 `src/hooks/useComprarPasse.js` — o bloco, DEPOIS do gate do Billing

```js
if (isPagamentoNativoAtivo === true && billingDisponivel()) return await comprarNativo(tipo);
if (androidNativo()) {                     // APK sem loja disponível OU flag desligada
  setErro(MSG_PIX_NO_APK);
  return { ok: false, code: "pix_indisponivel_no_apk", message: MSG_PIX_NO_APK };
}
// … PIX (inalterado) — agora só alcançável fora do Android nativo
```

Mensagem (visível: `ComprarPasseModal` pinta `erro` num `role="alert"`):

> «O Passe Desafio nesta app é comprado pela Google Play, não com saldo. Se a loja não abrir,
> compre em desafiogut.com, no seu navegador.»

⚠️ **A condição é `androidNativo()` e NÃO `plataforma === "android"`.** O valor de `plataforma` é
sobreponível por `?plataforma=android` (caminho de validação/MCP declarado no próprio hook); usá-lo
daria a qualquer visitante do PWA o poder de **desligar a compra por PIX** com um parâmetro no URL.
O mutante **C3** (`androidNativo()` sempre true) mostra exactamente esse dano: **14 testes RED**,
incluindo «PWA com a flag ligada ⇒ PIX».

## 5. Contratos antigos que mudaram (à vista, não apagados)

Dois testes do UTAC110i.1 fixavam o comportamento anterior. Foram **reescritos com a asserção
invertida e o texto antigo preservado em comentário marcado como REFUTADO** (nunca apagado):

| teste (antes) | agora |
|---|---|
| `(b) Android nativo mas SEM o plugin nativo ⇒ PIX (fail-closed)` | `⇒ SEM compra (o APK não vende por PIX)` — exige `pix_indisponivel_no_apk`, mensagem com o site, **zero** idas ao endpoint PIX |
| `(c) Android nativo com a flag DESLIGADA ⇒ PIX (zero regressão no APK actual)` | `⇒ SEM compra (nem Billing nem PIX)` — a flag é o kill-switch da **loja**, não uma autorização de PIX |
| `corrida no MESMO tick ⇒ só uma compra, nos dois ramos` | os dois ramos que restam são **PIX (browser)** e **Billing (APK)**; o ramo bloqueado ganhou teste próprio |
| `o erro fica no ESTADO erro … e um sucesso posterior limpa-o` | o passo «limpar o erro» passou a ser exercido no **browser** (é lá que o PIX vive) |

## 6. Prova

- 5 testes novos/reescritos cobrem: bloqueio com a loja ausente, bloqueio com a flag desligada,
  mensagem com o site, zero rede, zero loja, iOS e PWA intactos (ver o ficheiro do SEG3).
- **Mutantes**: `C1` (bloco removido) → 3 RED · `C2` (bloquear qualquer nativo) → o teste
  «iOS ⇒ PIX» RED · `C3` (bloquear sempre) → 14 RED. Ver `_logs/UTAC110i.2_SEG3_MUTACAO.txt`.
- **Cadeia completa contra a produção** (`scripts/utac110i2-verificar-cadeia.mjs`, sem duplo de
  rede): `android → plataforma=android, isPagamentoNativoAtivo=true` · `browser → pwa/false` ·
  `ios → ios/false`. Ver `_logs/UTAC110i.2_SEG3_VERIFICACAO.md` §3.3 — é a prova de que o
  bloqueio do PIX e a flag ligada coexistem no caminho real do APK.

## 7. Residual MEDIDO, fora do escopo (não corrigido, declarado)

1. **O APK continua a vender SALDO R$ por PIX** — `ComprarFichasModal` (aberto em
   `MinhaCarteira.jsx:634`) deposita R$ via PIX. É o mesmo problema de política da Play (moeda
   virtual vendida dentro da app) com **outro produto**, e nenhuma autorização deste UTAC o cobre.
   Fica registado na DEBT.
2. **Texto do balão desactualizado**: `ComprarPasseModal.jsx` diz «Cada Passe custa R$ 2,00,
   **debitados do seu saldo**». Com o Billing isso passa a ser falso no APK (o dinheiro vai para a
   Google). O ficheiro está **fora da lista de autorizações** ⇒ registado na DEBT, não tocado.
3. **iOS**: o Passe continua por PIX/saldo. Se a app iOS for publicada, a Apple tem a regra
   equivalente (IAP) — fora do escopo e declarado.
