# UTAC110k.1 — CONFORMIDADE PRÉ-AAB · registo de execução

Executor: Hermes · 2026-10-17 · repo `DESAFIOGUT` · base `26fd0dc`

## 1. SEG-1 — medição (nada alterado)

| # | Objecto | Medição |
|---|---|---|
| 1 | Art. 17º do v5 | «Os pontos de lance não são comprados com dinheiro real — são ganhos por atividade no aplicativo.» — **contradiz** o Art. 16º, VI (bónus incluído no Passe) e o fluxo real (R$ 2,00 → 1 crédito). |
| 2 | Texto do ecrã de exclusão | Já dizia «identificador pseudónimo derivado da carteira» na maioria dos sítios (110j.1), **mas** o modal ainda tinha «(deixam de identificar você)» e a página «sem o identificar». |
| 3 | Data Safety (`docs/MC90.2-DATA-SAFETY-RASCUNHO.txt`) | **Duas declarações falsas**: `[2] Endereço — NÃO` e `[15] CPF — NÃO coletado`. |
| 4 | Página `/excluir-conta` | Nomeia app, developer (Associação…, CNPJ), passos e fallback por e-mail. **Falta-lhe o DPO.** |
| 5 | DPO | «a designar» na política; ausente da app e da página. |
| 6 | RAM | 645/512/601 MB → trim → **1 841/1 838/1 838 MB** (A14 cumprido). |

**Achados que o enunciado não previa:**
- O `Art. 18º` revela que o valor do lance **é o preço do produto** (1 ponto = R$ 0,01) ⇒ «ponto de lance» e «crédito de lance» são **conceitos diferentes** (DEBT-052).
- O Regulamento vive em **três** sítios: `docs/REGULAMENTO-v5.md`, `docs/GUTO-REGULAMENTO.md` e `netlify/functions/_lib/guto-regulamento.mjs` (este último embutido no bundle, com teste que o obriga a ser igual ao documento).
- A invariante `corpo(v5) == corpo(GUTO)` **byte a byte** está testada (`utac106h-regras`, «FONTE»).

## 2. FRENTE A — Art. 17º (v5.1)

**Primeira tentativa (revertida):** emendar só a transcrição partiu a invariante FONTE — a suite ficou vermelha em 3 testes. **Revertido ao byte de HEAD**, com o texto guardado em `_logs/UTAC110k.1_ART17-v5.1-PROPOSTA.md`.

**Decisão do operador (R18-110k.1, opção «emitir v5.1»):** aplicar nos **dois** ficheiros de documentação + regenerar o módulo do GUTO.

| Ficheiro | O que mudou |
|---|---|
| `docs/REGULAMENTO-v5.md` | Art. 17º novo; versão 5.0 → **5.1** (corpo e cabeçalho) |
| `docs/GUTO-REGULAMENTO.md` | idem (fonte de verdade) |
| `_lib/guto-regulamento.mjs` | **regenerado** pela receita do próprio cabeçalho; `REGULAMENTO_VERSAO = "5.1"` |
| `_lib/guto-perfis.mjs` | âncora `ARTIGOS_V4["17"]` passou a citar o texto novo |
| `_lib/consentimento.mjs` | `VERSAO_GATE` 3.0 → **3.1** |
| `src/components/TermosConsentimento.jsx` | `VERSAO_CONSENTIMENTO` 3.0 → **3.1** |

**Consequência declarada:** quem aceitou a v5.0 **volta a ver o gate de aceitação** — é o mecanismo do próprio código («subir VERSAO_CONSENTIMENTO invalida os aceites anteriores de propósito»).

Verificação: corpos **byte a byte iguais** (19 519 chars) e módulo do GUTO igual ao documento.

## 3. FRENTE B — página `/excluir-conta` (auditada)

Já cumpria: nomeia a app (**DesafioGUT**) e o developer (**Associação Recreativa dos Nordestinos no Amazonas**, CNPJ 23.040.066/0001-00), lista passos, oferece e-mail de recurso, lista o que sai e o que fica, e é rota pública (funciona sem app instalada).
**Corrigido:** saiu «sem o identificar»; entrou o aviso de pseudonimização e o **contacto do DPO**.

## 4. FRENTE C — Data Safety (bloqueante fechado)

