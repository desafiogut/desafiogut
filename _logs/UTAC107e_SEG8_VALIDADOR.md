# UTAC107e.1 — Validador adversarial

**Despachado:** subagente independente (Claude Code), worktree `C:/Users/Moltbot/tmp-107e-val/wt` @ `6c0436c` (helper A13), instruído a
**TENTAR REFUTAR** (23 chamadas, ~6 min, **113 338 tokens**).

## Veredicto (transcrito): **APROVADO COM RESSALVAS** — nenhum dos critérios (a)–(n) refutado.

- (a) carrossel: flex · overflowX auto · snap x mandatory; itens `0 0 100%` + snap start (mutação sem overflowX → RED).
- (b) palpite no cartão certo: `registar(n, edicaoId)`; mutação «sempre a 1.ª edição» → RED; omitir o argumento mantém o comportamento antigo.
- (c) tabela: última secção, `gut-glass-standard`, 3 colunas, `<tbody/>` vazio + «Ainda não há palpites.».
- (i) 🏆 sem oficial: nenhuma marca de vencedor (Tabela desktop e mobile via `idxVencedor = -1`; MeusAtivos `menorUnico = null`; AppContext `vencedor = null`;
  overlays só dizem «VENCEU» com o titular = vencedor oficial). ℹ️ o 🏆 grande do cabeçalho «EDIÇÃO ENCERRADA» é decorativo e pré-existente.
- (j) consumidores de `vencedor` tratam `null` (FimEdicaoOverlay, OverlayVencedor, Dashboard; DetalheProduto não o usa) · (l) backend intacto ·
  (m) `.bak-*` intactos · (n) **VERDE 799/799 · 1061/1067**.
- Mutações V2 do validador: Tabela → 0009 RED (2) · MeusAtivos → 0008 RED (2) + 105c RED (6) · AppContext → 0010 RED (1) + 0015 RED (2). Restauro sha256 OK.

| # | Grav. | Achado | Tratamento |
|---|---|---|---|
| V1 | ⚠️ | Edição Programada `agendado` mostrava «ENCERRADA» / «Edição encerrada» (ao lado de «Aguardando abertura») | **Corrigido** (`23a4bae`): estado `abre_em_breve` — «ABRE EM BREVE» / «Os palpites abrem quando a edição abrir.»; teste + mutante M10 RED |
| V2 | ⚠️ | Com o V2, antes do resultado oficial os overlays dizem «Nenhum lance único registrado.» (pode haver lances por consolidar) | **Escalado para o 107e.2** — vive em `FimEdicaoOverlay.jsx`/`OverlayVencedor` (fora do âmbito do 107e.1); hoje inalcançável (`EM_BREVE_MODE` fecha os overlays). Copy sugerida: «Apuração em curso». |
| V3 | ⚠️ | Lacuna de teste: erro mostrado em todos os cartões passava (MUT-B 22/0) | **Corrigido**: teste «o erro aparece SÓ no cartão que falhou»; mutante M9 RED |
| V4 | ℹ️ | Títulos de testes antigos e comentários (Dashboard l.120-127, AppContext l.706-713) ainda falam de «apuramento local» | Registado (os asserts testam o contrato novo) |
| V5 | ℹ️ | Copy pt-BR e fiel ao backend (`mais_proximo`/`perdeu`); restos pt-PT («Bónus de palpite», «A carregar os teus pontos…») são pré-existentes | Registado (fora do âmbito) |
| V6 | ℹ️ | Contraste no vidro: #e8f0fe 16,08 · #3ddc84 10,32 · #f5a623 9,09 · #ff8a8d 8,13 · #ff5a5f 6,04 · #6b7db8 4,61 (todos ≥ AA) | — |
| V7 | ℹ️ | «Palpitar» desactivado em todos os cartões durante um envio (loading partilhado) | Aceite |

**Não medido (declarado):** render real browser/APK (touch/snap), edições `agendado` reais em produção.
**Worktree no fim:** limpo. **Correcções V1/V3: NÃO re-validadas** (suíte 801/801 e mutação 10/10 re-corridas depois).
