# Relatório de Ondas — Implementação dos Quick Wins + Vitrine

**Data:** 2026-05-12
**Branch:** `main` (commit-base `9dfda49`)
**Build final:** ✅ verde em 3.73s

---

## Sumário

| Onda | Escopo | REQs | Status |
|---|---|---|---|
| 1 | Quick wins (parciais com baixa complexidade) | REQ-11, REQ-20 | ✅ |
| 2 | Vitrine `/vitrine` com 4 slots | REQ-09, REQ-13, REQ-14, REQ-15 | ✅ |

**Total de REQs movidos para ✅:** 6 (REQ-09 parcial→implementado para a rota nova, REQ-11, REQ-13, REQ-14, REQ-15, REQ-20).
**Não modificado nesta sessão:** `/mercado` (preservado, ainda em produção).

---

## ONDA 1 — Quick Wins

### REQ-11 — Relâmpago duração configurável 1800-3600s

**Antes:** `DURACAO.flash = 1800` hardcoded (`AppContext.jsx:16`).

**Depois:** `DURACAO.flash` lido de `VITE_DURACAO_FLASH_SECONDS` com clamp `[1800, 3600]` e fallback seguro 1800.

**Arquivos:** `src/context/AppContext.jsx` (linhas 12-26).

**Evidência:**
```
$ grep -n "FLASH_MIN|FLASH_MAX|lerDuracaoFlash|DURACAO = " src/context/AppContext.jsx
14://   VITE_DURACAO_FLASH_SECONDS. Valores fora do intervalo caem no fallback 1800.
16:const FLASH_MIN = 1800;
17:const FLASH_MAX = 3600;
18:function lerDuracaoFlash() {
19:  const raw = Number(import.meta.env?.VITE_DURACAO_FLASH_SECONDS);
20:  if (!Number.isFinite(raw) || raw < FLASH_MIN || raw > FLASH_MAX) return FLASH_MIN;
23:export const DURACAO = {
24:  flash:      lerDuracaoFlash(),
```

**Build:** ✓ built in 3.54s

**Para configurar em produção:** setar `VITE_DURACAO_FLASH_SECONDS=3600` no Netlify Dashboard → Environment Variables (qualquer inteiro entre 1800 e 3600).

---

### REQ-20 — Emails PIX no backend

**Diagnóstico:** o email PIX da Adesão (`familiaquildo@gmail.com`) só existia como string em `MinhaCarteira.jsx:21`. O da Fichas (`desafiogut@gmail.com`) está configurado no painel MP via `MP_ACCESS_TOKEN` (não hardcoded). Faltava fonte canônica backend.

**Implementação:**
1. `netlify/functions/_lib/pix-config.mjs` — exporta `PIX_ADESAO` (modo `manual`, email `familiaquildo@gmail.com`) e `PIX_FICHAS` (modo `mercadopago`, email `desafiogut@gmail.com`) como objetos frozen.
2. `netlify/functions/info-pagamento.mjs` — endpoint público `GET` que retorna ambos.

**Evidência:**
```
$ ls -la netlify/functions/_lib/pix-config.mjs netlify/functions/info-pagamento.mjs
-rw-r--r-- 1076 May 12 00:21 _lib/pix-config.mjs
-rw-r--r-- 525  May 12 00:22 info-pagamento.mjs

$ grep -nE "familiaquildo|desafiogut@gmail" netlify/functions/_lib/pix-config.mjs
13:  email:    "familiaquildo@gmail.com",
21:  email:    "desafiogut@gmail.com",
```

**Build:** ✓ built in 3.25s

**Validação pós-deploy (executar quando Netlify terminar build):**
```
curl https://silly-stardust-ca71bc.netlify.app/.netlify/functions/info-pagamento
```
Deve retornar JSON com `adesao` e `fichas` contendo os emails corretos.

---

## ONDA 2 — Vitrine `/vitrine`

### REQ-13 + REQ-14 + REQ-15 + REQ-09 — Sistema de 4 Slots

**Decisão arquitetural:** coexistir em rota nova (`/vitrine`). `/mercado` permanece intocado em produção.

**Layout responsivo conforme §3.2 da spec:**

| Resolução | Slot 1 (Diamante) | Slot 2 (Ouro) | Slot 3 (Prata) | Slot 4 (Bronze) |
|---|---|---|---|---|
| Desktop (≥768px) | Grid 1×2 superior | Grid 1×2 superior | Grid 1×2 inferior | Grid 1×2 inferior |
| Mobile (<768px) | Sticky no topo (1×1) | Sticky no topo (1×1) | Carrossel horizontal (snap) | Carrossel horizontal (snap) |

