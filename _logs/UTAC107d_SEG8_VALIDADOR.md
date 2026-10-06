# UTAC107d — SEG8 Validador adversarial

**Despachado:** subagente independente (Claude Code), worktree `C:/Users/Moltbot/tmp-107d-val/wt` @ `46e21b5` (helper A13, 4 junctions),
instruído a **TENTAR REFUTAR** (25 chamadas, ~4 min, ≈ 115 k tokens).

## Veredicto (transcrito): **APROVADO COM RESSALVAS** — tentei refutar e não consegui; (a)–(i) passam medidos; 6/6 mutações próprias apanhadas.

- (a) frase antiga: fora do código executável e do ecrã (só comentários de rastreabilidade + o Art. 7 citado no gate). Frase nova = mockup, letra a letra, dentro de `gut-glass-standard`.
- (b) envelope = Carteira (`1rem 1rem 0` / `2rem 2rem 0`, desktop `px-5` = 20 px). ℹ️ resíduo: secção 2 no mobile `px-3` (12 px) vs `p-4` (16 px).
- (c) rótulo «Seu lance (em centavos)» visível e ligado (`htmlFor`/`useId`), `inputMode="numeric"`, placeholder mantido; `useId` OK (React 18, SSR do teste correu).
- (d) grelha `1fr`; `tabela-fim` depois do CardLance/LanceStatusBadge e antes do rodapé; 3 colunas; `.gut-glass-standard`, sem blur.
- (e) nada fora de vidro além do resíduo declarado (`LanceStatusBadge`). Limite: SEG5 só cobre estado desligado/não encerrado/desktop, com duplo do CardLance (o real é `Card` = `gut-glass-standard`, `ui/card.jsx:10`).
- (f) GlassHeader/TabelaLances só no MLC; CardLance também no slot da especial do Dashboard — muda só o texto do rótulo + `id`/`inputMode`, mesma unidade, nenhum teste dependia do texto antigo.
- (g) backend intacto · (h) `.bak-*` intactos · (i) **VERDE 792/792 · 1061/1067**.

**Mutações do validador:** M1 🏆 ignora o oficial → 0009 RED · M1b 🏆 em linha blindada → RED · M2 frase fora do vidro → SEG2/SEG5 RED · M3 sem htmlFor → RED · M4 2 colunas → RED · M5 texto solto → RED. O instrumento novo do 0009 (lê a `<tr>` com 🏆) **não é vácuo**; limite: só cobre o desktop (`MobileList` sem teste do 🏆, como antes).

| # | Grav. | Achado | Tratamento (executor) |
|---|---|---|---|
| V1 | ⚠️ | Perda do estado dos OUTROS participantes («❌ Repetido» / «✅ Único» por linha; selo «🔒 Blindado»). O próprio jogador continua a ver o seu estado no `LanceStatusBadge`. | **Declarado — decisão de produto** (autorizado pela R18-D, mockup completo). Reversível. |
| V2 | ⚠️ | O mockup diz «🏆 só com o resultado oficial»; a implementação mantém o 🏆 do apuramento local sem oficial (comportamento do UTAC000.9). | **Escalado** — fora do âmbito da R18-D (lógica do vencedor; mexer exige decisão). |
| V3 | ℹ️ | CSS morto `.gut-vencedor`/`gut-blink` (o Badge saiu). | **Corrigido** (commit seguinte). |
| V4 | ℹ️ | Mobile `px-3` na secção 2. | **Corrigido** → `px-4` (16 px = Carteira). |
| V5 | ℹ️ | Frase cobre a regra inteira (menor E único), sem álea, verbo «ganha»; contraste #ff9500 ≈ 8:1. SEG1 prova o envelope pela fonte, não pelo layout. | Registado. |

**Não medido (declarado pelo validador):** render visual real (browser/APK), tabela longa, estado encerrado/sessão/overlay/mobile na Regra 1, leitor de ecrã, contraste com ferramenta.
**Worktree no fim:** limpo. **Correcções V3/V4: NÃO re-validadas** (triviais; suíte 792/792 e mutação 9/9 re-corridas depois).
