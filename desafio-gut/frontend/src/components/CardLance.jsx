import { useState, useRef } from "react";
import { useWallets } from "@privy-io/react-auth";
import { keccak256, toUtf8Bytes } from "ethers";
import { motion, useReducedMotion } from "framer-motion";
import * as Sentry from "@sentry/react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppContext } from "../context/AppContext.jsx";
import { sanitizeLance, sanitizeEdicaoId } from "../utils/sanitize.js";
import { verificarRateLimit, registrarLance } from "../utils/rateLimiter.js";
import {
  getSignerFromProvider,
  assinarLance,
  enviarLance,
  hashLance,
  CONTRATO_SEPOLIA,
} from "../utils/web3.js";

const SEPOLIA_CHAIN_ID = 11155111;

const FASES = {
  IDLE:         "idle",
  AUTENTICANDO: "autenticando",
  HASHING:      "hashing",
  ASSINANDO:    "assinando",
  ENVIANDO:     "enviando",
  SUCESSO:      "sucesso",
  ERRO:         "erro",
};

export default function CardLance({
  idEdicao,
  onLanceSucesso,
  address,
  isConnected,
  onConnect,
  onDisconnect,
  encerrado,
  tipoLeilao = "flash",
  ready      = true,
}) {
  const { wallets } = useWallets();
  const privyWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const reduce = useReducedMotion(); // MC20.2 ITEM 6 — morph só-visual do CTA

  const {
    saldoSenhas, saldoSenhasStatus,
    refetchSaldoRs, saldoRsCentavos, saldoRsStatus,
    userLabel,
  } = useAppContext();

  const [valor,             setValor]             = useState("");
  const [fase,              setFase]              = useState(FASES.IDLE);
  const [erro,              setErro]              = useState("");
  const [ultimoHash,        setUltimoHash]        = useState(null);
  const [ultimaTx,          setUltimaTx]          = useState(null);
  const [ultimaTxIsOnChain, setUltimaTxIsOnChain] = useState(false);

  // Cache do token de auth (10 min) — evita popup de signMessage a cada lance
  const flashAuthRef = useRef({ token: null, expiresAt: 0 });

  const edicaoSanitizada = sanitizeEdicaoId(idEdicao ?? "");
  const ocupado = [
    FASES.AUTENTICANDO, FASES.HASHING, FASES.ASSINANDO, FASES.ENVIANDO,
  ].includes(fase);
  const isProgramado = tipoLeilao === "programado";

  const saldoCarregando = isProgramado &&
                          (saldoSenhasStatus === "loading" || saldoSenhasStatus === "idle");
  const saldoErro       = isProgramado && saldoSenhasStatus === "error";
  const semFichas       = isProgramado && (saldoSenhas == null || saldoSenhas <= 0);
  const valorParsed     = parseInt(valor || "0", 10);
  const semSaldoRsFlash = !isProgramado &&
                          saldoRsCentavos !== null && valorParsed > 0 &&
                          saldoRsCentavos < valorParsed;

  // Obtém token JWT de auth para flash (cached 10min). Abre popup Privy só se expirado.
  async function getFlashAuthToken() {
    const now = Date.now();
    if (flashAuthRef.current.token && flashAuthRef.current.expiresAt > now + 60_000) {
      return flashAuthRef.current.token;
    }
    if (!privyWallet) throw new Error("Carteira não conectada. Faça login novamente.");

    const ts      = Date.now();
    const message = `DESAFIOGUT-AUTH:${ts}:${address}`;
    await privyWallet.switchChain(SEPOLIA_CHAIN_ID);
    const provider = await privyWallet.getEthereumProvider();
    const { signer } = await getSignerFromProvider(provider);
    const signature = await signer.signMessage(message);

    const resp = await fetch("/.netlify/functions/auth-lance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endereco: address, signature, message }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      const err = new Error(data?.error?.message || "Falha ao obter token de autenticação.");
      err.code = data?.error?.code;
      throw err;
    }
    flashAuthRef.current = {
      token:     data.token,
      expiresAt: now + (data.ttl || 600) * 1000,
    };
    return data.token;
  }

  async function handleDarLance() {
    setErro("");
    setFase(FASES.IDLE);

    const valorCentavos = sanitizeLance(valor);
    if (valorCentavos === null) {
      setErro("Valor inválido. Use um inteiro entre 1 e 999999 (centavos). Art. 27: mín R$ 0,01.");
      return;
    }

    const { permitido, motivo } = verificarRateLimit(address);
    if (!permitido) { setErro(motivo); return; }

    if (isProgramado) {
      if (saldoSenhasStatus === "loading" || saldoSenhasStatus === "idle") {
        setErro("Carregando saldo on-chain — aguarde alguns segundos e tente novamente.");
        return;
      }
      if (saldoSenhasStatus === "error") {
        setErro("Erro ao ler saldo on-chain. Verifique sua conexão e tente novamente.");
        return;
      }
      if (saldoSenhas == null || saldoSenhas <= 0) {
        setErro("Saldo de senhas insuficiente na blockchain. Aguarde crédito da coordenacao após confirmação do PIX (Art. 20).");
        return;
      }
    }

    try {
      // ── FLASH: auth → idempotência → off-chain via lance-relampago ──────
      if (!isProgramado) {
        // 1. Obter token de auth (cached 10min — Privy popup só na 1ª vez)
        setFase(FASES.AUTENTICANDO);
        const authToken = await getFlashAuthToken();

        // 2. Idempotency key: keccak256(endereco:valorCentavos:edicaoId)
        const idempotencyKey = keccak256(
          toUtf8Bytes(`${address}:${valorCentavos}:${edicaoSanitizada}`)
        );

        // 3. Chamar lance-relampago com auth + idempotência
        setFase(FASES.ENVIANDO);
        const resp = await fetch("/.netlify/functions/lance-relampago", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            endereco: address,
            valorCentavos,
            edicaoId: edicaoSanitizada,
            idempotencyKey,
            nomeExibicao: userLabel || null,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          if (resp.status === 401) flashAuthRef.current = { token: null, expiresAt: 0 };
          const msgMap = {
            saldo_insuficiente:       "Saldo R$ insuficiente. Recarregue via PIX.",
            params_invalidos:         "Parâmetros inválidos.",
            debito_falhou:            "Falha ao debitar saldo. Tente novamente.",
            token_expirado:           "Sessão expirada — nova autenticação necessária na próxima tentativa.",
            token_invalido:           "Falha na autenticação. Tente novamente.",
            endereco_nao_corresponde: "Endereço divergente. Saia e entre novamente.",
          };
          throw new Error(msgMap[data?.error?.code] ?? data?.error?.message ?? "Erro no lance relâmpago.");
        }
        registrarLance(address);
        setUltimaTx(data.lanceId);
        setUltimoHash(null);
        setUltimaTxIsOnChain(false);
        setFase(FASES.SUCESSO);
        setValor("");
        refetchSaldoRs();
        onLanceSucesso?.({ address, valorCentavos, txHash: data.lanceId, nomeExibicao: userLabel || null });
        return;
      }

      // ── PROGRAMADO: Hash → Assinar → on-chain ────────────────────────────
      setFase(FASES.HASHING);
      const hash = await hashLance(address, edicaoSanitizada, valorCentavos);
      setUltimoHash(hash);

      setFase(FASES.ASSINANDO);
      if (!privyWallet) throw new Error("Carteira não encontrada. Faça login novamente.");
      await privyWallet.switchChain(SEPOLIA_CHAIN_ID);
      const ethereumProvider = await privyWallet.getEthereumProvider();
      const { signer } = await getSignerFromProvider(ethereumProvider);
      await assinarLance(signer, edicaoSanitizada, valorCentavos);

      setFase(FASES.ENVIANDO);
      const receipt = await enviarLance(signer, CONTRATO_SEPOLIA, edicaoSanitizada, valorCentavos);

      registrarLance(address);
      setUltimaTx(receipt.hash);
      setUltimaTxIsOnChain(true);
      setFase(FASES.SUCESSO);
      setValor("");
      onLanceSucesso?.({ address, valorCentavos, txHash: receipt.hash, nomeExibicao: userLabel || null });

    } catch (err) {
      const reasonRaw = err?.revert?.args?.[0] ?? err?.reason ?? null;
      const traduzirRevert = {
        "Voce nao possui senhas disponiveis": "Saldo insuficiente na blockchain. Aguarde crédito da coordenacao após confirmação do PIX.",
        "Edicao nao esta ativa":              "Edição não está ativa on-chain. Aguarde a coordenacao reabrir.",
        "Prazo da edicao encerrado":          "Prazo da edição encerrado on-chain. Aguarde nova rodada.",
        "Lance minimo e R$ 0,01":             "Lance mínimo é R$ 0,01 (Art. 27).",
      };
      const msg =
        traduzirRevert[reasonRaw] ??
        reasonRaw ??
        (err?.code === "ACTION_REJECTED" ? "Assinatura cancelada." : null) ??
        err?.message ??
        "Erro desconhecido.";
      setErro(msg);
      setFase(FASES.ERRO);

      if (err?.code !== "ACTION_REJECTED") {
        Sentry.captureException(err, {
          tags: {
            idEdicao: edicaoSanitizada,
            wallet:   address ?? "anonymous",
            chainId:  SEPOLIA_CHAIN_ID,
            fase,
          },
          extra: { reasonRaw, valorCentavos, isProgramado },
        });
      }
    }
  }

  const valorReais = valor ? `R$ ${(parseInt(valor || "0", 10) / 100).toFixed(2)}` : "";

  let saldoLabel;
  if (!isProgramado) {
    const r  = saldoRsCentavos;
    const sx = saldoRsStatus === "loading" ? " ⏳"
             : saldoRsStatus === "stale"   ? " (antigo)"
             : saldoRsStatus === "error"   ? " ✗" : "";
    saldoLabel = r != null ? `💰 R$ ${(r / 100).toFixed(2)}${sx}` : `💰 R$ —${sx}`;
  } else {
    const n  = saldoSenhas;
    const sx = saldoSenhasStatus === "loading" ? " ⏳"
             : saldoSenhasStatus === "stale"   ? " (antigo)"
             : saldoSenhasStatus === "error"   ? " ✗" : "";
    saldoLabel = `🔗 ${n ?? "—"} senha${n === 1 ? "" : "s"}${sx}`;
  }
  const saldoTitle = !isProgramado
    ? `saldo R$ — status: ${saldoRsStatus}`
    : `saldo on-chain — status: ${saldoSenhasStatus}`;

  const desabilitado = !isConnected || ocupado || !valor || semFichas ||
                       saldoCarregando || saldoErro || semSaldoRsFlash;
  const tooltipBotao =
    saldoErro       ? "Erro ao ler saldo. Verifique sua conexão." :
    saldoCarregando ? "Aguardando leitura do saldo on-chain." :
    semFichas       ? "Sem senhas on-chain — aguarde crédito da coordenacao" :
    semSaldoRsFlash ? `Saldo R$ insuficiente (R$ ${saldoRsCentavos != null ? (saldoRsCentavos / 100).toFixed(2) : "0"} disponível)` :
    "";

  const pipelineItens = !isProgramado
    ? [
        { f: FASES.AUTENTICANDO, label: "🔐 Autenticando carteira…" },
        { f: FASES.ENVIANDO,     label: "⚡ Creditando on-chain…" },
      ]
    : [
        { f: FASES.HASHING,   label: "Gerando hash Argon2id..." },
        { f: FASES.ASSINANDO, label: "Assinando lance (Privy)..." },
        { f: FASES.ENVIANDO,  label: "Registrando lance on-chain · −1 senha..." },
      ];

  const labelBotao = fase === FASES.AUTENTICANDO
    ? "🔐 Autenticando…"
    : ocupado
      ? "⏳ Processando..."
    : saldoErro
      ? "⚠ Erro ao ler saldo"
    : saldoCarregando
      ? "⏳ Carregando saldo..."
    : isProgramado
      ? "🎫 Confirmar Lance (−1 senha)"
    : "⚡ Lance Relâmpago";

  return (
    <Card
      glow="primary"
      className={cn(
        "p-6 flex flex-col gap-4 text-[var(--color-gut-text)]",
        encerrado && "opacity-60"
      )}
    >
      <div style={estilos.header}>
        <h3 style={estilos.titulo}>🎯 Dar Lance</h3>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <span style={estilos.tipoBadge(isProgramado)}>
            {isProgramado ? "🎫 Programado" : "⚡ Flash"}
          </span>
          <span style={estilos.edicaoBadge}>Edição: {edicaoSanitizada}</span>
        </div>
      </div>

      <div style={estilos.conexaoArea}>
        {!isConnected ? (
          <button
            style={{ ...estilos.botaoConectar, opacity: ready ? 1 : 0.7, cursor: ready ? "pointer" : "wait" }}
            onClick={onConnect}
            disabled={!ready}
          >
            {ready ? "⚡ Aceito o DesafioGUT" : "⏳ Aguarde..."}
          </button>
        ) : (
          <div style={estilos.carteiraConectada}>
            <div style={estilos.carteiraInfo}>
              <span style={estilos.dot} />
              <span style={estilos.enderecoTexto}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <span style={estilos.saldoBadge} title={saldoTitle}>{saldoLabel}</span>
            </div>
            <button style={estilos.botaoSair} onClick={onDisconnect}>Sair</button>
          </div>
        )}
        <p style={estilos.hintConexao}>
          {isProgramado
            ? "Lance programado consome 1 senha on-chain (Art. 20: R$ 2,00) — adquira via Comprar Fichas."
            : "DesafioGUT Flash · 30 min · debita saldo R$ · menor lance único vence (Art. 8)."}
        </p>
      </div>

      <div style={estilos.inputGroup}>
        <label style={estilos.labelInput}>Valor do lance (em centavos)</label>
        <div style={estilos.inputWrapper}>
          <input
            type="number"
            min="1"
            max="999999"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ex: 5 = R$ 0,05"
            style={estilos.input}
            disabled={ocupado || !isConnected || encerrado}
          />
          {valorReais && <span style={estilos.valorPreview}>{valorReais}</span>}
        </div>
        <p style={estilos.hintInput}>Art. 27: Mín R$ 0,01 · Máx 5 lances/min · Cooldown 3s</p>
      </div>

      {ocupado && (
        <div style={estilos.pipeline}>
          {pipelineItens.map(({ f, label }) => (
            <div key={f} style={{
              ...estilos.pipelineItem,
              opacity:    fase === f ? 1   : 0.3,
              fontWeight: fase === f ? "700" : "400",
            }}>
              {fase === f ? "⏳" : "○"} {label}
            </div>
          ))}
        </div>
      )}

      {fase === FASES.SUCESSO && (
        <div style={estilos.boxSucesso}>
          <p style={{ margin: 0, fontWeight: "600" }}>✅ Lance registrado!</p>
          {ultimaTxIsOnChain && ultimaTx ? (
            <>
              <p style={estilos.txText}>
                TX:{" "}
                <a
                  href={`https://sepolia.etherscan.io/tx/${ultimaTx}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: "#fbbf24" }}
                >
                  {ultimaTx.slice(0, 14)}…{ultimaTx.slice(-6)}
                </a>{" "}🔗
              </p>
              {ultimoHash && <p style={estilos.hashText}>🔐 Argon2id: {ultimoHash.slice(0, 22)}...</p>}
            </>
          ) : ultimaTx ? (
            <p style={estilos.txText}>🔗 Recibo: {ultimaTx.slice(0, 18)}…</p>
          ) : null}
        </div>
      )}

      {(fase === FASES.ERRO || erro) && erro && (
        <div style={estilos.boxErro}>⚠️ {erro}</div>
      )}

      {encerrado && (
        <div style={{
          background: "#1f0a0a", border: "1px solid #ef4444",
          borderRadius: "8px", padding: "0.85rem", textAlign: "center",
          color: "#ef4444", fontWeight: "700", fontSize: "0.9rem",
        }}>
          🔴 Edição encerrada — novos lances bloqueados
        </div>
      )}

      {isConnected && isProgramado && !encerrado && saldoCarregando && (
        <div style={estilos.boxAvisoNeutro}>⏳ Carregando saldo on-chain — aguarde alguns segundos.</div>
      )}

      {isConnected && isProgramado && !encerrado && saldoErro && (
        <div style={estilos.boxErro}>⚠ Erro ao ler saldo on-chain. Verifique sua conexão e tente novamente.</div>
      )}

      {isConnected && isProgramado && !encerrado && semFichas && !saldoCarregando && !saldoErro && (
        <div style={{
          background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.35)",
          borderRadius: "10px", padding: "0.75rem 1rem",
          color: "#f5a623", fontSize: "0.85rem", fontWeight: "600", textAlign: "center",
        }}>
          🎫 Sem senhas on-chain — aguarde crédito da coordenacao após confirmação do PIX (Art. 20)
        </div>
      )}

      {isConnected && !isProgramado && !encerrado && semSaldoRsFlash && (
        <div style={{
          background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "10px", padding: "0.75rem 1rem",
          color: "#ef4444", fontSize: "0.85rem", fontWeight: "600", textAlign: "center",
        }}>
          ⚠️ Saldo R$ insuficiente (R${" "}
          {saldoRsCentavos != null ? (saldoRsCentavos / 100).toFixed(2) : "0"}
          {" "}disponível). Recarregue via PIX.
        </div>
      )}

      {!encerrado && (
        // MC20.2 ITEM 6 — botão morphing (apresentação): feedback elástico whileTap/
        // whileHover por spring. onClick/disabled/title/label e TODA a lógica de lance
        // (handleDarLance) ficam intactos (R1 — fluxo on-chain não alterado).
        <motion.button
          style={{
            ...estilos.botaoLance,
            opacity: desabilitado ? 0.4 : 1,
            cursor:  desabilitado ? "not-allowed" : "pointer",
          }}
          onClick={handleDarLance}
          disabled={desabilitado}
          title={tooltipBotao}
          whileHover={desabilitado || reduce ? undefined : { scale: 1.02 }}
          whileTap={desabilitado || reduce ? undefined : { scale: 0.96 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
        >
          {labelBotao}
        </motion.button>
      )}

      <p style={estilos.rodape}>
        🔒 Argon2id · EIP-191 · Rate Limit · DOMPurify · Beta Interno
      </p>
    </Card>
  );
}

const estilos = {
  header:           { display: "flex", justifyContent: "space-between", alignItems: "center" },
  titulo:           { margin: 0, fontSize: "1.05rem", fontWeight: "800", color: "#f5a623", letterSpacing: "0.05em", fontFamily: "'Orbitron', sans-serif" },
  edicaoBadge:      { fontSize: "0.72rem", color: "#fbbf24", background: "rgba(245,166,35,0.12)", padding: "0.22rem 0.75rem", borderRadius: "20px", border: "1px solid rgba(245,166,35,0.3)", fontWeight: "700" },
  tipoBadge: (p)    => ({ fontSize: "0.72rem", fontWeight: "800", color: p ? "#a78bfa" : "#fbbf24", background: p ? "rgba(167,139,250,0.1)" : "rgba(251,191,36,0.1)", padding: "0.22rem 0.75rem", borderRadius: "20px", border: `1px solid ${p ? "rgba(167,139,250,0.3)" : "rgba(251,191,36,0.3)"}` }),
  conexaoArea:      { display: "flex", flexDirection: "column", gap: "0.4rem" },
  botaoConectar:    { padding: "0.75rem 1rem", background: "linear-gradient(135deg,#f5a623,#f97316)", color: "#0a0f1a", border: "none", borderRadius: "28px", fontWeight: "800", cursor: "pointer", fontSize: "0.92rem", letterSpacing: "0.03em", boxShadow: "0 4px 18px rgba(245,166,35,0.4)" },
  carteiraConectada:{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(245,166,35,0.08)", padding: "0.6rem 1rem", borderRadius: "12px", border: "1px solid rgba(245,166,35,0.25)" },
  carteiraInfo:     { display: "flex", alignItems: "center", gap: "0.75rem" },
  dot:              { width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", flexShrink: 0, boxShadow: "0 0 6px #10b981" },
  enderecoTexto:    { fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", color: "#e8f0fe" },
  saldoBadge:       { background: "rgba(16,185,129,0.15)", padding: "0.2rem 0.6rem", borderRadius: "12px", fontSize: "0.72rem", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" },
  boxAvisoNeutro:   { background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: "10px", padding: "0.65rem 1rem", color: "#fbbf24", fontSize: "0.8rem", fontWeight: "600", textAlign: "center" },
  botaoSair:        { background: "transparent", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", borderRadius: "8px", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.75rem" },
  hintConexao:      { margin: 0, fontSize: "0.7rem", color: "#6b7db8" },
  inputGroup:       { display: "flex", flexDirection: "column", gap: "0.4rem" },
  labelInput:       { fontSize: "0.82rem", color: "#6b7db8", fontWeight: "600", letterSpacing: "0.04em" },
  inputWrapper:     { position: "relative" },
  input:            { width: "100%", padding: "0.75rem 1rem", background: "rgba(3,15,36,0.7)", border: "1px solid rgba(245,166,35,0.25)", borderRadius: "12px", color: "#e8f0fe", fontSize: "1rem", boxSizing: "border-box", outline: "none" },
  valorPreview:     { position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "#fbbf24", fontWeight: "700", fontSize: "0.9rem", pointerEvents: "none" },
  hintInput:        { margin: 0, fontSize: "0.7rem", color: "#6b7db8" },
  pipeline:         { background: "rgba(3,15,36,0.6)", padding: "1rem", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "0.5rem", border: "1px solid rgba(245,166,35,0.15)" },
  pipelineItem:     { fontSize: "0.83rem", transition: "opacity 0.2s", color: "#e8f0fe" },
  boxSucesso:       { background: "rgba(16,185,129,0.12)", padding: "1rem", borderRadius: "12px", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" },
  txText:           { margin: "0.4rem 0 0", fontSize: "0.76rem", fontFamily: "monospace" },
  hashText:         { margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#6ee7b7", wordBreak: "break-all" },
  boxErro:          { background: "rgba(239,68,68,0.12)", padding: "0.75rem 1rem", borderRadius: "12px", color: "#ef4444", fontSize: "0.85rem", border: "1px solid rgba(239,68,68,0.3)" },
  botaoLance:       { padding: "0.9rem", background: "linear-gradient(135deg,#f5a623,#e89400)", color: "#0a0f1a", border: "none", borderRadius: "28px", fontSize: "1rem", fontWeight: "900", fontFamily: "'Orbitron', sans-serif", transition: "opacity 0.2s", letterSpacing: "0.06em", boxShadow: "0 4px 24px rgba(245,166,35,0.50)" },
  rodape:           { margin: 0, fontSize: "0.68rem", color: "#6b7db8", textAlign: "center", letterSpacing: "0.03em" },
};
