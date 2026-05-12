# Diagnóstico — Estado Atual do DesafioGUT vs Especificação Refatorada

> **Data**: 2026-05-11
> **Modo**: Diagnóstico read-only (FASE 1)
> **Referências**: `Especificação Técnica Refatorada (1).pdf` + código atual em `desafio-gut/frontend/src/`

---

## 1. Estado da Aplicação — Por Arquivo

### 1.1 `src/context/AppContext.jsx` (420 linhas)

#### Localstorage e chaves legadas

| Chave LS | Linha | Status |
|----------|-------|--------|
| `gut_lances_r1` | 19 (constante `LS_LANCES`), 20, 66, 129, 364 | ✅ Já gated por `MOCK_MODE` — em produção (`!MOCK_MODE`): nunca lida (linha 64 retorna `[]`), nunca escrita (linha 128 `if (!MOCK_MODE) return`), removida no reset (linha 31) |
| `gut_carteira_flash` | 20 (array `LS_KEYS_MOCK_LEGADO`) | ✅ Removida em `limparMockResidual()` (linha 31) no load do módulo em produção |
| `gut_fichas_programadas` | 20 (array `LS_KEYS_MOCK_LEGADO`) | ✅ Removida em `limparMockResidual()` |
| `carteiraFlash` (legado) | — | ⚠️ NÃO está na lista — se algum usuário tem essa chave no LS, ela permanece |
| `fichasProgramadas` (legado) | — | ⚠️ NÃO está na lista — idem |

#### `limparMockResidual()` (linhas 27-34)

```javascript
function limparMockResidual() {
  if (MOCK_MODE) return;                          // ✅ skip em dev
  if (typeof window === "undefined") return;      // ✅ SSR-safe
  try {
    for (const k of LS_KEYS_MOCK_LEGADO) localStorage.removeItem(k);
  } catch {}
}
limparMockResidual();                              // ✅ chamado no load
```

- Roda **no module-load** (não em useEffect) — limpa LS antes mesmo do React montar.
- Limpa as 3 chaves prefixadas com `gut_`.
- **Não limpa** chaves curtas (`carteiraFlash`, `fichasProgramadas`) — possíveis lixos de iterações ainda mais antigas.

#### Constante `LANCES_MOCK` (linhas 41-46)

- Array com 4 lances fake (Ana Souza, Carlos B., Fernanda L., João P.).
- **Não vaza para produção**: usada apenas em `useState` inicial dentro de `MOCK_MODE ? ... : []` (linha 67) e em `handleNovaRodada` (linha 368). Em ambos os locais, `!MOCK_MODE` retorna `[]`.
- **Exportada** no `value` (linha 382) — código consumidor não usa em produção, mas a constante existe no bundle.

#### Handlers MOCK-gated (early-return em produção)

| Handler | Linha | Gating |
|---------|-------|--------|
| `refreshSaldo` | 287 | `if (!MOCK_MODE) return` ✅ |
| `handleSimularPix` | 293 | `if (!MOCK_MODE) return` ✅ |
| `handleConverterFicha` | 299 | `if (!MOCK_MODE) return` ✅ |

#### Estados iniciais em produção (`!MOCK_MODE`)

| Estado | Valor inicial em produção |
|--------|--------------------------|
| `lances` | `[]` (linha 64) ✅ |
| `lancesFlash` | `[]` (linha 70) ✅ |
| `carteiraFlash` | `0` (linha 85) ✅ |
| `fichasProgramadas` | `0` (linha 86) ✅ |
| `saldoSenhas` | `null` → hidrata on-chain via `refetchSaldo` ✅ |
| `saldoRsCentavos` | `null` → hidrata via polling em `/saldo-rs` ✅ |

### 1.2 `src/pages/Dashboard.jsx` (350 linhas)

| Item | Linha | Status |
|------|-------|--------|
| Imagem `/produtos/airfryer.jpeg` hardcoded | 199 | ⚠️ **Produto placeholder hardcoded** — independente do estado da edição |
| Texto "Airfryer Mondial" / "Grand Family 5L" hardcoded | 213-216 | ⚠️ **Placeholder fixo** — não vem do schedule da edição |
| Badge "🧪 Beta Interno" | 346 | ✅ Gated por `MOCK_MODE` |
| Outros valores | KPIs, vencedor, timer | ✅ Calculados a partir do contexto (zeram em produção sem lances) |

### 1.3 `src/pages/MinhaCarteira.jsx` (621 linhas)

