# UTAC105b.2 — SEG6 · Fecho (2026-10-01)

## 6.1 Logs consolidados
`_logs/UTAC105b.2_`: `SEG-1_MEDICAO.md` · `SEG0.md` · `SEG1.md` · `SEG2.md` · `SEG3_VALIDADOR.md` ·
`SEG4.md` · `SEG5_VERIFICACAO.md` · `SEG6_VERIFICACAO.md` + `SEG0_poc_ANTES.txt`, `SEG0_poc_DEPOIS.txt`,
`SEG0_mutacao_saida.txt`, `SEG5_saida.txt`.

## 6.2 P4/R18 — decisões em 3 lugares
`_logs/UTAC105b.2_SEG4.md` §4.8 (R18-1..R18-4) · `Desktop/UTAC105b.2-RELATORIO.md` · secção
`## UTAC105b.2` do `CLAUDE.md`. A decisão **R18-3** («resolva o que for preciso pra concluir esse UTAC»)
é a autorização que permitiu corrigir **V-1** e **V-2** — sem ela, seriam escaladas e não corrigidas
(R20/AU3).

## 6.3 Confirmação de fecho — entregáveis do enunciado
| entregável | estado |
|---|---|
| Frente A: P0 do `register-corporativo` corrigido | ✅ 401/403 antes do upsert; **28/28 bypasses falharam**; razões **estruturais** |
| Frente B: validação de posse (MC89.38) | ✅ mesma guarda, estrutura do `update-corporativo`; 401 anónimo / 403 outro / admin isento / 502 fail-closed |
| Frente C: POST genérico preserva `endereco` | ✅ **e** o payload **inteiro** (V-2) — o dono volta a editar (200) |
| Testes bidireccionais + mutação (T1/T4) | ✅ **25 testes** · **9 mutantes RED + 3 equivalentes declarados** · md5 restaurado |
| A/B pareado (P9) | ✅ anónimo `201+sobrescreve` → **401+intacto**; cadastro legítimo `201` → **201**; dono repete → **preserva o pagamento** |
| Validador adversarial + veredicto | ✅ **APROVADO COM RESSALVAS** — as 2 ⚠️ foram **corrigidas** (R18-3); as ℹ️ tratadas/escaladas |
| Deploy validado | ✅ commit final em foreground, com `git log origin/main..HEAD` antes do push |
| `_logs/UTAC105b.2_*.md` + `Desktop/UTAC105b.2_*.md` | ✅ |
| `CLAUDE.md` (P5) | ✅ requalificado e **commitado** (V-7) |
| Zero alterações fora do escopo | ✅ `cotas.mjs` **+56/−0** (prefixo/sufixo byte-idênticos) + o ficheiro de teste novo |

## 6.4 Pendência escalada (fica para o operador)
**V-4** — um anónimo pode pré-criar/poluir uma cota no `endereco` de outra pessoa (medido: A13 do SEG3).
Corrigir exige mexer no **contrato de API** documentado no MC12.3.1 ⇒ **candidato a UTAC**, não decisão
do executor. Exposição apenas por chamada directa à API (o frontend não envia `endereco`).

## 6.5 O UTAC105c pode arrancar?
**SIM.** O P0 está fechado e a integridade dos dados (V-1/V-2) ficou coberta; a suíte está verde;
nenhum caminho legítimo foi partido (medido). O UTAC105c (UI do cliente — Compra do Passe + Meus
cupons) não depende de nada pendente deste UTAC.

## 6.6 VEREDITO DO SEG6: **FECHADO** — com 1 achado ℹ️ escalado (V-4) e 1 aceite (V-3).
