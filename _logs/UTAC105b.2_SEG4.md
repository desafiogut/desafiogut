# UTAC105b.2 — SEG4 · Consolidação e relatório final (2026-10-01)

## 4.1..4.5 Logs do UTAC
| segmento | ficheiro | conteúdo |
|---|---|---|
| SEG-1 | `_logs/UTAC105b.2_SEG-1_MEDICAO.md` | `966a587` confere; suíte 535/535·931/937; o ramo sem autenticação **nenhuma**; `clienteId` do CORPO; `:563-580` sem `endereco`; consumidores medidos (**P10 não dispara**); PoC; a tensão do «200 idempotente» (§-1.7, **corrigida em §-1.7b**) |
| SEG0 | `_logs/UTAC105b.2_SEG0.md` (+3 saídas) | Frente A: PoC **antes/depois**, guarda, testes, 9 mutantes, escopo ao byte, **§0.9 pós-SEG3** |
| SEG1 | `_logs/UTAC105b.2_SEG1.md` | Frente B: mapeamento pedido→implementado da validação de posse |
| SEG2 | `_logs/UTAC105b.2_SEG2.md` | Frente C: a linha do `endereco`, o teste/mutante, **§2.5b** (a minha conclusão 2.5 desactualizada, mantida à vista) |
| SEG3 | `_logs/UTAC105b.2_SEG3_VALIDADOR.md` | **validador adversarial independente** (22.887 B) — escrito por ele, incrementalmente |
| SEG5 | `_logs/UTAC105b.2_SEG5_VERIFICACAO.md` (+`_saida.txt`) | verificação ad-hoc **14/14 VERDE** |
| SEG6 | `_logs/UTAC105b.2_SEG6_VERIFICACAO.md` | fecho |

## 4.6 Relatório de fecho
`Desktop/UTAC105b.2-RELATORIO.md` — escrito.

## 4.7 CLAUDE.md (P5)
Secção `## UTAC105b.2` + prefixo no cabeçalho, em **modo binário com `assert`** (o ficheiro tem 2 NULs).
Requalificada depois do veredicto (**V-7**: não diz «FECHADO» sem dizer *o que* está fechado e *o que*
fica escalado). **Commitada** — o validador tinha razão em apontar que ficara fora do commit anterior.

## 4.8 Decisões registadas (P4/R18) — 3 lugares
| # | decisão | origem |
|---|---|---|
| **R18-1** | autorizar a correcção do frontend no UTAC105b.1 (painel enviar token) | operador, UTAC105b.1 |
| **R18-2** | aceitar/documentar o 403 das cotas `cnpj:` sem `endereco` | operador, UTAC105b.1 |
| **R18-3** | **resolver o que for preciso para concluir o UTAC** ⇒ autoriza corrigir **V-1** (não destruir o pagamento do dono comprovado) e **V-2** (o POST genérico preservar o payload todo), com os tratamentos propostos pelo validador do SEG3 | operador, 2026-10-01 |
| **R18-4** | **V-3** (oráculo 401-vs-201) aceito como equivalente ao 409 pré-existente, sem PII | validador SEG3 + executor |

Registados em: `_logs/UTAC105b.2_SEG0.md` §0.9 · `Desktop/UTAC105b.2-RELATORIO.md` · secção `## UTAC105b.2` do `CLAUDE.md`.

## 4.9 ⚠️ Achado ESCALADO (fora do escopo — o executor não decide)
**V-4 — um anónimo pode pré-criar uma cota no `endereco` de outra pessoa** (medido pelo validador: A13).
Polui a cota futura: se essa pessoa activar depois uma cota paga no mesmo endereço, o `ativarCotaPaga`
funde `...existente` e **herda** os campos do atacante (`empresa`/`email`/`cnpj`). **Não é privilégio
nem destrói nada** — é poluição de dados/aparência.
**Porque não foi corrigido aqui:** a correcção proposta (recusar `endereco` no corpo para chamadores
anónimos) altera o **contrato de API** documentado no MC12.3.1 («cadastro autenticado (logado):
`cliente_id` = `endereco`») e o enunciado deste UTAC não a autoriza. ⇒ **candidato a UTAC** (o operador
decide). Nota: o fluxo do frontend **não** envia `endereco`, logo a exposição é apenas por chamada
directa à API.

## 4.10 VEREDITO DO SEG4: **FECHADO** — as duas ressalvas ⚠️ do validador corrigidas (R18-3), a suíte
verde, o escopo cirúrgico provado ao byte; **1 achado ℹ️ escalado** (V-4) e **1 aceite** (V-3).
