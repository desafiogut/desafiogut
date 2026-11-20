# UTAC144 · SEG-1 — MEDIÇÃO

Executor: Claude Code (Opus 5.5) · 2026-11-20 · HEAD `dac478a` (local), origin/main `b6365e7` = produção `6affdd88`.

## Medido
- `git status`: nada do âmbito por commitar (só `scripts/utac112-prova-mutacao.mjs`, alheio).
- Docs: `docs/EDICAO-ESPECIAL-CONFIG.md:13` já documenta `passeACadaLances` (UTAC142.1). `passePorLance` dá **0** ocorrências no
  código de produção (só comentários históricos). O enunciado dizia que era a flag em produção: **premissa errada**.
- mc9952: `src/__tests__/mc9952-seguranca-gate.test.mjs`, testes (f) `:85` e (g) `:111`. `exemplo.com` aparece nas linhas 50, 99 e 133.
  A linha 50 é o teste puro de hostname, não precisa de DNS.
- DNS: `exemplo.com` é **instável nos resolvedores públicos**. `nslookup @8.8.8.8` → nome sem endereço; `@1.1.1.1` → timeout e
  depois 104.247.81.99; `dns.lookup` local → ENOTFOUND. Os outros hosts (imgur, jsdelivr, sslip.io) resolvem.
- Os testes (f)/(g) provam defesas contra SSRF com DNS real (sslip.io AAAA-only / nome prefixado / famílias de transição).
  Saltá-los inteiros esconderia essas provas.

## Decisões do operador (R18-144)
- **R18-144-A** commits separados (o dac478a fica, e o UTAC144 vai por cima com «[skip netlify]»), um só push depois de «AUTORIZO».
- **R18-144-B** documentar a flag **real** `passeACadaLances` e registar que `passePorLance` era o nome do UTAC142, substituído.
- **R18-144-C** saltar **só a amostra `exemplo.com`** quando não resolver (com diagnóstico). As provas de ataque e os outros CDNs correm sempre.

## Veredicto
AJUSTAR → SEGUIR com R18-144-A/B/C.
