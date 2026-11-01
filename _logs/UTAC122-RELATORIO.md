# UTAC122 — RELATÓRIO FINAL · Aviso «Ambiente de teste — rede Sepolia»

Tipo `diagnostico` · baseline `7f8200e` (desvio 0) · Opus 5.5 · 2026-11-01 · **zero alterações de código, zero commits.**
Validador adversarial (SEG3): **APROVADO COM RESSALVAS** — `_logs/UTAC122_SEG3_VALIDADOR.md`.

## Entrega
- [x] **Componente:** `desafio-gut/frontend/src/components/AvisoRede.jsx:60`, montado em `src/App.jsx:424`.
  Condição `:26-33`: activa por `CHAIN_ID_DEC !== 1` (`:28`) e `!CONTRATO` (`:30`). Valores de
  `src/lib/network.js:19` (contrato sem fallback) e `:22-25` (chainId default 11155111 = Sepolia).
- [x] **Causa raiz: build errado, não código nem env.** O bundle do AAB v6 tem o `import.meta.env` =
  `{…, VITE_NETWORK_STAGE:"mainnet"}` e nada mais — é o `.env` do disco ⇒ compilado com `npm run build`
  (Vite puro), não com `npm run build:apk` (`netlify build --context production`). O Netlify `production`
  está correcto (`VITE_CHAIN_ID=1`, contrato `0x0052477A…16cd`, RPC eth-mainnet, scope `builds`).
  O guarda do repo `validar-dist-rede.mjs` rejeita o bundle (exit 1). O validador confirmou-o **no próprio .aab**.
- [x] **Plano:** nenhuma alteração ao aviso, ao `network.js`, ao `netlify.toml` ou ao env. Rebuild via
  `build:apk` + `versionCode 7` → spec pronto em `_logs/UTAC123.spec.yml`.
- [x] **Próximo passo:** UTAC123 (publicação) — ver abaixo.

## Achados que mudam o alcance (validador, confirmados por mim)
1. ⚠️ **Os AAB v3, v4 e v5 têm o mesmo defeito** (medido: `unzip -p` do `web3-*.js` de cada `.aab` → só
   `VITE_NETWORK_STAGE`). Todo o teste fechado correu em Sepolia, sem contrato, sem Supabase, sem Sentry.
   O v7 será o **1.º APK com env de produção** ⇒ revalidar Billing/Passes nele. → **DEBT-081**.
2. ⚠️ **O v7 muda a fonte da config** (`recursos_app` passa do Blob para o Supabase, DEBT-061) ⇒ o UTAC123
   compara as duas cópias antes do Gradle (Frente B).
3. ⚠️ **Buraco no guarda:** sem `VITE_ALCHEMY_URL` passa, e `src/utils/web3.js:122-124` cai num URL
   Alchemy **Sepolia com chave escrita no código**. → **DEBT-082** (inclui rodar/retirar a chave — operador).
4. ℹ️ A lição está invertida em `_logs/UTAC110l_AAB_REPORT.md:70-72` e `_logs/UTAC119_CORRECAO_BILLING.md:47-48`
   («não usou build:apk — desvio evitado»). `netlify build` **não publica**. 3.ª recorrência do incidente
   (MC88.22 → MC89.27 → v3-v6).

## Conflitos com o enunciado (R20)
- «Remover o aviso quando chainId=1/contrato configurado» — já é a lógica; alterar esconderia um APK partido.
- «Configurar a env no Netlify (builds)» — já está configurada.
- «SEG3 fecho» → SEG3 validador + SEG6 fecho (tipo diagnóstico).

## Ressalvas
- **A14:** RAM livre 366-387 MB (< 1 500). Prossegui por ser só leitura; **o UTAC123 não pode compilar assim.**
- Disco: 9,6 GB livres. Tempo: < 1 h (HI5 ok).
- Fora de `_logs/` nada foi escrito (validador conferiu `git status`). `_logs/DEBT.md` recebeu DEBT-081/082 (registo obrigatório do fecho).

## Decisões pedidas ao operador
1. Avançar com o UTAC123 tal como no spec?
2. H1 (tarefa Gradle que corre o guarda e trata RPC/Supabase ausentes como erro) — no UTAC123 ou em UTAC próprio?
3. Rodar a chave Alchemy que está hardcoded em `web3.js:124`?

## Artefactos
`_logs/UTAC122.spec.yml` · `_logs/UTAC122_SEG-1_MEDICAO.md` · `_logs/UTAC122_SEG0-2_FRENTES.md` ·
`_logs/UTAC122_SEG3_VALIDADOR.md` · `_logs/UTAC122-RELATORIO.md` · `_logs/UTAC123.spec.yml` ·
`Desktop/RELATORIO-UTAC122.txt`.
