# UTAC000.17 — Validador adversarial independente — VEREDICTO

**Base:** `85837bfbfba782ecd04b71fe1c34450fa5f6bc9f` (HEAD). Só leitura: 0 ficheiros do repo alterados, 0 commits, 0 escritas em produção. GETs públicos (sem credenciais) a `silly-stardust-ca71bc.netlify.app`. md5 (12 c.) no momento da leitura: `AppContext.jsx` e1e675369989 · `edicoes-core.mjs` 26b2c5913f7c.

## VEREDICTO: **APROVADO COM RESSALVAS**

A decisão de **PARAR** está certa e a partição em 3 é razoável. **Não consegui refutar** a afirmação 1 nem a substância da 2. A afirmação 3 **cai tal como está escrita** (há um sítio único autorizado), mas isso não chega para salvar o UTAC: o filtro por participação (2) e o prazo real (1) continuam a bloquear. O **17b, tal como está escrito, tem 4 riscos não declarados**, um deles grave (⚠️ R-B1), e **não fecha a DEBT-016** sozinho. Os specs têm de ser corrigidos antes de correrem.

---

## Afirmação 1 — «não existe prazo real da R-1» → **CONFIRMADA (não refutada)**

Medição em produção: dois GETs com 8 s de intervalo.
```
$ curl -s .../.netlify/functions/edicoes   (×2, ~8 s entre eles)
HTTP 200 · Content-Type: application/json · Cache-Control: no-store
#1 agora 2026-10-02T07:33:11.425Z  R-1 termino_em 2026-10-03T07:33:11.575Z
#2 agora 2026-10-02T07:33:19.411Z  R-1 termino_em 2026-10-03T07:33:19.548Z
R-1 = {"id","tipo","produto":null,"termino_em","lances":0,"status":"aberto"}   (6 campos)
edicoes: RELAMP-1,RELAMP-2,RELAMP-3 (encerrado), R-1 · agendadas: ESPECIAL-AIRFRYER
```
- O `termino_em` andou **+7,97 s** entre os pedidos (= agora + 24 h): é rolante.
- **Prova estrutural de que é sintetizada:** a R-1 tem **6 campos**. Uma edição persistida passa pelo `shapeEdicao` (l. 97-115), que acrescenta **sempre** `produtoId`, `valorBaseCentavos`, `incrementoCentavos`, `inicio_em` e `imagem_url` (as RELAMP-1..3 têm-nos). Só o `sintetizarR1()` (l. 117-128) devolve 6 campos ⇒ **não há chave `R-1` no Blob `edicoes-metadata`**.
- Outras fontes verificadas, todas sem prazo: `getEdicaoPrazo` (`web3.js` l. 176) devolve `null` quando `prazo<=0`, e só alimenta o `prazoProgramado`; on-chain `prazo=0` para a R-1 (medição do UTAC000.14, não repetida aqui). `GET /schedule?mes=2026-10` e `?mes=2026-09` → **404** `schedule_nao_encontrado`. `cron-reset-programado` é só programado e admin. `edicao-janela.mjs` é puro e só se aplica a edições com metadata.
- ⚠️ **Achado que a medição do executor não declara:** «só existe quando alguém ABRE uma edição» **não vale para a R-1**. `criarEdicao` gera ids `${PREFIX}-${++counter}` (`proximoId`, l. 82-93) ⇒ abrir edições cria `RELAMP-4`, nunca a `R-1`. Mas o cliente fixa `EDICAO_ATIVA = "R-1"` (`AppContext.jsx` l. 57) e o `lance-relampago` usa por omissão `EDICAO_PADRAO` (l. 134). **Nenhum acto operacional suportado pelo código dá à R-1 um prazo real.** Só uma escrita manual da chave `R-1` no Blob, ou trocar a edição activa.

## Afirmação 2 — «participação não observável; exige endpoint novo» → **CONFIRMADA NA SUBSTÂNCIA, ERRADA NA LETRA**

