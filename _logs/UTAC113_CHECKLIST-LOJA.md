# UTAC113 · CHECKLIST DE CONFORMIDADE DA LOJA (Play Console)

Para o **Ruan** preencher antes de promover o DesafioGUT para **Produção**.
Gerado em 2026-10-20 · base: `_logs/DATA-SAFETY-FOLHA-DEBT-053.txt` (rev. 2) + regras da Play Console.

Legenda: `[ ]` por fazer · `[x]` pronto · `[!]` bloqueio conhecido · `[R]` ação do Ruan · `[H]` verificado pelo Hermes

---

## 1. SEGURANÇA DOS DADOS (Data Safety) `[R]`

Preencher em **Play Console → Conteúdo do app → Segurança dos dados**.
Fonte única de verdade: `_logs/DATA-SAFETY-FOLHA-DEBT-053.txt`. Este checklist **não substitui** a folha — aponta o que vai ser declarado.

**Dados declarados como recolhidos:**

| Tipo | Recolhido | Partilhado | Finalidade | Obrigatório |
|---|---|---|---|---|
| Endereço (nome, endereço postal) | SIM | SIM (transportadora) | entrega do produto | sim |
| CPF | SIM | SIM (Mercado Pago / Receita) | obrigação legal + pagamento | sim |
| Telefone | SIM | NÃO | contacto/entrega | sim |
| Mensagens do GUTO | SIM | SIM (DeepSeek) | funcionalidade do assistente | não |
| visitorId / identificadores | SIM | NÃO | antifraude e segurança | sim |
| Dados de pagamento | SIM | SIM (Mercado Pago / Google Play) | processar compra | sim (para comprar) |

**Declarar também:**
- [ ] Dados **encriptados em trânsito** (HTTPS em todo o site)
- [ ] **Exclusão de conta** disponível dentro do app (`/excluir-conta`) e por e-mail
- [ ] **Retenção**: prazo declarado por tipo de dado (ver folha §retenção)
- [ ] **DPO** indicado: `dpo@grupouniaoetrabalho.com.br`
- [ ] Público-alvo: **18+** (coerente com a classificação etária)

**Bloqueios herdados da folha DEBT-053:** `D-4` `D-5` `D-6` (decisões do dono) e `E-1` (caixa do DPO a receber) `E-3` (deploy da política + re-aceite). Fechar antes de submeter.

---

## 2. CLASSIFICAÇÃO ETÁRIA (IARC) `[R]`

- [ ] Responder ao questionário em **Conteúdo do app → Classificação de conteúdo**
- [ ] Violência: nenhuma · Linguagem: nenhuma · Drogas/álcool: nenhuma · Conteúdo sexual: nenhum
- [ ] **Apostas/jogos com prêmio**: responder **NÃO** — o DesafioGUT é jogo de **habilidade** (menor lance único), sem aposta em dinheiro e sem prêmio aleatório. Esta resposta é a que sustenta a classificação
- [ ] Compras digitais: **SIM** (Passes) → declarar
- [ ] Resultado esperado: **18+** (ou 16+ se o IARC assim decidir) — registar o certificado devolvido
- [!] Se o IARC classificasse como "jogos de azar", o app **não pode ser publicado** — nesse caso parar e escalar

---

## 3. PERFIL DE PAGAMENTOS `[R]`

- [ ] Conta de pagamentos criada com **CNPJ 23.040.066/0001-00**
- [ ] Tipo: **Empresa/Organização** (não pessoa física)
- [ ] País: **Brasil** — igual ao país da conta de programador
- [ ] Conta bancária da Associação registada e **verificada** (micro-depósito ou documento)
- [ ] Endereço e telefone de cobrança iguais aos do cadastro
- [ ] **Não** usar conta pessoal de sócio — a Google bloqueia a transferência depois
- [!] Verificação bancária pode levar **1-3 dias úteis**: fazer antes do lançamento, não no dia

---

## 4. FICHA DA LOJA (Store Listing) `[R]`

**Textos**

| Campo | Limite | Conteúdo |
|---|---|---|
| Título | 30 caracteres | `DesafioGUT` (10) — ok |
| Descrição curta | 80 caracteres | `Compre, jogue e ganhe: o programa de fidelidade do Grupo União e Trabalho.` (76) — ok |
| Descrição completa | 4000 caracteres | usar o texto do Regulamento v5.1 simplificado (sem promessa de ganho) |

- [ ] Título ≤ 30 · [ ] Curta ≤ 80 · [ ] Completa ≤ 4000
- [ ] Sem palavras proibidas: "aposta", "sorteio", "loteria", "ganhe dinheiro"
- [ ] Sem menção a prêmios garantidos ou retorno financeiro

**Imagens**

| Ativo | Especificação | Estado |
|---|---|---|
| Ícone | 512×512 px · PNG 32-bit com alfa | [-] a produzir/exportar do logo oficial |
| Gráfico de destaque | 1024×500 px · JPEG ou PNG 24-bit **sem alfa** | [-] a produzir |
| Capturas de telemóvel | 2 mínimo (recomendado 4-8) · 320–3840 px · JPEG/PNG | [-] a capturar de UI **actual** |
| Vídeo (opcional) | YouTube, ≥30s | não obrigatório |

- [x] Logo oficial disponível em `desafio-gut/frontend/public/assets/logos/v2/`
- [!] Capturas antigas **não servem**: mostram "Créditos de lance", vocabulário já substituído por "pontos de lance". Capturar de novo depois do AAB v3
- [!] Nenhuma imagem pode conter aparelho/artigo de outra marca (ex.: Air Fryer de patrocinador) na ficha da loja

**URL da Política de Privacidade**
- [ ] URL público, acessível sem login, com o texto da política publicado
- [!] **`desafiogut.com` NÃO serve o deploy novo** (resolve para 162.240.81.81). Usar a URL do Netlify ou corrigir o DNS antes de submeter
- [ ] A página tem de abrir em **menos de 5 s** e sem erro de certificado

---

## 5. ANTES DE CARREGAR O AAB `[H]`→`[R]`

- [ ] AAB **v3** assinado (ver §6), com `versionCode 3` > 2 do que está em produção
- [ ] `applicationId` = `com.desafiogut.app` (não mudar)
- [ ] Teste interno já validado com o AAB v2 → agora revalidar compras **multi-quantity** (Ruan ativou nos dois produtos)
- [ ] SKUs confirmados: `passe_relampago_r2` e `passe_programado_r2`
- [ ] Service Account `desafiogut-play-billing` com permissões de **Financeiro** no Play Console
- [ ] Variável `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` configurada no Netlify (produção + functions) — **pendente neste UTAC**

---

## 6. ESTADO DO AAB v3 `[H]`

| Item | Estado |
|---|---|
| versionCode 3 | [-] a gerar |
| Assinatura `jarsigner -verify` | [-] |
| SHA-256 | [-] |
| SHA-256 do v2 (referência) | `5700dc6a583d009192ec11809216f221694bdff3d44e54f09c5b31da44346a5b` |

---

## 7. ORDEM RECOMENDADA DE SUBMISSÃO

1. Fechar as decisões D-4/D-5/D-6 e a caixa do DPO (E-1)
2. Deploy da política de privacidade e confirmar a URL (E-3)
3. Configurar `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` no Netlify
4. Gerar e validar o AAB v3
5. Data Safety + Classificação etária + Perfil de pagamentos
6. Ficha da loja (textos + imagens novas)
7. Teste interno com o AAB v3 (compras multi-quantity)
8. Promoção para Produção — **ação do Ruan**
