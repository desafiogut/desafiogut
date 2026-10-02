# UTAC000.15 — SEG-1 — Medição

**Data:** 2026-10-02 · **Base:** `49bc141` = `origin/main` = HEAD (= declarado) · Evidência: `_logs/UTAC000.15_SEG-1_EVIDENCIA.txt`

## 1. Estado
- Suíte **frontend 664/664 · backend 967/973 VERDE**; `git status` limpo.
- Disco C: ~12 GB livres (95%) — herdado, não é deste UTAC. Worktrees: `main` + `wt-94` (outra sessão).

## 2. M12 reproduzido (HI10) — o buraco é maior do que o declarado
O M12 do validador do UTAC000.10 (texto da regra intacto; `vencedor` sobrescrito com o local em runtime) passa **53/53** nos 3 ficheiros relacionados **e a suíte frontend INTEIRA (664/664 VERDE)**. A DEBT-010 dizia «5/5»: o número real é «toda a suíte».

## 3. Dependências do `AppProvider` (Frente A)
- **Premissa do spec corrigida:** o `AppContext.jsx` **importa-se** pelo Vite SSR sem mocks (41 s; o Privy real carrega). O que falha é **executar**:
  1. `useLocation() may be used only in the context of a <Router>` (l. 371);
  2. depois, o SDK do Privy sem o seu Provider (`usePrivy`/`useWallets`, l. 444-446);
  3. I/O: `utils/web3.js` (RPC JSON real), `apiGet` (fetch), browser globals (`window`, `document`, `localStorage`, `sessionStorage`, `navigator`);
  4. **medido no SEG0:** o `@fingerprintjs` real (via `lib/fingerprint.js`) fica em ciclo de `wait(50)` sem DOM e o processo de teste **nunca termina**.
- Os efeitos (onde chegam os lances locais: polling `lances-flash`) **não correm em SSR** ⇒ o Provider tem de correr num condutor com efeitos: o `_hook-runner.mjs` do MC94 já existe.

## 4. Onde o `vencedor` do contexto chega ao ecrã
- `MercadoLances` → `OverlayVencedor` (gate `showOverlay`, que em EM BREVE nunca abre desde o UTAC000.14).
- `Dashboard`/`MeusAtivos` só o usam como reserva (lêem o oficial por si) ⇒ o M12 é invisível lá.

## 5. Veredito: **SEGUIR** (ajuste: o obstáculo é execução, não import; o arnês corre o Provider no condutor de hooks e renderiza a árvore que ele devolve com a página como filha).