Confirmado:
```
$ curl -s ".../lances-flash?edicaoId={R-1,RELAMP-3,ESPECIAL-AIRFRYER}"
R-1 200 application/json  keys edicaoId,ocultoAteConsolidar,lances n 0
RELAMP-3 200 application/json  keys edicaoId,ocultoAteConsolidar,lances n 0
ESPECIAL-AIRFRYER 200 application/json  keys edicaoId,ocultoAteConsolidar,lances n 0
```
- `lances-flash` lê o Blob `lances-relampago` (l. 10/52/68). Em mainnet o `lance-relampago` grava via `addLance` (data-store), l. 247-261, e **não** no blob legado ⇒ 0 lances.
- Notificações: `registrarEventosDeLance` só corre no ramo legado (l. 267-283). `gerarResumosPosEdicao` (`notificacoes-usuario.mjs` l. 177-186) lê o blob legado. ⇒ Em mainnet **não há eventos de participação** no feed `/notificacoes`.
- `saldo-rs` só devolve o saldo. `pontuacao` é admin. `pedidos` não tem lances. O `MeusAtivos` usa os `lances` de sessão (`AppContext`). No `localStorage` existem só `gut_prazo_*`, `gut_saldo_cache`, `gut_chat_history`, `gut_visitor_id` e `gut_reset_v`: **nada por edição**.
- O cliente não pode ler o Supabase `lances` directamente: RLS `service_role` only (`20260620_schema_definitivo.sql` l. 56/61), e as MVs têm `REVOKE anon, authenticated`.

⚠️ **Refutação na letra:** **já existe** uma API autenticada que devolve as participações do titular em mainnet. É o `POST /exportar-dados` (user-session, owner-only, `validarOwnerOuAdmin`). Ele faz `sb.from("lances").select("*").eq("endereco", …)` (l. 121/131) e também lê `saldo_rs_debitos` (o débito leva `motivo: lance-${edicaoId}`, `lance-relampago` l. 227). Com `DATA_STORE_BACKEND=supabase` em produção (memória MC101 / flip de 2026-06-21), isto **inclui `edicao_id`**.
**Porque não serve, e o endpoint novo continua certo:** é a exportação LGPD (finalidade diferente). Tem rate-limit de 6, é POST e pesado (colecta ~15 stores e tabelas), e devolve **o próprio `valor_centavos`** de edições abertas. O dono ver o próprio valor não é fuga, mas fazer polling disto para um overlay seria abuso de finalidade e partir-se-ia no rate-limit.
ℹ️ **Para o 17a (reduz risco):** já existe o `idx_lances_endereco ON lances(endereco)` (schema l. 51) e o `exportar-dados` é precedente de leitura por endereço ⇒ a ST3 «exige migração» **não deve disparar**. O spec pode dizer isto em vez de «medir».
ℹ️ Fora de escopo, para a DEBT: os lances mainnet anteriores ao flip vivem no Blob `bids` (Key-Per-Bid, `bids-store.mjs`), e o `exportar-dados` **não exporta esse Blob**. Possível lacuna LGPD art. 18. Não medi se o Blob tem dados.

## Afirmação 3 — «overlay agregado único exige tocar Dashboard/MercadoLances» → **REFUTADA (na letra)**

- Os dois overlays só montam com `{showOverlay && …}` (Dashboard l. 524, MercadoLances l. 209), e `showOverlay` **vive no `AppContext`**, que está autorizado (l. 207; o único `setShowOverlay(true)` é a l. 1208).
- Sítio único autorizado: o `AppLayout` / `App.jsx` (l. 455, a rota-pai de `/` e `/mercado`, dentro do `AppProvider`, l. 425). Basta montar lá o overlay agregado e o `AppContext` deixar de pôr `showOverlay=true` (ou passar a usar um estado novo). Assim **os 2 antigos nunca renderizam e não coexistem**, sem tocar nos ficheiros proibidos.
- Custo dessa via: fica código morto em Dashboard e MercadoLances, e o handler `handleNovaRodada` continua exposto. A decisão do 17c (autorizar tocar nos dois «só para retirar») é mais limpa, mas **não é obrigatória**. O 17c deve mencionar a alternativa.
- Isto **não salva o UTAC000.17**: o filtro por participação (afirmação 2) e o prazo real (afirmação 1) bloqueiam de qualquer forma, e «visto» + agregado + testes não cabem em 2 h ⇒ **PARAR mantém-se correcto**.

