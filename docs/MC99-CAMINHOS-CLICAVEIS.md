# MC99 — ANÁLISE DOS CAMINHOS CLICÁVEIS

**Análise. Nada foi alterado por causa deste documento** — a execução das sugestões é MC
futuro, se o operador decidir. As alterações de UI/UX que o MC99 fez estão em
`_logs/MC99-RELATORIO.md`; aqui está só o mapa e o diagnóstico.

**Como foi medido:** extractor próprio (`_tmp/mc99/caminhos.mjs`) sobre
`desafio-gut/frontend/src` (excluindo `__tests__` e `_stubs`): 44 ficheiros, procurando
`<Link to>`, `<NavLink to>`, `navigate(...)`, `window.open(...)`, `<a href>` e `<button>`
com `onClick`. Saída bruta: `_logs/MC99_CAMINHOS-BRUTO.txt`.

---

## 1. Números (medidos)

| tipo | quantidade |
|---|---|
| rotas referenciadas | **15** |
| navegações (`Link`/`NavLink`/`navigate`/`window.open`) | **33** |
| `<a href>` | **19** |
| `<button>` com `onClick` | **112** em 44 ficheiros |

### Distribuição dos botões por ficheiro (top 12)

| ficheiro | botões |
|---|---|
| `widgets/layout/BottomNav.jsx` | 8 |
| `components/ChatbotWidget.jsx` | 8 |
| `components/ComprarFichasModal.jsx` | 7 |
| `pages/Dashboard.jsx` | 6 |
| `pages/MinhaCarteira.jsx` | 6 |
| `pages/CorporativoCarteira.jsx` | 5 |
| `components/CardLance.jsx` | 4 |
| `components/CotaInativa.jsx` | 4 |
| `pages/CorporativoBanners.jsx` | 4 |
| `pages/EdicaoDetalhe.jsx` | 4 |
| `components/EdicaoBanner.jsx` | 3 |
| `components/ImageModal.jsx` | 3 |

### Rotas referenciadas (15)

```
/                     /admin                 /admin/usuarios
/admin/usuarios/:id   /cadastro              /corporativo
/corporativo/carteira /corporativo/cotas     /corporativo/mercado
/login-email          /mercado               /programacao
/vitrine              /excluir-conta         /privacidade
```

---

## 2. Problemas identificados (todos com medição)

### P1 · `/vitrine` — hipótese de link para si própria: **REFUTADA ao ler o contexto** ⚠️

`src/pages/Vitrine.jsx:371` — `<Link to="/vitrine">` **dentro de Vitrine.jsx**.

**A leitura da linha do grep fez-me suspeitar de um caminho órfão (um link para a própria
página). Falso.** O link está dentro do sub-componente `VitrineDetalhe`, que só é renderizado
na vista de detalhe (`/vitrine/:slot`), e o seu texto é «← Voltar à Vitrine»:

```
370|  function VitrineDetalhe({ slot, isMobile, corporativo }) {
371|    ... <nav aria-label="Trilha de navegação">
373|        <Link to="/vitrine" ...>← Voltar à Vitrine</Link>
374|  </nav>
```

É uma **migalha de navegação legítima** (detalhe → lista). Não há nada a corrigir.

> **Registo do método:** a medição (o extractor) estava certa; a *interpretação* estava
> errada. Uma linha de `grep` sem as 10 linhas à volta produz hipóteses, não conclusões. A
> hipótese só foi refutada quando li o componente. **É por isso que este documento não
> executou nada** — a lista de sugestões tem de passar por esta leitura antes de virar código.

### P2 · Cinco caminhos para `/mercado` (Lances)

| onde | contexto |
|---|---|
| `widgets/layout/BottomNav.jsx` | tab "Lances" (o caminho principal) |
| `pages/Dashboard.jsx:367` | CTA do card de edição activa |
| `pages/EdicaoDetalhe.jsx:70, :142` | dois CTAs na mesma página |
| `pages/MinhaCarteira.jsx:79` | botão "⚡ Lance Relâmpago" (com `setModalidade("flash")`) |
| `components/EdicaoCard.jsx:124` | cartão de edição (Outras Edições) |
| `pages/CorporativoCarteira.jsx:214` | variante corporativa (`/corporativo/mercado`) |

**Não é defeito por si:** CTAs contextuais para o ecrã principal do produto são bons. O que
merece atenção é `EdicaoDetalhe.jsx` ter **dois** CTAs para o mesmo destino na mesma página
(70 e 142) — se um está no topo e outro no fundo, é redundância deliberada; se estão perto,
é duplicação.

*Sugestão (P2):* confirmar visualmente se os dois CTAs de `EdicaoDetalhe` se sobrepõem.

### P3 · Quatro `navigate("/corporativo")` no mesmo ficheiro

