# REGRAS R1-R20 — protocolo da série UTAC (DesafioGUT)

Extraído dos UTACs fechados da série (MC100 … MC105a.1). **Auto-contido.**

⚠️ **Lacuna medida (não inventada):** na série consultada existem **R1-R10, R14, R15, R16, R18,
R19, R20**. Os números **R11, R12, R13 e R17 não aparecem** em nenhum UTAC dos ficheiros-fonte.
Não se preenche o vazio: se um UTAC futuro precisar de uma regra nesses números, o operador
define-a. Regra nova → número novo no fim, nunca reutilizar.

---

- **R1 — Zero alteração desnecessária.** Nenhum ficheiro é tocado sem necessidade demostrada pela medição.
- **R2 — Sem custo financeiro.** Nada que implique pagamento, subscrição ou consumo pago sem autorização explícita.
- **R3 — Toda acção rastreável.** Cada passo deixa rasto: log, comando, ou linha no relatório.
- **R4 — Dados sensíveis nunca expostos.** Endereços, chaves, tokens e valores de env **nunca** são impressos; mascaram-se (ex.: `0xAb…`, «EXISTE (36 caracteres)»).
- **R5 — Nunca toca credenciais.** `.claude/settings.json`, `.env`, keystores e tokens ficam fora do alcance.
- **R6 — Skills ECC, conforme mapa.** Os skills declarados no cabeçalho do segmento são os usados (`smart-explore`, `impeccable`, `requesting-code-review`, `verification-before-completion`…).
- **R7 — Ritmo proporcional ao risco.** Diagnóstico e leitura correm rápido; mutação em produção, DDL e deploy correm devagar, com controlo positivo.
- **R8 — Veredito documentado por segmento.** Cada segmento termina com SEGUIR / PARAR / AJUSTAR escrito no seu log.
- **R9 — Entregáveis definidos no arranque.** A lista de entregáveis existe antes de começar (no spec e no SEG-1).
- **R10 — Soberania de dados.** Os dados vivem no repo/plataforma do titular; nada de terceiros não autorizados.
- **R14 — `CLAUDE.md` actualizado.** No fecho, o `CLAUDE.md` reflecte o novo estado (R18: em 3 lugares). ⚠️ **Um UTAC pode proibir esta regra explicitamente** (ex.: UTAC000 proíbe); nesse caso o registo fica em `_logs/UTAC*_REGISTO-CLAUDE.md` para aplicação futura.
- **R15 — Autonomia para corrigir o que a medição provou errado.** O executor corrige defeitos que a medição ou o validador revelam, e declara a correcção.
- **R16 — Todo teste que nasce verde precisa de mutação.** Ver HARD GATE 7.
- **R18 — Decisão do operador vira registo em 3 lugares.** Cada decisão do operador é escrita em: (1) o log do segmento, (2) o relatório, (3) o `CLAUDE.md` (ou a nota `REGISTO-CLAUDE.md` quando o `CLAUDE.md` está proibido).
- **R19 — Autonomia ampliada, com parcimónia.** O executor resolve sozinho o que a medição permite; escala o resto.
- **R20 — O executor não concebe.** Ver HARD GATE 12.