## 17b — é implementável no escopo e fecha a DEBT-016? → **Implementável, mas NÃO fecha a DEBT-016 e tem riscos não declarados**

⚠️ **R-B1 (grave) — armadilha do «NOVA RODADA».** A DEBT-016 (`_logs/DEBT.md` l. 49) inclui expressamente «sem `onClose`; só sai por NOVA RODADA, que rearma 30 min locais». Com o prazo vindo do servidor:
- `handleNovaRodada` (l. 1326-1344) faz `fimDisparadoRef=false`, `showOverlay=false` e `setPrazoTimestamp(now+DURACAO)` (local).
- **Se** o servidor prevalecer (o objectivo do 17b): no próximo poll (≤60 s), ou logo de imediato se o prazo for derivado, o prazo volta ao `termino_em` vencido. `restante===0` e `fimDisparadoRef` volta a `false` ⇒ o overlay **reabre ~1,2 s depois**, para sempre.
- **Se** o local prevalecer: rearma 30 min **locais**, ou seja, a DEBT-016 volta.
- O botão está no `FimEdicaoOverlay.jsx`, **proibido no 17b**. ⇒ Com o 17b sozinho e a trava `EM_BREVE_MODE` desligada, o utilizador fica preso num modal que não se fecha. **O 17b não pode declarar «fecha a DEBT-016».** No máximo fecha a parte do «prazo local». A DEBT só fecha com o 17c (`onClose`), e tem de ficar escrito: «não desligar o EM BREVE antes do 17c».

⚠️ **R-B2 — o fallback do `useEdicoes` é o próprio prazo local (circularidade).** `useEdicoes.sintetizarR1()` (estado inicial e `catch`) constrói o `termino_em` da R-1 a partir de `localStorage.gut_prazo_flash` (ou de `now+1h`), **sem** o filtro de 600 s. E o `AppContext` grava o `prazoFlash` nessa mesma chave (l. 216). Por isso, se o 17b ler `edicoes["R-1"].termino_em` sem verificar `edicoesStatus==="ok"` (ou dados reais):
- (a) antes do 1.º fetch e em erro de rede, o «prazo do servidor» **é o prazo local**;
- (b) um prazo vencido que ficou no storage dá `encerrado` no arranque, antes da resposta (APK/rede lenta), e um overlay espúrio.

O spec só prevê «edição sem `termino_em`». Este caso, uma edição **com** `termino_em` inventado pelo cliente, não está previsto. Também nota: o `normalizarMapa` **descarta** edições sem `termino_em` legível, por isso o caso que o spec prevê nunca chega ao `AppContext` como tal.

⚠️ **R-B3 — que edição é a «activa»?** O spec diz «termino_em da edição activa» sem a definir. Com `EDICAO_ATIVA="R-1"` fixo e a R-1 sempre sintetizada (afirmação 1), o resultado em produção é **o overlay nunca abrir, indefinidamente** (não só «hoje»), e nenhum `criarEdicao` o resolve. O spec deve decidir (R-1 vs. a relâmpago `aberto` com `termino_em` persistido) ou declarar isto como limite.

⚠️ **R-B4 — o programado fica de fora.** `prazoTimestamp` = `modalidade==="flash" ? prazoFlash : prazoProgramado`. O `prazoProgramado` também é local (24 h, l. 196-198), porque o on-chain devolve 0. Hoje `modalidade` arranca como `"flash"` (l. 178), mas qualquer `setModalidade("programado")` repõe a DEBT-016 com ciclo de 24 h. Declarar isto.