| Categoria | Antes | Agora | Prova no código |
|---|---|---|---|
| `[2]` Endereço | NÃO | **SIM** (só no resgate do cartão: nome, CPF, CEP, logradouro, nº, complemento, bairro, cidade, UF) | `_lib/pedidos.mjs:68-84` (`validarMorada`), `resgates.morada` |
| `[15]` CPF | NÃO | **SIM** (identificação do pagador no PIX + entrega) | `iniciar-pagamento.mjs:86`, `_lib/pedidos.mjs:68` |
| Formulário `[3]` | «compras de senhas» | «compra do Passe Desafio: PIX e Google Play» | — |
| Eliminação | «anonimizado» | «pseudonimizado» + «continua a ser dado pessoal» | — |

Checklist do próprio documento actualizado com as correcções e com o DPO.

## 5. FRENTE D — DPO (R18-110k.1-DPO)

**Designado:** Francisco Canindé Marinho — `dpo@desafiogut.com.br` (alternativa `contato@grupouniaoetrabalho.com.br`, assunto «DPO»).
Divulgado em **três** lugares: `docs/lgpd-politica-retencao.md` §5, `Privacidade.jsx` §14 (secção própria) e `ExcluirConta.jsx` (rodapé).

⚠️ **Não verificável por código:** o **aceite do próprio nomeado** e a existência da caixa `dpo@desafiogut.com.br`. Fica em **DEBT-054** para o operador.

## 6. FRENTE E — pseudonimização

- Saíram «deixam de identificar você» e «sem o identificar»; entrou «pseudonimizados».
- Acrescentado, nos dois ecrãs: **«o registro ainda é dado pessoal»** + os direitos do artigo 18 da LGPD + canal do DPO.
- **Avaliação do hash com sal:** o identificador é `sha256` do endereço, que é **público**; um sal secreto exigiria guardar o sal (mais um dado) e não impediria o cruzamento por quem tem a carteira. **Não implementado** — e o ecrã já não promete anonimato. A decisão de mudar o esquema é do advogado (pergunta D.1 do dossier).

## 7. SEG4 — verificação

- **Mutação nova: 4/4 mortos** — M1 (Art. 17º de volta ao texto antigo), M2 (`Endereço — NÃO`), M3 (DPO «a designar»), M4 («deixam de identificar você»). Restauros conferidos por md5.
- **Testes novos:** `utac110k1-conformidade-pre-aab.test.mjs` (11 testes) — inclui a verificação de que os corpos v5/GUTO continuam iguais e que o gate acompanha a versão.
- **Suíte completa (canónica):** frontend **VERDE 1176/1176** · backend **VERDE 1341/1347** (os mesmos 6 skipped) · **VEREDITO VERDE** · RAM antes 1740 MB (A14 cumprido). Saída literal em `_logs/UTAC110k.1_SEG4_VEREDITO.txt`.
- **Custo real:** saldo 5,61 → **5,34 USD** ⇒ **−0,27 USD** (cobre o fim do 110k + todo o 110k.1). O 110j e o 110j.1 ficam **antes** da baseline — não medidos, como declarado.
- **Guardas pré-existentes actualizadas por mudança de versão (não enfraquecidas):** `utac106h-regras` (5.0→5.1), `utac110h1-vocabulario` (3.0→3.1), `mc963-guto-regulamento-v4` (versão do módulo).

## 8. Verificação ad-hoc (fora da suíte)

Como o turno fechou com uma alteração de texto posterior à corrida canónica, corri um verificador
temporário (`%TEMP%/hermes-verify-110k1-*.mjs`, removido no fim) contra o comportamento alterado:

```
1) Privacidade.jsx (7/7 PASS): «cotas» fora do texto · sem «Art. 18» · DPO nomeado · dpo@ · ANPD
   (pseudonimização ≠ anonimização) · «permanece pessoal» · sem «continua a ser»
2) modal e página (6/6 PASS): sem «deixam de identificar» · sem «sem o identificar» · «pseudonimizado» + «ainda é dado pessoal»
3) testes dos ficheiros alterados: 30/30 (utac110k1, artigosUI, vocabulário v5, pt-BR) · rc=0
RESULTADO: 0 falhas · VEREDITO AD-HOC: PASS · EXIT=0
```

**Duas notas de honestidade sobre o próprio instrumento:**
1. A **primeira versão** deste verificador deu 2 FAIL falsos: foi escrita em PowerShell 5.1, que lê
   `.ps1` como ANSI, e os literais acentuados chegaram corrompidos à comparação. Refeita em Node
   (UTF-8 nativo) — o erro era do instrumento, não do produto.
2. Um dos «FAIL» dessa primeira versão apontava para o **ficheiro errado**: «ainda é dado pessoal» está
   no modal e na página; a Privacidade dizia «continua a ser pessoal». Aproveitei para alinhar a
   Privacidade a «permanece pessoal» (mais próximo do pt-BR), em vez de mudar o teste para aceitar.