#### Bloco MOCK_MODE (linhas 194-286) — **NÃO aparece em produção**

| Elemento | Linha | Texto |
|----------|-------|-------|
| Card "SALDO FLASH ⚡" | 207 | gated por `{MOCK_MODE && (` (linha 194) ✅ |
| Card "FICHAS 🎫" | 223 | gated ✅ |
| Botão "+ PIX R$ 10,00 (Simulação Beta)" | 247 | gated ✅ |
| Botão "→ 1 Ficha (R$ X,XX)" | 266 | gated ✅ |
| Texto "PIX real: desafiogut01@gmail.com" | 250 | ⚠️ Email PIX hardcoded — diverge da spec (Adesão = `familiaquildo@gmail.com`) |

#### Bloco !MOCK_MODE (linhas 291-403) — produção

- "Saldo Disponível" R$ — fonte: `saldoRsCentavos` (blob `saldo-rs`) ✅
- Botão "💰 Depositar PIX" (linha 350) → abre `ComprarFichasModal` ✅
- Botão "🎫 Trocar R$ 2,00 → 1 Senha" (linha 367) → POST `/comprar-senhas` ✅
- Botão "⚡ Lance Relâmpago" (linha 383) → navigate `/mercado` ✅

#### Bloco "Saldo de Senhas" on-chain (linhas 409-508) — produção ✅

#### Dados de pagamento (linhas 17-22, exibidos em 511-537)

```javascript
const DADOS_PAGAMENTO = [
  { label: "PIX (e-mail)",    value: "desafiogut01@gmail.com" },        // ⚠️ diverge da spec
  { label: "Banco do Brasil", value: "Ag. 181627 · CC 847534" },
  { label: "Cartão Débito",   value: "Nacional e Internacional" },
  { label: "Custo por senha", value: "R$ 2,00 por edição (Art. 20)" },
];
```

⚠️ **Email PIX (`desafiogut01@gmail.com`) diverge da spec refatorada**:
- Spec **Adesão**: `familiaquildo@gmail.com` (Banco do Brasil) — fluxo manual
- Spec **Fichas**: `desafiogut@gmail.com` (Mercado Pago) — fluxo automatizado
- Atual: `desafiogut01@gmail.com` — não confere com nenhum dos dois.

### 1.4 `src/pages/MercadoLances.jsx` (linhas 384-417)

- Bloco com botões "+ PIX R$ 10" e "→ 1 Ficha" gated por `{MOCK_MODE ? (` (linha 384) ✅
- Em produção, fallback é `<div />` placeholder vazio (linha 419) ✅

### 1.5 `src/components/CardLance.jsx`

| Item | Linha | Status |
|------|-------|--------|
| Badge "🧪 MOCK" | 354 | gated por `MOCK_MODE` ✅ |
| Texto botão "🎫 Confirmar Lance (−1 ficha)" | 336 | apenas se `MOCK_MODE && isProgramado` ✅ |
| Texto botão "🎫 Confirmar Lance (−1 senha)" | 338 | em produção programado ✅ |
| Hint "consome 1 ficha (Art. 20: R$ 2,00) — converta saldo flash no painel acima" | 386 | apenas se `MOCK_MODE` ✅ |
| Hint "consome 1 senha on-chain — adquira via Comprar Fichas" | 389 | em produção ✅ |
| Aviso "Sem fichas — use →1 Ficha" | 478 | gated por `MOCK_MODE` ✅ |

### 1.6 `src/utils/saldoInterno.js`

- Exporta `getCarteiraFlash`, `getFichasProgramadas`, `simularDepositoPix`, `converterEmFichas`, `CUSTO_FICHA_BRL`.
- Funções usadas pelo `AppContext` apenas em MOCK_MODE (early-return em produção).
- ⚠️ Constante `CUSTO_FICHA_BRL = 2.00` é o "preço da senha" — também aparece como texto fixo no UI ("R$ 2,00 / ficha (Art. 20)").

---

## 2. Resumo Anti-Alucinação

**Achado central**: O app **JÁ ESTÁ LIMPO em produção** quanto aos MOCKs visíveis. Todas as strings citadas pelo usuário no comando (`+ PIX R$ 10,00`, `→ 1 Ficha`, `Simulação Beta`, `🧪 MOCK`) estão **renderizadas dentro de blocos `{MOCK_MODE && ...}` ou `{MOCK_MODE ? ... : ...}`**.