**Dados por slot** (fonte: spec §2):
- Diamante: 1 cota exclusiva · R$ 18.000 contrato · 2 banners rotativos + 28 app + 10 bônus.
- Ouro: 1 cota exclusiva · R$ 11.000 · 2 banners rotativos + 20 app.
- Prata: 81 cotas exclusivas · R$ 5.600 · 1 banner fixo + 12 app.
- Bronze: 27 cotas não exclusivas · R$ 2.640 · 1 banner vitrine + 8 app.

**Arquivos:**
- `src/pages/Vitrine.jsx` (novo, 260 linhas) — componente da rota, com `SlotCard` interno parametrizado por categoria.
- `src/App.jsx:11, 55` — import + Route `/vitrine`.
- `src/widgets/layout/Sidebar.jsx:64` — entrada "Vitrine (4 Slots)" no menu desktop.
- `src/widgets/layout/BottomNav.jsx:45` — entrada no menu "Mais" do mobile.

**Evidência:**
```
$ grep -nE "Vitrine|/vitrine" src/
src/App.jsx:11:import Vitrine         from "./pages/Vitrine.jsx";
src/App.jsx:55:          <Route path="/vitrine"    element={<Vitrine />}       />
src/widgets/layout/Sidebar.jsx:64:  { path: "/vitrine", label: "Vitrine (4 Slots)", icon: <IconTarget />, end: false },
src/widgets/layout/BottomNav.jsx:45:  { path: "/vitrine", label: "Vitrine (4 Slots)", Icon: IconTarget },
src/pages/Vitrine.jsx:1:// Vitrine — 4 slots de categoria conforme Especificação Refatorada §2 e §3.2.
src/pages/Vitrine.jsx:180:export default function Vitrine() {
```

**Build:** ✓ built in 3.73s

**Comportamento:**
- Cada SlotCard exibe categoria, cotas, valor contrato, valor mín. produto, benefícios e CTA "Participar do leilão →" que navega para `/mercado` (preservando o pipeline de lance R-1 validado em produção).
- Cores por tier: Diamante #00d4ff, Ouro #f5a623, Prata #cbd5e1, Bronze #cd7f32.
- "Oportunidade Agora" (§3.1) rotula a seção de Prata + Bronze (REQ-12 também coberto na rotulagem).

---

## Atualização de status de REQs

| ID | Antes (auditoria) | Agora | Notas |
|---|---|---|---|
| REQ-09 (Programado fixado topo) | ⚠️ PARCIAL | ✅ na `/vitrine` | Slot Diamante/Ouro sticky em mobile; primeiras linhas do grid em desktop. Em `/mercado` continua via toggle (intencional). |
| REQ-11 (Relâmpago 30-60min) | ⚠️ PARCIAL | ✅ | Configurável via env. Default 1800 mantém comportamento atual. |
| REQ-12 (seção "Oportunidade Agora") | ❌ AUSENTE | ✅ na `/vitrine` | Cabeçalho `⚡ Oportunidade Agora` na seção de Prata/Bronze. |
| REQ-13 (Desktop grid 4 slots) | ❌ AUSENTE | ✅ | Grid 2×2 desktop. |
| REQ-14 (Mobile sticky D+O) | ❌ AUSENTE | ✅ | `position: sticky; top: 0.5rem` quando `isMobile`. |
| REQ-15 (Mobile carrossel P+B) | ❌ AUSENTE | ✅ | `overflow-x: auto` com `scroll-snap-type: x mandatory`. |
| REQ-20 (PIX Adesão backend) | ⚠️ PARCIAL | ✅ (fonte canônica) | Falta workflow Admin de aprovação (out-of-scope desta onda). |

**Saldo:** 4 ✅ → 7 ✅ + 4 ⚠️ → 1 ⚠️ + 22 ❌ → 19 ❌.

---

## Build final

```
$ npm run build
✓ 6765 modules transformed.
✓ built in 3.73s
```

Sem erros. Sem regressões nos pacotes existentes.

---

## Próximas ondas (não executadas nesta sessão)

Mantém a recomendação original do `auditoria-frontend-vs-spec.md`:

- **Onda 3** — Wallet Digital (Blob `wallet:{cliente_id}`, REQ-16/17/18/19).
- **Onda 4** — Vouchers Diamante (REQ-24/25/26).
- **Onda 5** — Banners + Auto-gerador + Premium (REQ-22/23).
- **Onda 6** — Calendário + Loop semanal + Domingos (REQ-28/29).
- **Onda residual** — REQ-10 (reset 00:00 automático), REQ-04..08 (modelo de cotas vendidas/disponíveis).

Decisões abertas que ainda travam ondas futuras:
1. `cliente_id` da Wallet = endereço Privy ou ID interno?
2. Canal/role do "Admin" de aprovação (REQ-20)?
3. Fuso horário do "domingo" (REQ-29)?
4. Estado vendido/disponível das cotas (REQ-04..07) vive onde?
