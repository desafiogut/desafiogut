# UTAC151 — SEG-1 (medição) — 2026-11-26, Opus 5.5

Baseline `85d1cd6` (main = origin/main + o fecho UTAC150.2, sem push).

## O que existe (medido)
| Onde | O quê |
|---|---|
| `src/pages/OfertasProgramadas.jsx:110-180` (`cartaoEdicao`) | cartão da edição Programada (`CartaoEdicao acao="palpite"`). Depois do palpite, mostra DENTRO do cartão «Seu palpite: N lances» e «Resultado no fim da edição.» (estado `com_palpite`); em `perdeu`, «Outro palpite ficou mais perto.» + «Seu palpite: N lances.». |
| `OfertasProgramadas.jsx:357-361` | `TabelaPalpites` (componente local do UTAC109g, «moldado directamente na TabelaLances») = **o ÚLTIMO vidro da página**, depois do aviso do bónus, dos pontos, do cartão Quildo e das Regras. **Não está por baixo do cartão.** |
| `src/pages/MercadoLances.jsx:405-480` (padrão Relâmpago) | cartão da especial → `LanceStatusBadge`/`EtiquetaMeuLance` → **`<section data-testid="tabela-fim"><TabelaLances …/>` logo a seguir**. |
| `src/pages/Dashboard.jsx:509-567` (Início) | vidro «🎫 Programada» com «Seu palpite: N lances» dentro do cartão. O vidro Relâmpago do Início **não tem tabela** (a tabela da Relâmpago vive só no MLC). |
| `src/components/TabelaLances.jsx` | título fixo «📋 Lances — Edição X» (l.136), vazio «Nenhum lance registrado ainda.» (l.173), valor revelado formatado «R$ x,xx» (l.63/151), coluna «Valor (R$)». Nome via `formatarNomeExibicao(enderecoAbrev, lance.nomeExibicao)` (UTAC142). |
| `netlify/functions/ler-palpites.mjs:64-66` | devolve **`{ endereco, data }`** (e `valor` depois do fecho). **Sem nome.** Devolve o endereço INTEIRO (a Relâmpago especial só recebe `enderecoCurto`, R18-140-C). |
| `registar-palpite.mjs` + `public.palpites` | o palpite autentica com `user-session` (sem claim `nome`) e a tabela **não tem coluna de nome**. O nome verificado da Relâmpago vem do identity token do Privy → claim `nome` do **lance-auth** (UTAC146) → `ranking_especial.nome_exibicao`. |
| texto «resultado no final da edição» | não existe à letra; o real é «Resultado no fim da edição.» (OP l.157). |
| `RankingEspecialOculto` | **não existe** (retirado no UTAC140 por decisão do operador: «só há dois layouts oficiais»). |

## Conflitos com o enunciado
1. **Nomes (Frente B) impossíveis sem backend.** O dado não existe: nem o token do palpite traz nome, nem `public.palpites` o guarda, nem o `ler-palpites` o devolve. Só o frontend não chega: precisa de migração (`palpites.nome_exibicao`), de o `registar-palpite` receber o nome verificado (identity token do Privy, como o lance-auth do UTAC146) e de o `ler-palpites` o devolver reduzido. Os palpites já feitos (incl. o da conta de teste) ficariam sem nome até o titular palpitar de novo. O enunciado proíbe backend ⇒ **decisão do operador**.
2. **`TabelaLances` tal como está diz «Lances», «Nenhum lance registrado ainda.» e «R$»** — aplicada a palpites mentiria nos rótulos. Usá-la exige props opcionais novas (título, vazio, formato do valor), com omissões = comportamento actual (a Relâmpago não muda). Alternativa: manter a `TabelaPalpites` existente e só a mover. ⇒ **decisão do operador**.
3. **«Seu palpite: N lances» é o único sítio onde o titular vê o próprio palpite** (a tabela mostra 🔒 a todos, sem marcar a linha dele). Tirá-lo do cartão sem o pôr noutro lado apaga essa informação. No MLC o equivalente (`LanceStatusBadge`) fica **entre o cartão e a tabela**. ⇒ **decisão do operador**.

## Veredicto: **AJUSTAR** — perguntar R18-151-A/B/C antes do SEG0.

## Decisões do operador (R18, 2026-11-26) — veredicto AJUSTAR resolvido
- **R18-151-A — «Autorizar backend mínimo»**: migração `palpites.nome_exibicao` + `registar-palpite` guarda «PrimeiroNome I.» do nome verificado (identity token do Privy, UTAC146) + `ler-palpites` devolve o nome. Palpites antigos ficam com endereço curto.
- **R18-151-B — «TabelaLances + props»**: variante opcional na `TabelaLances` (omissão = Relâmpago inalterada); a `TabelaPalpites` local sai.
- **R18-151-C — «Tirar do cartão, pôr entre cartão e tabela»**: OP = cartão → «Seu palpite: N lances» → tabela; «Resultado no fim da edição.» sai; no Início sai de dentro do cartão (fica a pílula «COM PALPITE»).