Em produção (`VITE_MOCK_MODE=false` em `.env.production`), o JS bundle ainda contém os textos como **strings constantes mortas** (tree-shaking não remove conteúdo de blocos condicionais em runtime), mas eles **não aparecem na UI**.

**Por que então o usuário pode estar vendo dados fake?**

Hipóteses ordenadas por probabilidade:

1. **localStorage persistente entre deploys**: o navegador do usuário ainda guarda `gut_lances_r1`, `gut_carteira_flash`, etc. de versões antigas com MOCK_MODE=true. `limparMockResidual()` cuida das 3 chaves `gut_*`, mas pode haver outras (`carteiraFlash`, `fichasProgramadas` sem prefixo).
2. **Privy session persistente**: o cookie/storage do Privy mantém um login antigo, exibindo `userLabel` e `address` de teste anteriores.
3. **Imagem de produto hardcoded** (`Airfryer Mondial`): aparece SEMPRE no Dashboard, independente do estado real da edição. Isso parece "dado fake" mas é UI estática, não MOCK.
4. **CDN cache do Netlify**: o build antigo (com `VITE_MOCK_MODE=true` em deploy passado) pode estar servido a partir do cache do browser/CDN.

---

## 3. Alinhamento com a Especificação Refatorada

Comparação entre o que está no código vs `Especificação Técnica Refatorada (1).pdf`.

| Item da Spec | Status no Código | Gap |
|--------------|------------------|-----|
| **Cotas Bronze 27 / Prata 81 / Ouro 1 / Diamante 1** | ❌ Não modelado | Schema previsto em `docs/analise-programacao-junho-2026.md` mas **não implementado** (sem `Tier`/`Client` entities) |
| **Slots 1-4 Sticky Highlights + Carousel (mobile <768px)** | ❌ Não implementado | UI atual mostra apenas 1 edição ativa (`R-1`). Sem grid de slots. |
| **Leilão Programado: ciclos 24h, reset 00:00, fixo no topo** | ⚠️ Parcial | `DURACAO.programado = 1800s` (30 min) no AppContext — **diverge** da spec (86400s = 24h). Não há reset automático às 00:00. |
| **Leilão Relâmpago: 30 min a 1 hora** | ⚠️ Parcial | `DURACAO.flash = 300s` (5 min) — **diverge** da spec (1800–3600s). |
| **Wallet Digital — Netlify Blob `wallet:{cliente_id}`** | ❌ Não implementado | Sem rota `/.netlify/functions/wallet/:cliente_id`. Sem UI de saldo Wallet. |
| **Vale-Crédito (Valor_Produto < Valor_Mínimo_Cota → diferença vira crédito)** | ❌ Não implementado | Sem lógica de cálculo de vale-crédito. |
| **Adesão PIX direto → `familiaquildo@gmail.com` (manual)** | ❌ Não implementado | UI atual usa `desafiogut01@gmail.com` (legado). Sem fluxo de aprovação manual no Admin. |
| **Fichas Mercado Pago → `desafiogut@gmail.com` (webhook)** | ✅ Implementado | `iniciar-pagamento` + webhook MP. Email no UI ainda desalinhado. |
| **Auto-Gerador de Banner** | ❌ Não implementado | Sem componente que gere banner dinâmico. |
| **Solicitação de Arte Premium (débito da Wallet)** | ❌ Não implementado | — |
| **Bônus Diamante: 10 Vouchers Networking (código convite)** | ❌ Não implementado | Sem rota `/bonus/gerar` nem `/bonus/resgatar`. |
| **Isenção de fichas na 1ª participação (Bronze/Prata)** | ❌ Não implementado | — |
| **Calendário: grade semanal replicada 4 semanas** | ❌ Não implementado | Sem `schedule-2026-06` Blob. Sem rota `/schedule`. |
| **Domingos exclusivos: prata_repeat + diamante_01** | ❌ Não implementado | — |
| **Slots XXXXX (não atribuídos) + Painel Admin** | ❌ Não implementado | — |

---

## 4. Riscos do Plano Proposto pelo Usuário

### 🚨 Risco crítico 1: `Privy.logout()` no reset automático

O comando FASE 2 pede:
> "Privy.logout() para limpar a sessão da wallet"

**Consequência se executado em todo carregamento de página em produção**:
- Todo usuário que abre o app será deslogado automaticamente.
- O fluxo de auth Privy reiniciará a cada visita.
- Quebra UX e impossibilita uso da aplicação.

