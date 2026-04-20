import { useState, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sanitizeLance, sanitizeEdicaoId } from "../utils/sanitize.js";
import { verificarRateLimit, registrarLance } from "../utils/rateLimiter.js";
import {
  getSignerFromProvider,
  assinarLance,
  enviarLance,
  consultarSaldo,
  hashLance,
  CONTRATO_SEPOLIA,
} from "../utils/web3.js";

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === "true";

const FASES = {
  IDLE: "idle",
  HASHING: "hashing",
  ASSINANDO: "assinando",
  ENVIANDO: "enviando",
  SUCESSO: "sucesso",
  ERRO: "erro",
};

/**
 * CardLance — Submissão de lances com WalletConnect + MetaMask.
 *
 * Fluxo completo:
 *  1. Usuário clica "Conectar Carteira" → AppKit abre modal com QR code WalletConnect
 *  2. Usuário insere o valor do lance
 *  3. Clica "Confirmar Lance":
 *     a. Rate Limit verificado (5/min, cooldown 3s)
 *     b. Hash Argon2id gerado off-chain
 *     c. Assinatura EIP-191 solicitada → notificação no telemóvel via WalletConnect
 *     d. Transação darLance() enviada ao contrato Sepolia
 */
export default function CardLance({ idEdicao, onLanceSucesso, address, isConnected, onConnect, onDisconnect, encerrado }) {
  // wallets vem do Privy — embedded wallet criada automaticamente no login
  const { wallets } = useWallets();
  const privyWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];

  const [valor, setValor] = useState("");
  const [fase, setFase] = useState(FASES.IDLE);
  const [erro, setErro] = useState("");
  const [ultimoHash, setUltimoHash] = useState(null);
  const [ultimaTx, setUltimaTx] = useState(null);
  const [saldo, setSaldo] = useState(null);

  const edicaoSanitizada = sanitizeEdicaoId(idEdicao ?? "");
  const ocupado = [FASES.HASHING, FASES.ASSINANDO, FASES.ENVIANDO].includes(fase);

  // Atualiza saldo via embedded wallet do Privy
  async function atualizarSaldo() {
    if (!address || MOCK_MODE) return;
    try {
      if (!privyWallet) return;
      const ethereumProvider = await privyWallet.getEthereumProvider();
      const s = await consultarSaldo(ethereumProvider, CONTRATO_SEPOLIA, address);
      setSaldo(s);
    } catch { /* silencioso */ }
  }

  // Auto-consulta saldo ao conectar/trocar carteira
  useEffect(() => {
    atualizarSaldo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  async function handleDarLance() {
    setErro("");
    setFase(FASES.IDLE);

    // 1. Sanitização
    const valorCentavos = sanitizeLance(valor);
    if (valorCentavos === null) {
      setErro("Valor inválido. Use um número inteiro entre 1 e 999999 (centavos).");
      return;
    }

    // 2. Rate Limit
    const { permitido, motivo } = verificarRateLimit(address);
    if (!permitido) {
      setErro(motivo);
      return;
    }

    try {
      if (MOCK_MODE) {
        // ── MOCK: simula pipeline sem MetaMask ───────────────────────────
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        setFase(FASES.HASHING);   await sleep(800);
        setFase(FASES.ASSINANDO); await sleep(900);
        setFase(FASES.ENVIANDO);  await sleep(700);
        const fakeTx = "0xMOCK" + Math.random().toString(16).slice(2, 18).toUpperCase();
        const fakeHash = "argon2id_mock_" + Math.random().toString(16).slice(2, 18);
        registrarLance(address);
        setUltimaTx(fakeTx);
        setUltimoHash(fakeHash);
        setSaldo((s) => (s ?? 0) + 1);
        setFase(FASES.SUCESSO);
        setValor("");
        onLanceSucesso?.({ address, valorCentavos, txHash: fakeTx });
        return;
        // ────────────────────────────────────────────────────────────────
      }

      // 3. Hash Argon2id (prova de intenção off-chain)
      setFase(FASES.HASHING);
      const hash = await hashLance(address, edicaoSanitizada, valorCentavos);
      setUltimoHash(hash);

      // 4. Assinatura EIP-191 via Privy embedded wallet (sem extensão, sem QR Code)
      setFase(FASES.ASSINANDO);
      if (!privyWallet) throw new Error("Carteira não encontrada. Faça login novamente.");
      await privyWallet.switchChain(11155111); // garante rede Sepolia
      const ethereumProvider = await privyWallet.getEthereumProvider();
      const { signer } = await getSignerFromProvider(ethereumProvider);
      const { mensagem, assinatura } = await assinarLance(signer, edicaoSanitizada, valorCentavos);

      // 5. Envio on-chain
      setFase(FASES.ENVIANDO);
      const receipt = await enviarLance(signer, CONTRATO_SEPOLIA, edicaoSanitizada, valorCentavos);

      // 6. Pós-confirmação
      registrarLance(address);
      setUltimaTx(receipt.hash);
      setFase(FASES.SUCESSO);
      setValor("");
      await atualizarSaldo();
      onLanceSucesso?.({ address, valorCentavos, txHash: receipt.hash });

    } catch (err) {
      const msg =
        err?.revert?.args?.[0] ??
        err?.reason ??
        (err?.code === "ACTION_REJECTED" ? "Assinatura cancelada pelo utilizador." : null) ??
        err?.message ??
        "Erro desconhecido.";
      setErro(msg);
      setFase(FASES.ERRO);
    }
  }

  const valorReais = valor ? `R$ ${(parseInt(valor || "0", 10) / 100).toFixed(2)}` : "";

  return (
    <Card
      glow="primary"
      className={cn(
        "p-6 flex flex-col gap-4 text-[var(--color-gut-text)]",
        encerrado && "opacity-60"
      )}
    >

      {/* Header */}
      <div style={estilos.header}>
        <h3 style={estilos.titulo}>🎯 Dar Lance</h3>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {MOCK_MODE && <span style={estilos.mockBadge}>🧪 MOCK</span>}
          <span style={estilos.edicaoBadge}>Edição: {edicaoSanitizada}</span>
        </div>
      </div>

      {/* Botão de conexão AppKit — abre QR code WalletConnect */}
      <div style={estilos.conexaoArea}>
        {!isConnected ? (
          <button style={estilos.botaoConectar} onClick={onConnect}>
            🎯 Entrar no Leilão
          </button>
        ) : (
          <div style={estilos.carteiraConectada}>
            <div style={estilos.carteiraInfo}>
              <span style={estilos.dot} />
              <span style={estilos.enderecoTexto}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <span style={estilos.saldoBadge}>
                🔑 {saldo ?? "?"} senha{saldo !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button style={estilos.botaoTrocar} onClick={atualizarSaldo}>
                ↺ Atualizar
              </button>
              <button style={estilos.botaoSair} onClick={onDisconnect}>
                Sair
              </button>
            </div>
          </div>
        )}
        <p style={estilos.hintConexao}>
          Google · E-mail · Apple — sem extensão, sem QR Code, sem fricção.
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
          {valorReais && (
            <span style={estilos.valorPreview}>{valorReais}</span>
          )}
        </div>
        <p style={estilos.hintInput}>
          Mín: R$ 0,01 · Rate limit: 5 lances/min · Cooldown: 3s
        </p>
      </div>

      {/* Pipeline de progresso */}
      {ocupado && (
        <div style={estilos.pipeline}>
          {[
            { f: FASES.HASHING,   label: "Gerando hash Argon2id..." },
            { f: FASES.ASSINANDO, label: "Aguardando assinatura no telemóvel..." },
            { f: FASES.ENVIANDO,  label: "Enviando transação on-chain (Sepolia)..." },
          ].map(({ f, label }) => (
            <div key={f} style={{ ...estilos.pipelineItem, opacity: fase === f ? 1 : 0.3, fontWeight: fase === f ? "700" : "400" }}>
              {fase === f ? "⏳" : "○"} {label}
            </div>
          ))}
        </div>
      )}

      {/* Sucesso */}
      {fase === FASES.SUCESSO && (
        <div style={estilos.boxSucesso}>
          <p style={{ margin: 0, fontWeight: "600" }}>✅ Lance registrado na blockchain!</p>
          {ultimaTx && <p style={estilos.txText}>Tx: {ultimaTx.slice(0, 14)}...{ultimaTx.slice(-6)}</p>}
          {ultimoHash && <p style={estilos.hashText}>🔐 Argon2id: {ultimoHash.slice(0, 20)}...</p>}
        </div>
      )}

      {/* Erro */}
      {(fase === FASES.ERRO || erro) && erro && (
        <div style={estilos.boxErro}>⚠️ {erro}</div>
      )}

      {/* Leilão encerrado — bloqueia novos lances */}
      {encerrado && (
        <div style={{ background: "#1f0a0a", border: "1px solid #ef4444",
          borderRadius: "8px", padding: "0.85rem", textAlign: "center",
          color: "#ef4444", fontWeight: "700", fontSize: "0.9rem" }}>
          🔴 Leilão encerrado — novos lances bloqueados
        </div>
      )}

      {/* Sem senhas disponíveis */}
      {isConnected && !MOCK_MODE && saldo === 0 && !encerrado && (
        <div style={{
          background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.35)",
          borderRadius: "10px", padding: "0.75rem 1rem",
          color: "#f5a623", fontSize: "0.85rem", fontWeight: "600", textAlign: "center",
        }}>
          🔑 Sem senhas disponíveis — adquira senhas para participar
        </div>
      )}

      {/* Botão principal */}
      {!encerrado && (() => {
        const semSenhas = isConnected && !MOCK_MODE && saldo === 0;
        const desabilitado = !isConnected || ocupado || !valor || semSenhas;
        return (
          <button
            style={{
              ...estilos.botaoLance,
              opacity: desabilitado ? 0.4 : 1,
              cursor: desabilitado ? "not-allowed" : "pointer",
            }}
            onClick={handleDarLance}
            disabled={desabilitado}
          >
            {ocupado ? "⏳ Processando..." : "🚀 Confirmar Lance"}
          </button>
        );
      })()}

      <p style={estilos.rodape}>
        🔒 Argon2id · EIP-191 · Rate Limit · DOMPurify · WalletConnect v2
      </p>
    </Card>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const estilos = {
  card: {},  // handled by <Card> Shadcn
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  titulo: { margin: 0, fontSize: "1.05rem", fontWeight: "800", color: "#eef4ff", letterSpacing: "0.02em" },
  edicaoBadge: { fontSize: "0.72rem", color: "#00d4aa", background: "rgba(0,212,170,0.1)", padding: "0.22rem 0.75rem", borderRadius: "20px", border: "1px solid rgba(0,212,170,0.25)", fontWeight: "700" },
  conexaoArea: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  botaoConectar: { padding: "0.75rem 1rem", background: "linear-gradient(135deg,#f5a623,#f97316)", color: "#04080f", border: "none", borderRadius: "28px", fontWeight: "800", cursor: "pointer", fontSize: "0.92rem", letterSpacing: "0.03em", boxShadow: "0 4px 18px rgba(245,166,35,0.4)" },
  carteiraConectada: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,212,170,0.07)", padding: "0.6rem 1rem", borderRadius: "12px", border: "1px solid rgba(0,212,170,0.2)" },
  carteiraInfo: { display: "flex", alignItems: "center", gap: "0.75rem" },
  dot: { width: "8px", height: "8px", borderRadius: "50%", background: "#00c853", flexShrink: 0, boxShadow: "0 0 6px #00c853" },
  enderecoTexto: { fontFamily: "monospace", fontSize: "0.85rem", color: "#eef4ff" },
  saldoBadge: { background: "rgba(0,200,83,0.15)", padding: "0.2rem 0.6rem", borderRadius: "12px", fontSize: "0.72rem", color: "#00c853", border: "1px solid rgba(0,200,83,0.3)" },
  botaoTrocar: { background: "transparent", border: "1px solid rgba(0,212,170,0.25)", color: "#00d4aa88", borderRadius: "8px", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.75rem" },
  botaoSair: { background: "transparent", border: "1px solid rgba(255,61,113,0.4)", color: "#ff3d71", borderRadius: "8px", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.75rem" },
  mockBadge: { fontSize: "0.7rem", fontWeight: "800", color: "#f5a623", background: "rgba(245,166,35,0.12)", padding: "0.2rem 0.6rem", borderRadius: "20px", border: "1px solid rgba(245,166,35,0.35)" },
  hintConexao: { margin: 0, fontSize: "0.7rem", color: "#4a6080" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  labelInput: { fontSize: "0.82rem", color: "#4a6080", fontWeight: "600", letterSpacing: "0.04em" },
  inputWrapper: { position: "relative" },
  input: { width: "100%", padding: "0.75rem 1rem", background: "rgba(4,8,15,0.6)", border: "1px solid rgba(0,212,170,0.2)", borderRadius: "12px", color: "#eef4ff", fontSize: "1rem", boxSizing: "border-box", outline: "none" },
  valorPreview: { position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "#00d4aa", fontWeight: "700", fontSize: "0.9rem", pointerEvents: "none" },
  hintInput: { margin: 0, fontSize: "0.7rem", color: "#4a6080" },
  pipeline: { background: "rgba(4,8,15,0.5)", padding: "1rem", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "0.5rem", border: "1px solid rgba(0,212,170,0.1)" },
  pipelineItem: { fontSize: "0.83rem", transition: "opacity 0.2s", color: "#eef4ff" },
  boxSucesso: { background: "rgba(0,200,83,0.12)", padding: "1rem", borderRadius: "12px", color: "#00c853", border: "1px solid rgba(0,200,83,0.3)" },
  txText: { margin: "0.4rem 0 0", fontSize: "0.76rem", fontFamily: "monospace" },
  hashText: { margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#4ade80", wordBreak: "break-all" },
  boxErro: { background: "#7f1d1d", padding: "0.75rem 1rem", borderRadius: "8px", color: "#fca5a5", fontSize: "0.88rem" },
  boxErro: { background: "rgba(255,61,113,0.12)", padding: "0.75rem 1rem", borderRadius: "12px", color: "#ff3d71", fontSize: "0.85rem", border: "1px solid rgba(255,61,113,0.3)" },
  botaoLance: { padding: "0.9rem", background: "linear-gradient(135deg,#00d4aa,#00c853)", color: "#04080f", border: "none", borderRadius: "28px", fontSize: "1rem", fontWeight: "900", transition: "opacity 0.2s", letterSpacing: "0.03em", boxShadow: "0 4px 20px rgba(0,212,170,0.4)" },
  rodape: { margin: 0, fontSize: "0.68rem", color: "#4a6080", textAlign: "center", letterSpacing: "0.03em" },
};