ℹ️ Outros pontos a declarar:
- Com a R-1 rolante, o `prazoFlash` muda a cada poll (60 s) ⇒ re-render do AppProvider de minuto a minuto (memória «timer isolado do AppContext»).
- `TabelaLances` mostra `prazoFormatado` (l. 47-48): passaria a «amanhã HH:MM» a mover-se. Fica desmontada sob EM BREVE (MercadoLances l. 201), coberta pelo GATE 18 que o spec já pede.
- Offset de relógio: há `offsetRelogioMs` (meio do RTT), por isso é viável fazer `prazo = termino − offset`. Mas o `tick` e o `TimerProvider` usam `Date.now()` ⇒ o offset tem de ser aplicado **ao prazo**, num sítio só. Com `offset===null`, decidir explicitamente.
- O ramo `else if (encerrado)` (l. 1212-1216) reabre o leilão se o prazo andar para a frente. Com a R-1 rolante, isto faz `encerrado` oscilar se em algum momento o cliente tiver um prazo vencido do storage. Isto liga-se ao R-B2.
- Os botões DEV `setPrazoTimestamp(+5s…)` (Dashboard l. 533-555, `import.meta.env.DEV`) vão competir com o servidor. É só em dev, mas os testes do 17b devem fixar quem ganha.

## Specs vs template (`skills/utac/spec-template.yml`)

| | linhas | campos obrigatórios | notas |
|---|---|---|---|
| 17a | 39 | todos presentes | `baseline` é texto («medir no SEG-1»), não um SHA ⚠️ |
| 17b | 40 | todos presentes | idem; o título «fecha a DEBT-016» é falso (R-B1) ⚠️ |
| 17c | 40 | todos presentes | idem |

- ⚠️ `baseline` não segue o template («OBRIGATORIO — commit medido…; sem valores inventados: sai de `git rev-parse HEAD`»). Um placeholder é defensável num spec futuro, mas o template pede um commit. Sugestão: `baseline: 85837bf` (+ «remedir no SEG-1»).
- ℹ️ `name`: o template diz `UTAC<NNN>[a-z][.N]` (ex.: `UTAC105a.2`), e `UTAC000.17a` põe a letra **depois** do `.N`. Pela forma do template seria `UTAC000a.17`, o que é estranho. É uma inconsistência de convenção; o operador decide (a série UTAC000.x já a violava).
- ℹ️ `HI` em `regras_activas` é válido (existe `protocol/regras/HI-higiene.md`), embora o comentário do template liste só 9 categorias.
- ℹ️ 17c: `dependencias` pede o 17b «fechado». Pela R-B1, a ordem certa de **activação** é 17b+17c juntos antes de desligar o EM BREVE. O 17b pode fechar antes, mas sem prometer a DEBT-016.

## Recomendações (para o operador; não executadas)
1. Manter o PARAR e a partição.
2. 17b: retirar «fecha a DEBT-016» → «fecha a origem local do prazo do relâmpago (parte da DEBT-016)». Acrescentar como ressalvas R-B1..R-B4, com testes de mutação a cobrir: armadilha NOVA RODADA, fallback antes do 1.º fetch e com rede em erro, e `offset===null`.
3. 17a: declarar o `idx_lances_endereco` e o precedente do `exportar-dados`, e porque não reutilizá-lo (finalidade e rate-limit).
4. 17c: registar a alternativa «montar no AppLayout + neutralizar o `showOverlay` no AppContext», que não toca nos proibidos.
5. Nova DEBT (candidata): o Blob `bids` fora do `exportar-dados`; e a R-1 não ter caminho de código para um prazo real.

---

# RESPOSTA DO EXECUTOR

Aceite (APROVADO COM RESSALVAS). Aplicado nos specs (só documentação): 17b com título corrigido («fecha a ORIGEM LOCAL do prazo — parte da DEBT-016») e ressalvas R-B1..R-B4; 17a com o `idx_lances_endereco` e o porquê de não reutilizar o `exportar-dados`; 17c com a alternativa `AppLayout` e a activação 17b+17c antes de desligar o EM BREVE; `baseline: 85837bf` nos 3. Novas dívidas: **DEBT-017** (R-1 sem caminho para prazo real) e **DEBT-018** (candidata: Blob `bids` fora do `exportar-dados`, não medida). A convenção do nome `UTAC000.17a` fica como está (a série UTAC000.x já diverge do template) — decisão do operador se quiser mudar.