**Mitigação proposta**: usar um flag de versão (`localStorage.setItem('gut_reset_v', '2')`) e só deslogar **uma vez por dispositivo** quando a versão sobe — não a cada page load. Ou apenas limpar chaves LS sem chamar `logout()`.

### 🚨 Risco crítico 2: Remover `LANCES_MOCK` quebra MOCK_MODE

O comando FASE 3 pede:
> "Remova LANCES_MOCK do estado inicial em AppContext.jsx (produção = [])"

**Estado atual**: o estado inicial já é `[]` em produção (linha 64: `if (!MOCK_MODE) return []`). `LANCES_MOCK` só é usado dentro do bloco `MOCK_MODE === true`. Removê-lo:
- ✅ Não afeta produção.
- ❌ **Quebra dev local com MOCK_MODE=true** — tabela ficaria vazia, sem dados de demo.

**Mitigação proposta**: manter a constante em uma flag explícita (`if (MOCK_MODE) export const LANCES_MOCK = [...]`) ou movê-la para um arquivo `mocks/lances.mock.js` importado dinamicamente.

### ⚠️ Risco médio 3: Limpeza de strings em arquivos não afeta o bundle existente

`grep` após `Edit` confirma que o **texto sumiu do source**, mas:
- O bundle anterior já está no Netlify CDN com os textos antigos.
- Browsers com Service Worker cache (não tem aqui, ok) ou `localStorage` antigo ainda mostram dados fake.

**Mitigação proposta**: FASE 4 já cobre — bump de versão + force deploy + verificação no DevTools.

### ⚠️ Risco médio 4: Imagem Airfryer hardcoded persiste

`Dashboard.jsx:199` mostra `<img src="/produtos/airfryer.jpeg" />` **sem condicional**. Mesmo após reset, o produto "Airfryer Mondial" aparece como prêmio em disputa. Isso parece dado fake mas é UI estática.

**Mitigação proposta**: condicionar a imagem ao schedule da edição ativa ou trocar por placeholder genérico até a Wallet Digital estar implementada.

---

## 5. Plano de Execução Revisado (Proposta)

### A — Limpeza Cosmética (baixo risco, alto sinal)

1. Expandir `LS_KEYS_MOCK_LEGADO` em `AppContext.jsx` para incluir `carteiraFlash` e `fichasProgramadas` sem prefixo.
2. Corrigir `DADOS_PAGAMENTO` em `MinhaCarteira.jsx` para refletir os dois fluxos da spec:
   - Adesão: `familiaquildo@gmail.com` (PIX manual)
   - Fichas: `desafiogut@gmail.com` (Mercado Pago)
3. Substituir imagem hardcoded de Airfryer por placeholder genérico ou texto.

### B — Reset Inteligente (médio risco)

4. Adicionar reset versionado:
   ```javascript
   const RESET_VERSION = '2026-05-11';
   if (!MOCK_MODE && localStorage.getItem('gut_reset_v') !== RESET_VERSION) {
     // Limpa LS + (opcional) logout Privy
     localStorage.setItem('gut_reset_v', RESET_VERSION);
   }
   ```
5. **Não** chamar `Privy.logout()` por default — só se a sessão atual for de antes do reset.

### C — Não Remover (manter funcionalidade)

6. `LANCES_MOCK` permanece — apenas se a equipe quiser MOCK_MODE para dev local.
7. Funções `simularDepositoPix`/`converterEmFichas` permanecem em `saldoInterno.js` — usadas apenas em MOCK_MODE.

### D — Deploy + Validação

8. Touch `App.jsx`, build, commit, push (já feito no commit anterior — `7c915e4`).
9. Validar no DevTools de produção:
   - `localStorage.clear() + location.reload()`
   - Conferir Dashboard zerado
   - Conferir ausência de "+ PIX R$ 10,00" e "→ 1 Ficha"

### E — Tarefas Maiores (Futuras, não escopo deste reset)

- Implementar slots 1-4 com Sticky+Carousel mobile (RT-15)
- Implementar Wallet Digital + Vale-Crédito (RT-13)
- Implementar Bônus Diamante / Vouchers (RT-11)
- Implementar Schedule + grade semanal (RT-01 a RT-03)
- Implementar Admin Panel (RT-07)

Essas são novas features (mapeadas em `docs/analise-programacao-junho-2026.md`), **não** parte do reset.

---

*Diagnóstico v1.0 — aguarda aprovação do usuário antes de executar FASES 2-5.*
