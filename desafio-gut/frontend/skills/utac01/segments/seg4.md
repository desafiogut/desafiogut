# SEGMENTO SEG4 — VALIDADOR ADVERSARIAL

**Auto-contido.** Segmento de verificação independente. **Obrigatório** (HARD GATE 9 / R16).
Aplica HARD GATES 9, 12, 15.

---

## Estrutura
Ficheiro: `_logs/UTAC<NNN>_SEG4_VALIDADOR.md` (ou `SEG<n>_VALIDADOR.md` conforme a posição).

## Padrão
1. **Despachar subagente independente, em worktree próprio** (`git worktree add`, na prática
   `references/` do projeto o passo exacto). **Não é o mesmo agente** que escreveu o código.
2. **Input:** o commit actual (só o que o UTAC devia mudar) + os logs do executor
   (`_logs/UTAC<NNN>_SEG-1_MEDICAO.md` … `_logs/UTAC<NNN>_SEG<n>.md`).
3. **Instrução:** **TENTAR REFUTAR** — não confirmar. O validador procura activamente o erro.
4. **Foco do validador:**
   - O entregável está **completo**? (todos os ficheiros esperados existem)
   - É **auto-contido**? (funciona sem consultar artefactos antigos)
   - A **estrutura** é a correcta? (mesma forma dos artefactos reais)
   - Os **gates/tipos** estão certos? (critérios concretos, sem lacunas)
   - Há **lacuna grave**? Escopo: tocou fora do autorizado? (GATE 3)
   - **R20:** o executor concebeu algo fora do escopo?
5. **Veredicto:** **APROVADO** / **APROVADO COM RESSALVAS** / **REFUTADO**, com achados
   classificados **⚠️** (grave, tratar) / **ℹ️** (nota) e o respectivo tratamento.
6. **Ler o veredicto:** se **REFUTAR** → investigar, corrigir, re-despachar. Se **APROVAR** →
   documentar. Cada achado ⚠️ gera correcção + teste + mutante (R15).

## Regras do segmento
- O validador **não escreve** no ambiente do UTAC (não toca Supabase, produção ou deploy).
- O validador pode **correr** suítes e mutações para reproduzir o resultado.
- As correcções feitas depois do veredicto ficam **declaradas como não re-validadas** se não
  passarem por uma 2.ª validação (precedente da série).

## Critério de saída
Log do validador escrito + achados ⚠️ tratados (corrigidos ou escalados) + veredicto declarado.