`pages/SejaNossoParceiro.jsx:108, 120, 173, 223` — quatro caminhos para o painel do lojista,
em pontos diferentes do fluxo (após login, após cadastro, etc.). Cada um faz sentido no seu
ramo, mas **quatro** no mesmo ficheiro sugere que o destino podia ser um só (uma função
`irParaPainel()`), reduzindo o risco de um deles divergir.

*Sugestão (P3):* extrair uma função única. Ganho é de manutenção, não de UX.

### P4 · `BannerCard` ficou sem consumidor na área comum

O MC99 removeu o banner dos Lances. Medido: o componente `BannerCard.jsx` continua a ser
usado **apenas** por `components/BannerUpload.jsx:155` (o lojista, em `/corporativo`).
Não é órfão — mas o `banners` endpoint passou a ter **um** consumidor na UI. Registado para
o operador saber que a área comum deixou de mostrar banners de cliente.

### P5 · Rótulo técnico em rodapé (já corrigido no MC99)

`pages/Vitrine.jsx` dizia "Pipeline de lance em /mercado (Edição R-1, validada em produção)".
Removido no SEG4 — fica registado aqui porque o mesmo vocabulário pode existir noutros
rodapés: **não foi feita uma varredura exaustiva de rodapés** neste MC (limitação declarada).

### P6 · Funções importantes enterradas no menu "Mais"

Medido: a barra inferior tem **3 tabs + "Mais"**. Dentro de "Mais" vivem
`Vitrine (4 Slots)`, `Programação`, `Meus Ativos`, `🤝 Seja nosso parceiro!` e
`Configurações` (`BottomNav.jsx`, `SECONDARY_LINKS`).

Para o utilizador comum, **"Meus Ativos" é o 2.º sítio onde ele vê resultados** (ranking,
pontos, bónus e — desde o MC99 — os lances dele, que saíram da Carteira). Fica a **dois
toques** de distância. A Carteira subiu para 2.º lugar no MC99; "Meus Ativos" é o candidato
seguinte.

*Sugestão (P1, decisão do operador):* trocar "Mais" por "Meus Ativos" na barra, movendo
Configurações (raro) para dentro de "Mais". Isto **reduz** o número de toques para a
informação mais consultada. Não foi feito porque o MC99 fixou a ordem em
Início · Carteira · Lances · Mais.

### P7 · 112 botões com `onClick` — a maioria não navega

Os `onClick` que não navegam são acções (toggle, modal, copiar, partilhar). Não foram
auditados um a um: seria um MC próprio. **Limitação declarada** — o extractor marca
`navega` vs `accao`, e a lista completa está no ficheiro bruto para quem quiser continuar.

---

## 3. Sugestões por prioridade

| # | prioridade | sugestão | custo | ganho |
|---|---|---|---|---|
| 1 | **P1** | Pôr "Meus Ativos" na barra inferior e mover "Configurações" para "Mais" | baixo | −1 toque na informação mais consultada |
| 2 | **P1** | Cruzar as rotas REFERENCIADAS com as rotas REGISTADAS em `App.jsx` (detecta link para rota inexistente) | baixo | apanha caminhos partidos que nenhum teste apanha |
| 3 | **P2** | Confirmar visualmente se os 2 CTAs de `EdicaoDetalhe` (70/142) se sobrepõem; fundir se sim | trivial | menos ruído |
| 4 | **P3** | Extracção de `irParaPainel()` em `SejaNossoParceiro.jsx` (4 `navigate("/corporativo")`) | baixo | manutenção |
| 5 | **P4** | Uniformizar os links "voltar ao app" (`ExcluirConta.jsx:133`, `App.jsx:354`) | baixo | consistência |
| 6 | **P5** | Varrer os rodapés de todas as páginas à procura de vocabulário técnico como o do P5 | médio | coerência |

> ~~P0: remover o link da Vitrine para si própria~~ — **retirado: a hipótese foi refutada
> ao ler o código (ver P1).** Fica registado em vez de apagado, porque o erro é o do método
> (grep sem contexto) e vale mais visível do que escondido.

---

## 4. O que NÃO foi verificado (limitações declaradas)

- **Não foi feita análise de cliques reais** (sem telemetria): a prioridade das sugestões é
  julgamento, não medição de uso.
- **Os 112 botões não foram auditados individualmente** — só classificados em
  `navega`/`accao`.
- **Não foram testados caminhos partidos em runtime** (ex.: rota que existe no código mas
  não está registada no router). O cruzamento rota-referenciada × rota-registada em
  `App.jsx` **não foi feito**: fica como próximo passo barato e valioso.
- **Acessibilidade** (foco, ordem de tabulação, `aria-label` ausentes) não foi auditada.
