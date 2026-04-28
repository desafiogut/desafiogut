import { useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sanitizeLance, sanitizeEdicaoId } from "../utils/sanitize.js";
import { verificarRateLimit, registrarLance } from "../utils/rateLimiter.js";
import { gastarFicha } from "../utils/saldoInterno.js";
import {
  getSignerFromProvider,
  assinarLance,
  enviarLance,
  hashLance,
  CONTRATO_SEPOLIA,
} from "../utils/web3.js";

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === "true";

const FASES = {
  IDLE:      "idle",
  HASHING:   "hashing",
  ASSINANDO: "assinando",
  ENVIANDO:  "enviando",
  SUCESSO:   "sucesso",
  ERRO:      "erro",
};

/**
 * CardLance — Submissão de lances com saldo interno Beta.
 *
 * Fluxo Flash:      Hash → Assinar → Registrar local (sem custo de ficha)
 * Fluxo Programado: Hash → Assinar → Consumir 1 ficha → Registrar local
 *
 * Art. 20 regulamento: R$ 2,00/senha  |  Art. 27: lance mín R$ 0,01
 */
export default function CardLance({
  idEdicao,
  onLanceSucesso,
  address,
  isConnected,
  onConnect,
  onDisconnect,
  encerrado,
  tipoLeilao       = "flash",
  carteiraFlash    = 0,
  fichasProgramadas = 0,
  onRefreshSaldo,
  ready            = true,       // Privy SDK ready — false = ainda inicializando
}) {
  const { wallets } = useWallets();
  const privyWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];

  const [valor,     setValor]     = useState("");
  const [fase,      setFase]      = useState(FASES.IDLE);
  const [erro,      setErro]      = useState("");
  const [ultimoHash, setUltimoHash] = useState(null);
  const [ultimaTx,   setUltimaTx]   = useState(null);

  const edicaoSanitizada = sanitizeEdicaoId(idEdicao ?? "");
  const ocupado          = [FASES.HASHING, FASES.ASSINANDO, FASES.ENVIANDO].includes(fase);
  const isProgramado     = tipoLeilao === "programado";
  const semFichas        = isProgramado && fichasProgramadas <= 0;

  // ── Lógica principal de lance ─────────────────────────────────────────────
  async function handleDarLance() {
    setErro("");
    setFase(FASES.IDLE);

    // 1. Sanitização
    const valorCentavos = sanitizeLance(valor);
    if (valorCentavos === null) {
      setErro("Valor inválido. Use um inteiro entre 1 e 999999 (centavos). Art. 27: mín R$ 0,01.");
      return;
    }

    // 2. Rate Limit
    const { permitido, motivo } = verificarRateLimit(address);
    if (!permitido) { setErro(motivo); return; }

    // 3. Valida fichas para leilão programado
    if (isProgramado && fichasProgramadas <= 0) {
      setErro("Sem fichas disponíveis. Converta saldo flash em fichas (Art. 20: R$ 2,00 / ficha).");
      return;
    }

    try {
      // ── MOCK: pipeline simulado ──────────────────────────────────────────
      if (MOCK_MODE) {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        setFase(FASES.HASHING);   await sleep(700);
        setFase(FASES.ASSINANDO); await sleep(600);
        setFase(FASES.ENVIANDO);  await sleep(450);

        if (isProgramado) gastarFicha();
        registrarLance(address);

        const fakeTx   = "0xBETA" + Math.random().toString(16).slice(2, 14).toUpperCase();
        const fakeHash = "argon2id_beta_" + Math.random().toString(16).slice(2, 14);
        setUltimaTx(fakeTx);
        setUltimoHash(fakeHash);
        setFase(FASES.SUCESSO);
        setValor("");
        onRefreshSaldo?.();
        onLanceSucesso?.({ address, valorCentavos, txHash: fakeTx });
        return;
      }

      // ── REAL: Hash → Assinar → (ficha) → Registrar ───────────────────────

      // 4. Hash Argon2id (prova de intenção off-chain)
      setFase(FASES.HASHING);
      const hash = await hashLance(address, edicaoSanitizada, valorCentavos);
      setUltimoHash(hash);

      // 5. Assinatura EIP-191 via Privy embedded wallet
      setFase(FASES.ASSINANDO);
      if (!privyWallet) throw new Error("Carteira não encontrada. Faça login novamente.");
      await privyWallet.switchChain(11155111); // garante rede Sepolia (Art. operação on-chain)
      const ethereumProvider = await privyWallet.getEthereumProvider();
      const { signer } = await getSignerFromProvider(ethereumProvider);
      await assinarLance(signer, edicaoSanitizada, valorCentavos);

      // 6. Consome ficha antes de registrar (programado)
      if (isProgramado) gastarFicha();

      // 7. Registro local beta (enviarLance não é mais on-chain)
      setFase(FASES.ENVIANDO);
      const receipt = await enviarLance(signer, CONTRATO_SEPOLIA, edicaoSanitizada, valorCentavos);

      registrarLance(address);
      setUltimaTx(receipt.hash);
      setFase(FASES.SUCESSO);
      setValor("");
      onRefreshSaldo?.();
      onLanceSucesso?.({ address, valorCentavos, txHash: receipt.hash });

    } catch (err) {
      const msg =
        err?.revert?.args?.[0] ??
        err?.reason ??
        (err?.code === "ACTION_REJECTED" ? "Assinatura cancelada." : null) ??
        err?.message ??
        "Erro desconhecido.";
      setErro(msg);
      setFase(FASES.ERRO);
    }
  }

  const valorReais   = valor ? `R$ ${(parseInt(valor || "0", 10) / 100).toFixed(2)}` : "";
  const saldoLabel   = isProgramado
    ? `🎫 ${fichasProgramadas} ficha${fichasProgramadas !== 1 ? "s" : ""}`
    : `💰 R$ ${carteiraFlash.toFixed(2)}`;
  const desabilitado = !isConnected || ocupado || !valor || semFichas;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Card
      glow="primary"
      className={cn(
        "p-6 flex flex-col gap-4 text-[var(--color-gut-text)]",
        encerrado && "opacity-60"
      )}
    >
      {/* Header do card */}
      <div style={estilos.header}>
        <h3 style={estilos.titulo}>🎯 Dar Lance</h3>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {MOCK_MODE && <span style={estilos.mockBadge}>🧪 MOCK</span>}
          <span style={estilos.tipoBadge(isProgramado)}>
            {isProgramado ? "🎫 Programado" : "⚡ Flash"}
          </span>
          <span style={estilos.edicaoBadge}>Edição: {edicaoSanitizada}</span>
        </div>
      </div>

      {/* Conexão */}
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
              <span style={estilos.saldoBadge}>{saldoLabel}</span>
            </div>
            <button style={estilos.botaoSair} onClick={onDisconnect}>Sair</button>
          </div>
        )}
        <p style={estilos.hintConexao}>
          {isProgramado
            ? "Lance programado consome 1 ficha (Art. 20: R$ 2,00) — converta saldo flash no painel acima."
            : "DesafioGUT Flash · 5 min · lance livre · menor lance único vence (Art. 8)."}
        </p>
      </div>

      {/* Input de valor */}
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

      {/* Pipeline de progresso */}
      {ocupado && (
        <div style={estilos.pipeline}>
          {[
            { f: FASES.HASHING,   label: "Gerando hash Argon2id..." },
            { f: FASES.ASSINANDO, label: "Assinando lance (Privy)..." },
            { f: FASES.ENVIANDO,  label: `Registrando lance Beta${isProgramado ? " · −1 ficha" : ""}...` },
          ].map(({ f, label }) => (
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

      {/* Sucesso */}
      {fase === FASES.SUCESSO && (
        <div style={estilos.boxSucesso}>
          <p style={{ margin: 0, fontWeight: "600" }}>✅ Lance registrado!</p>
          {ultimaTx   && <p style={estilos.txText}>ID: {ultimaTx.slice(0, 16)}...{ultimaTx.slice(-6)}</p>}
          {ultimoHash && <p style={estilos.hashText}>🔐 Argon2id: {ultimoHash.slice(0, 22)}...</p>}
        </div>
      )}

      {/* Erro */}
      {(fase === FASES.ERRO || erro) && erro && (
        <div style={estilos.boxErro}>⚠️ {erro}</div>
      )}

      {/* Leilão encerrado */}
      {encerrado && (
        <div style={{
          background: "#1f0a0a", border: "1px solid #ef4444",
          borderRadius: "8px", padding: "0.85rem", textAlign: "center",
          color: "#ef4444", fontWeight: "700", fontSize: "0.9rem",
        }}>
          🔴 Edição encerrada — novos lances bloqueados
        </div>
      )}

      {/* Sem fichas (só programado) */}
      {isConnected && isProgramado && fichasProgramadas === 0 && !encerrado && (
        <div style={{
          background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.35)",
          borderRadius: "10px", padding: "0.75rem 1rem",
          color: "#f5a623", fontSize: "0.85rem", fontWeight: "600", textAlign: "center",
        }}>
          🎫 Sem fichas — use "→ 1 Ficha (R$ 2,00)" no painel acima para participar (Art. 20)
        </div>
      )}

      {/* Botão principal */}
      {!encerrado && (
        <button
          style={{
            ...estilos.botaoLance,
            opacity: desabilitado ? 0.4 : 1,
            cursor:  desabilitado ? "not-allowed" : "pointer",
          }}
          onClick={handleDarLance}
          disabled={desabilitado}
        >
          {ocupado
            ? "⏳ Processando..."
            : isProgramado
              ? "🎫 Confirmar Lance (−1 ficha)"
              : "⚡ Confirmar Lance"}
        </button>
      )}

      <p style={estilos.rodape}>
        🔒 Argon2id · EIP-191 · Rate Limit · DOMPurify · Beta Interno
      </p>
    </Card>
  );
}

// ─── Estilos — paleta Azul Marinho GUT ───────────────────────────────────────
const estilos = {
  header:          { display: "flex", justifyContent: "space-between", alignItems: "center" },
  titulo:          { margin: 0, fontSize: "1.05rem", fontWeight: "800", color: "#e8f0fe", letterSpacing: "0.02em" },
  edicaoBadge:     { fontSize: "0.72rem", color: "#93c5fd", background: "rgba(37,99,235,0.12)", padding: "0.22rem 0.75rem", borderRadius: "20px", border: "1px solid rgba(37,99,235,0.3)", fontWeight: "700" },
  mockBadge:       { fontSize: "0.7rem", fontWeight: "800", color: "#f5a623", background: "rgba(245,166,35,0.12)", padding: "0.2rem 0.6rem", borderRadius: "20px", border: "1px solid rgba(245,166,35,0.35)" },
  tipoBadge: (p)   => ({ fontSize: "0.72rem", fontWeight: "800", color: p ? "#a78bfa" : "#fbbf24", background: p ? "rgba(167,139,250,0.1)" : "rgba(251,191,36,0.1)", padding: "0.22rem 0.75rem", borderRadius: "20px", border: `1px solid ${p ? "rgba(167,139,250,0.3)" : "rgba(251,191,36,0.3)"}` }),
  conexaoArea:     { display: "flex", flexDirection: "column", gap: "0.4rem" },
  botaoConectar:   { padding: "0.75rem 1rem", background: "linear-gradient(135deg,#f5a623,#f97316)", color: "#030f24", border: "none", borderRadius: "28px", fontWeight: "800", cursor: "pointer", fontSize: "0.92rem", letterSpacing: "0.03em", boxShadow: "0 4px 18px rgba(245,166,35,0.4)" },
  carteiraConectada:{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(37,99,235,0.08)", padding: "0.6rem 1rem", borderRadius: "12px", border: "1px solid rgba(37,99,235,0.25)" },
  carteiraInfo:    { display: "flex", alignItems: "center", gap: "0.75rem" },
  dot:             { width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", flexShrink: 0, boxShadow: "0 0 6px #10b981" },
  enderecoTexto:   { fontFamily: "monospace", fontSize: "0.85rem", color: "#e8f0fe" },
  saldoBadge:      { background: "rgba(16,185,129,0.15)", padding: "0.2rem 0.6rem", borderRadius: "12px", fontSize: "0.72rem", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" },
  botaoSair:       { background: "transparent", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", borderRadius: "8px", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.75rem" },
  hintConexao:     { margin: 0, fontSize: "0.7rem", color: "#4a6490" },
  inputGroup:      { display: "flex", flexDirection: "column", gap: "0.4rem" },
  labelInput:      { fontSize: "0.82rem", color: "#4a6490", fontWeight: "600", letterSpacing: "0.04em" },
  inputWrapper:    { position: "relative" },
  input:           { width: "100%", padding: "0.75rem 1rem", background: "rgba(3,15,36,0.7)", border: "1px solid rgba(37,99,235,0.25)", borderRadius: "12px", color: "#e8f0fe", fontSize: "1rem", boxSizing: "border-box", outline: "none" },
  valorPreview:    { position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "#93c5fd", fontWeight: "700", fontSize: "0.9rem", pointerEvents: "none" },
  hintInput:       { margin: 0, fontSize: "0.7rem", color: "#4a6490" },
  pipeline:        { background: "rgba(3,15,36,0.6)", padding: "1rem", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "0.5rem", border: "1px solid rgba(37,99,235,0.15)" },
  pipelineItem:    { fontSize: "0.83rem", transition: "opacity 0.2s", color: "#e8f0fe" },
  boxSucesso:      { background: "rgba(16,185,129,0.12)", padding: "1rem", borderRadius: "12px", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" },
  txText:          { margin: "0.4rem 0 0", fontSize: "0.76rem", fontFamily: "monospace" },
  hashText:        { margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#6ee7b7", wordBreak: "break-all" },
  boxErro:         { background: "rgba(239,68,68,0.12)", padding: "0.75rem 1rem", borderRadius: "12px", color: "#ef4444", fontSize: "0.85rem", border: "1px solid rgba(239,68,68,0.3)" },
  botaoLance:      { padding: "0.9rem", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#ffffff", border: "none", borderRadius: "28px", fontSize: "1rem", fontWeight: "900", transition: "opacity 0.2s", letterSpacing: "0.03em", boxShadow: "0 4px 20px rgba(37,99,235,0.45)" },
  rodape:          { margin: 0, fontSize: "0.68rem", color: "#4a6490", textAlign: "center", letterSpacing: "0.03em" },
};
