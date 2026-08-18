import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLoginWithEmail } from "@privy-io/react-auth";
import { useAppContext } from "../context/AppContext.jsx";
import { Button } from "@/components/ui";
import { COR } from "../components/glass/glassTokens.js";

// MC91.7 — Login do usuário comum com e-mail (OTP), reutilizando o padrão
// headless do SejaNossoParceiro (MC15.6). Usuários já cadastrados entram com
// o e-mail + código; a sessão segue o fluxo existente (carteira embedded ->
// auth-user -> JWT 24h).

const CORPO = {
  bg: "#0a0f1a",
  border: "rgba(148,163,184,0.18)",
  text: "#e8f0fe",
  muted: "#94a3b8",
  accent: "#f5a623",
};

const inputStyle = {
  width: "100%",
  padding: "0.75rem 0.9rem",
  background: "rgba(10,15,26,0.7)",
  border: `1px solid ${CORPO.border}`,
  borderRadius: "10px",
  color: CORPO.text,
  fontSize: "0.95rem",
  outline: "none",
};

const labelStyle = { color: CORPO.muted, fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem", display: "block" };

export default function LoginEmail() {
  const navigate = useNavigate();
  const { isConnected, ready } = useAppContext();
  const { sendCode, loginWithCode } = useLoginWithEmail();

  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [etapa, setEtapa] = useState("form"); // form | otp
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (isConnected) navigate("/", { replace: true });
  }, [isConnected, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErro("E-mail inválido."); return; }
    setEnviando(true);
    try {
      await sendCode({ email: email.trim().toLowerCase() });
      setEtapa("otp");
    } catch (err) {
      setErro(err?.message || "Não foi possível enviar o código. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const handleConfirmar = async (e) => {
    e.preventDefault();
    setErro(null);
    if (codigo.trim().length < 6) { setErro("Digite o código de 6 dígitos."); return; }
    if (busyRef.current) return;
    busyRef.current = true;
    setEnviando(true);
    try {
      await loginWithCode({ code: codigo.trim() });
      // redirect reativo via useEffect(isConnected)
    } catch (err) {
      setErro(err?.message || "Código inválido ou expirado. Tente novamente.");
    } finally {
      busyRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: CORPO.bg, color: CORPO.text, padding: "1.25rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="gut-glass-standard" style={{ width: "100%", maxWidth: 420, padding: "1.5rem", borderRadius: "18px" }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem", fontWeight: 800 }}>📧 Entrar com e-mail</h1>
        <p style={{ margin: "0 0 1.25rem", color: CORPO.muted, fontSize: "0.82rem" }}>
          {etapa === "form"
            ? "Digite seu e-mail cadastrado para receber um código de acesso."
            : `Enviamos um código para ${email}. Digite-o abaixo.`}
        </p>

        {erro && (
          <div style={{ marginBottom: "1rem", padding: "0.7rem 0.85rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: "10px", color: "#f87171", fontSize: "0.82rem" }}>
            ⚠️ {erro}
          </div>
        )}

        {etapa === "form" ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <div>
              <label style={labelStyle} htmlFor="le-email">E-mail</label>
              <input id="le-email" type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" />
            </div>
            <Button type="submit" size="lg" disabled={enviando || !ready} className="w-full">
              {enviando ? "⏳ Enviando código…" : "📨 Enviar código"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleConfirmar} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <div>
              <label style={labelStyle} htmlFor="le-codigo">Código de verificação</label>
              <input id="le-codigo" style={inputStyle} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" inputMode="numeric" autoFocus />
            </div>
            <Button type="submit" size="lg" disabled={enviando} className="w-full">
              {enviando ? "⏳ Entrando…" : "✅ Entrar"}
            </Button>
            <button type="button" onClick={() => setEtapa("form")} style={{ background: "none", border: "none", color: CORPO.muted, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline" }}>
              ← Voltar
            </button>
          </form>
        )}

        <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.82rem", color: CORPO.muted }}>
          Primeiro acesso?{" "}
          <Link to="/cadastro" style={{ color: COR.accent, fontWeight: 700 }}>Cadastre-se</Link>
        </div>
      </div>
    </div>
  );
}
