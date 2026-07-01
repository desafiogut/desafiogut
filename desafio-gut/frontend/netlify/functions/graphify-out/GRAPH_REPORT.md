# Graph Report - functions  (2026-06-27)

## Corpus Check
- 112 files · ~76,783 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 685 nodes · 1913 edges · 34 communities (23 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d24945d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]

## God Nodes (most connected - your core abstractions)
1. `jsonError()` - 82 edges
2. `jsonResponse()` - 78 edges
3. `validarEndereco()` - 46 edges
4. `parseJsonBody()` - 40 edges
5. `aplicarRateLimit()` - 37 edges
6. `getSupabase()` - 36 edges
7. `tratarIntentEdicoes()` - 29 edges
8. `ValidationError` - 27 edges
9. `getAdminAddresses()` - 26 edges
10. `verificarUserSession()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `getParticipante()` --calls--> `verificarUserSession()`  [EXTRACTED]
  notificacoes.mjs → _lib/jwt.mjs
- `verificarToken()` --calls--> `jsonError()`  [EXTRACTED]
  mc302-aceitar.mjs → _lib/validate.mjs
- `verificarToken()` --calls--> `jsonError()`  [EXTRACTED]
  mc302-diagnostico.mjs → _lib/validate.mjs
- `extrairPaymentId()` --calls--> `parseJsonBody()`  [EXTRACTED]
  webhook-mercadopago.mjs → _lib/validate.mjs
- `handlePost()` --calls--> `autenticarAdmin()`  [EXTRACTED]
  banners.mjs → _lib/admin-auth.mjs

## Import Cycles
- None detected.

## Communities (34 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (76): abrirStore(), acaoInscrever(), acaoTransicao(), handleGet(), handlePost(), sanitizeText(), STATUS_VALIDOS, abrirStore() (+68 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (74): brl(), continuarWizard(), detectarIntent(), ehCancelar(), ehConfirmar(), extrairDuracaoSegundos(), extrairEdicaoId(), extrairProduto() (+66 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (54): abrirStore(), debitarWallet(), DIMENSOES, escapeXml(), gerarSvgTemplate(), handleGet(), handlePost(), inferTier() (+46 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (45): abrirConsentStore(), abrirVoucherStore(), extrairIp(), gravarConsentLog(), validarVoucher(), apurarMenorUnico(), deleteCota(), addLance() (+37 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (33): abrirStore(), appendReferralLog(), buscarVinculoPorIndicado(), concederBonus(), diaBRT(), estatisticasIndicador(), gerarCodigoIndicacao(), gerarRelatorioIndicacoes() (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (19): EVENTOS_PERMITIDOS, abrirStore(), dumpStore(), executar(), purgarBackupsAntigos(), handler, STORES_PARA_BACKUP, abrirStore() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (20): addLance(), CARREGADORES, getConfig(), getLances(), impl(), setConfig(), abrirStore(), cache (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (26): CATEGORIAS, creditarTrocoExcedente(), handleGet(), handlePost(), listarCategoria(), normalizarEmpresa(), resumoAgregado(), sanitizeText() (+18 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (20): ABI, abrir(), estaConsolidado(), gravarBid(), listarBids(), listarChavesBids(), marcarConsolidado(), montarChaveBid() (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (18): ABI, comprometerLanceOnchain(), creditarSenhas(), ensureEnv(), getCoordenacaoAddress(), getInstance(), getLanceDadoEvents(), getReadOnlyContract() (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (9): bytesToBigInt(), KmsSigner, montarAssinatura(), parseDerSignature(), spkiDerToAddress(), derInt(), derSig(), PUB (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.37
Nodes (14): lerTrocoLegado(), aplicarExpiracao(), chave(), consumirTrocoFIFO(), creditarTroco(), lerTroco(), registroVazio(), resumoTrocoAdmin() (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (11): ABI, derInt(), derSig(), fakeSA, GetPublicKeyCommand, iface, KMSClient, PUB (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.27
Nodes (9): STORES, assertChaveBrutaAusenteEmMainnet(), backendAssinatura(), criarSignerBiconomy(), novoBiconomyAdapter(), obterSignerCoordenacao(), resolverChaveCoordenacao(), ABI_RO (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.30
Nodes (11): handler, ABRIR_EDICAO_ABI, abrirStore(), agregarJanela(), analisarEngajamento(), dispararEdicaoAutomatica(), executarAcao(), lerFlag() (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (9): derInt(), derSig(), fakeSA, GetPublicKeyCommand, KMSClient, PUB, saCalls, SignCommand (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (12): dependencies, aws-sdk, ethers, jose, @netlify/blobs, @netlify/functions, @sentry/node, @supabase/supabase-js (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (4): chamadas, FakeContract, FakeProvider, FakeWallet

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (7): CNPJ_A, CNPJ_B, CNPJ_C, cotasMem, fpMem, stores, trocoMem

### Community 19 - "Community 19"
Cohesion: 0.28
Nodes (7): awsGetPublicKeyDer(), awsSignDigest(), _clients, getClient(), criarKmsSigner(), ABI, verificarToken()

### Community 20 - "Community 20"
Cohesion: 0.39
Nodes (7): getBlocoAtual(), abrirStore(), atualizarStats(), calcularBurstPorAddr(), detectarOutliers(), executar(), handler

### Community 22 - "Community 22"
Cohesion: 0.40
Nodes (4): h(), linhas, NOVO, req()

### Community 24 - "Community 24"
Cohesion: 0.40
Nodes (3): cotasMem, pagasMem, trocoMem

## Knowledge Gaps
- **97 isolated node(s):** `COORDENACAO`, `cache`, `ABI`, `CARREGADORES`, `PROMPT_SYSTEMS` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `jsonResponse()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 13`, `Community 19`, `Community 20`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `jsonError()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 11`, `Community 13`, `Community 19`, `Community 20`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `aplicarRateLimit()` connect `Community 5` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 11`, `Community 14`, `Community 20`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `COORDENACAO`, `cache`, `ABI` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07286192068800765 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05183861082737487 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05775638652350981 - nodes in this community are weakly interconnected._