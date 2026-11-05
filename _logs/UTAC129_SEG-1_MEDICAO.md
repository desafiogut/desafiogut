# UTAC129 — SEG-1 MEDIÇÃO (2026-11-05, executor Opus 5.5, skill UTAC)

Nada alterado neste segmento.

## -1.1 Estado do repo
- `git rev-parse HEAD` → `12e31d4` = baseline do spec (sem desvio).
- Modificações pré-existentes, alheias ao UTAC e NÃO tocadas: `.agents/skills/aidesigner-frontend/*`,
  `.gitignore`, `.mcp.json`, `desafio-gut/frontend/package-lock.json`.

## -1.2 Caminhos e linhas (confirmação do UTAC128)
| Alvo | Medido |
|---|---|
| Consumo de Passe no lance | `netlify/functions/lance-relampago.mjs:249` (`consumirPasse`), recusa l. 250-257; devolução nos ramos de falha (`passeConsumido`) |
| Missão +10 | `lance-relampago.mjs:388-391`, **depois** do consumo |
| Consumo de Passe no palpite | `netlify/functions/registar-palpite.mjs:81-89`; `devolverPasse` l. 95/101 |
| Testes que codificam a trava | `_tests/utac120-inventario.test.mjs:89` (lance) e `:96` (palpite) |
| Link de convite | `src/components/PainelIndicacao.jsx:86`, `src/components/ChatbotWidget.jsx:148` (`window.location.origin`) |
| Origem de produção | `src/lib/apiOrigin.js:33` `const ORIGEM_PRODUCAO` (**não exportada**) |
| Domínio morto | `src/pages/MercadoLances.jsx:450` (`PWA_URL`), `src/hooks/useComprarPasse.js:70` (`PWA_PASSE`) |
| UI «Precisa de 1 Passe» | `src/components/CardLance.jsx:153-154, 290, 613-617`; `src/pages/Dashboard.jsx:131-132, 479` |
| Boas-vindas | inexistente; ponto natural: `netlify/functions/auth-user.mjs` (`export default` l. 28) |
| versionCode | `android/app/build.gradle:27` = 7, `versionName "1.0.0"` |
| Build blindado | `package.json:13` `build:apk` (netlify build production → validar:dist → cap sync) + tarefa Gradle `validarAmbienteProducao` |

## -1.4 Medições que mudam o plano
1. **`EM_BREVE_MODE = true`** (`src/lib/leilaoLock.js:10`, constante de build): a página do Menor Lance Único
   desenha o cartão **vazio, com o formulário de lance desligado** (`MercadoLances.jsx:369-370`,
   «SEM EDIÇÃO»). ⇒ Mesmo com as frentes A e D, **ninguém consegue licitar no app (v7 nem v8)**, e a missão
   «Completar 1 lance» continua impossível. A jornada só fica destravada para login, boas-vindas e indicação.
2. **Palpite:** `registarPalpite` grava em `palpites` com `endereco REFERENCES public.pontos(endereco)`
   (migração da tabela). O código `SEM_PASSE` é a **violação dessa FK**: basta a conta ter linha em `pontos`,
   que o login diário já cria. ⇒ Tirar o `consumirPasse` torna o palpite **gratuito e ilimitado em edições**
   para qualquer conta. Mas o Regulamento (que este UTAC proíbe alterar) diz que o palpite é «benefício
   complementar e **subordinado à aquisição do Passe Programado**» (Art. 29º; Art. 25º, I), e o vencedor
   recebe o produto **grátis** (Art. 30º). Um concurso gratuito com prémio é o caso que a NORTE §6.2 diz evitar
   (Lei 5.768/71, distribuição gratuita de prémios mediante concurso). Isto é jurídico, não técnico.
3. **Valor das boas-vindas:** o Art. 16º, I promete o bónus **sem valor**; não há constante, decisão ou log
   com um número (grep em `docs/`, `_logs/`, `_lib/`). Único precedente: o indicado recebe +50
   (`fontes-lance.mjs:265`).
4. **Config:** em produção só `config_remota` governa (`DATA_STORE_BACKEND=supabase`, UTAC126); o Blob fica
   por paridade. Virar **depois** do deploy do backend (senão a v7 mostra a página com a trava antiga).
   Na v7, por causa do ponto 1, a aba passa de «Edições na versão Web» para o cartão vazio «SEM EDIÇÃO».
5. **Riscos do UTAC126 que este UTAC não resolve** (registados, não re-discutidos: o operador decidiu):
   sem parecer jurídico no repo; o Passe continua a dar +200 pontos de lance (compra de vantagem).

## -1.5 Disco / RAM
- Disco: 15 GB livres (OK, > 5 GB).
- **RAM livre: 1 098 MB < 1 500 MB** (ressalva A14). A suíte e o build (Vite + Gradle) são os passos pesados.

## ⚠️ Conflitos (R20 — não resolvidos pelo executor)
1. **C1 — valor do bónus de boas-vindas** (o Regulamento não o fixa).
2. **C2 — `EM_BREVE_MODE` impede o lance** ⇒ a missão continua impossível mesmo depois do UTAC.
3. **C3 — palpite gratuito** contradiz os Arts. 25º/29º (que o UTAC não deixa alterar) e cai na zona da
   Lei 5.768/71.
4. **C4 — RAM abaixo do mínimo da ressalva.**

## -1.7 Veredito
**AJUSTAR** — perguntar ao operador C1-C4 antes do SEG0.

## Decisões do operador (R18, 2026-11-05) — veredito passa a SEGUIR
- **R18-129-1 (C1):** boas-vindas = **50 pontos de lance**, uma vez por conta, idempotente.
- **R18-129-2 (C2):** **manter `EM_BREVE_MODE = true`** na v8. A missão «Completar 1 lance» fica como
  pendência declarada (UTAC próprio).
- **R18-129-3 (C3):** libertar **só o LANCE Relâmpago**. O palpite continua a consumir 1 Passe Programado
  (coerente com os Arts. 25º/29º). `registar-palpite.mjs` e a mensagem do palpite no `Dashboard.jsx` NÃO
  são tocados.
- **R18-129-4 (C4):** seguir com código e testes leves; medir a RAM antes da suíte completa e do build. Se
  estiver abaixo de 1 500 MB, parar e pedir.
