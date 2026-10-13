# UTAC110c-1 — SEG6 · VERIFICAÇÃO AD-HOC E FECHO

> **Ficheiro:** `_logs/UTAC110c_SEG6_VERIFICACAO.md` · saída crua em `_logs/UTAC110c_SEG6_saida.txt`.
> Script ad-hoc: `%TEMP%/hermes-verify-utac110c-1.mjs` (nome único, corrido em foreground com
> `< /dev/null`, **fora do repo** — é apagado no fim). Método: skill `utac`/`segments/seg5-6.md`,
> GATES 10, 11, 13, 14, 16.

---

## 1. Resultado do script ad-hoc

```
RESULTADO: 22 PASS / 0 FAIL
```

Cobre, medido e não lido: entregáveis presentes (8/8), ficheiros removidos continuam removidos
(4/4), **as duas cópias do Regulamento idênticas** (19 459 == 19 459 chars, via `import` do módulo),
**nenhum prompt ensina o modelo antigo** (5 prompts × 5 padrões), controlo de vitalidade do prompt
(> 20 000 chars em todos: visitante 24 270 · comum 24 266 · corporativo 23 822 · admin 23 769 ·
conformidade 24 309), o Regulamento inteiro dentro de cada prompt, `max_tokens = 4000` **no corpo
real do pedido**, o pedido real leva o Regulamento, a mensagem do utilizador já não diz «sem
contexto encontrado», as 15 âncoras são verbatim, **0 referências a HF e ao Blob `rag`** em 165
ficheiros de runtime, `HEAD == origin/main`, nada por commitar, bloco R14 presente, bytes de controlo
do `CLAUDE.md` intactos (2×`0x00` + 2×`0x1F`), e os 3 ficheiros de teste passam **isolados**
(7/0 · 10/0 · 10/0).

### 1.a CONTROLO NEGATIVO (obrigatório)
Duas asserções que **têm** de morder, para o verde não ser vacuidade:
1. o detector de modelo antigo é aplicado a um texto que **se sabe** antigo
   («Portaria SPA/MF 1.207/2024 … TORNEIO DE HABILIDADE … SENHAS») e apanha **5/5** padrões;
2. o mesmo detector, aplicado ao prompt REAL, não apanha nenhum.
Sem (1), o teste «nenhum prompt ensina o modelo antigo» podia ser apenas um detector inerte.

## 2. Erros dos instrumentos APANHADOS nesta própria verificação (declarados)

| # | o que aconteceu | diagnóstico |
|---|---|---|
| V1 | check 3 deu **FAIL** com «doc 19 459 · módulo 19 984 chars» | **erro meu**: eu desescapava o *texto* do módulo à mão (slicing + `replace`) em vez de comparar o **export real**. O `mc963` — que compara a sério — passava. Corrigido para `import` do módulo: 19 459 == 19 459 ✔ |
| V2 | check 15 deu **FAIL** com «M CLAUDE.md + ?? SEG6_saida.txt» | **esperado**: são os artefactos do **fecho**, que por desenho vão no commit de fecho. O check foi restringido ao que a entrega de *código* devia ter commitado |
| V3 | o validador adversarial mediu o CRLF dos blobs e **refutou uma suspeita minha** | eu tinha deixado escrito que `guto-perfis.mjs` «foi reescrito a 100% CRLF e depois normalizado» e pedi-lhe para confirmar. Ele mediu: os blobs commitados são **LF puro** (`worktree CR=0`, `blob_bytes == worktree_bytes`). A minha suspeita era infundada; **o registo fica corrigido** por medição dele |

**Nota de método:** os dois FAIL deste script foram, ambos, do instrumento — e é exactamente por isso
que ele foi corrido **antes** de o publicar como prova. Um «22/22» obtido à primeira teria escondido
os dois defeitos do próprio verificador.

## 3. Fecho

- **Entregáveis:** 8 no repo + relatório no Desktop (§4) + bloco R14 no `CLAUDE.md`.
- **Validador adversarial:** ver `_logs/UTAC110c_SEG5_VALIDADOR.md`.
- **Commit de fecho:** registo (R14 + logs do SEG5/SEG6). O commit de **código** é `f665200`
  (já empurrado); o fecho vai num commit próprio e **nomeia** os dois.
- **Pendências declaradas:** secção 8 do relatório `Desktop/RELATORIO-UTAC110c-1-GUTO.txt`.
- **Próximo UTAC:** 110c-2 (pôr a chave DeepSeek + verificar em produção).
