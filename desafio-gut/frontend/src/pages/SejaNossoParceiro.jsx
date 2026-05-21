// MC11.1 — Seção pública "Seja Nosso Parceiro!".
// MC12 — formulário de cadastro corporativo funcional (CNPJ, empresa, etc.)
// MC12.3 — Login Corporativo Independente: form sem login prévio, porta separada.
// MC12.3.1 — Cadastro DIRETO sem email-OTP: POST register-corporativo no submit,
//            sem disparar modal Privy. cliente_id derivado do CNPJ no servidor.
// Rota: /seja-nosso-parceiro (pública — visível para qualquer usuário).

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { getVisitorId } from "../lib/fingerprint.js";

const COR = {
  text: "#e8f0fe", muted: "#5a7090", primary: "#f5a623",
  bg: "rgba(10,16,42,0.6)", bgSoft: "rgba(245,166,35,0.07)",
  teal: "#00d4aa", success: "#10b981",
};

// Planos sincronizados com MIN_POR_CATEGORIA_BRL em cotas.mjs.
const PLANOS = [
  {
    nome: "Bronze",
    valor: 660,
    cor: "#cd7f32",
    icone: "🥉",
    beneficios: [
      "Banner publicitário (formato app)",
      "Exposição em horários de Relâmpago",
      "1 voucher promocional / mês",
      "Dashboard com métricas básicas",
    ],
  },
  {
    nome: "Prata",
    valor: 1350,
    cor: "#cbd5e1",
    icone: "🥈",
    beneficios: [
      "Tudo do Bronze",
      "Banner formato site (1200×300)",
      "3 vouchers promocionais / mês",
      "Analytics 30 dias",
    ],
  },
  {
    nome: "Ouro",
    valor: 2250,
    cor: "#f5a623",
    icone: "🥇",
    destaque: true,
    beneficios: [
      "Tudo do Prata",
      "Exposição em leilões Programados (24h)",
      "10 vouchers promocionais / mês",
      "Analytics 90 dias + geolocalização",
    ],
  },
  {
    nome: "Diamante",
    valor: 4500,
    cor: "#00d4ff",
    icone: "💎",
    beneficios: [
      "Tudo do Ouro",
      "Slot exclusivo na Vitrine (4 Slots)",
      "Vouchers ilimitados",
      "Suporte prioritário + co-marketing",
    ],
  },
];

const PASSOS = [
  { n: 1, icone: "🎯", titulo: "Escolha o plano",
    texto: "Bronze, Prata, Ouro ou Diamante — cada um com um nível de exposição." },
  { n: 2, icone: "💳", titulo: "Pague via PIX",
    texto: "Pagamento confirmado libera a cota no painel da coordenação." },
  { n: 3, icone: "📣", titulo: "Anuncie e meça",
    texto: "Suba seu banner, acompanhe impressões e cliques no Painel Lojista." },
];

const SEGMENTOS = ["Varejo", "Serviços", "Tecnologia", "Saúde", "Educação", "Alimentação", "Outro"];

// Validação de CNPJ (algoritmo dígitos verificadores).
function validarCNPJ(cnpj) {
  const nums = cnpj.replace(/\D/g, "");
  if (nums.length !== 14) return false;
  if (/^(\d)\1+$/.test(nums)) return false;
  const calc = (arr, len) => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += arr[len - i] * pos--;
      if (pos < 2) pos = 9;
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  const arr = nums.split("").map(Number);
  return calc(arr, 12) === arr[12] && calc(arr, 13) === arr[13];
}

function mascaraCNPJ(v) {
  return v.replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
    .slice(0, 18);
}

function validarURL(url) {
  if (!url) return true;
  try { const u = new URL(url); return u.protocol === "http:" || u.protocol === "https:"; }
  catch { return false; }
}

// MC12.3 — feature flag: porta corporativa pode ser desligada em build-time.
// VITE_CORPORATIVO_ATIVO=false esconde o formulário (apenas pitch).
const CORPORATIVO_ATIVO = import.meta.env.VITE_CORPORATIVO_ATIVO !== "false";

export default function SejaNossoParceiro() {
  const isMobile = useIsMobile();
  const { isConnected, tipoUsuario, atualizarTipoCorporativo } = useAppContext();

  // Estados do formulário
  const [cnpj,     setCnpj]     = useState("");
  const [email,    setEmail]    = useState(""); // MC12.3 — email do lojista
  const [empresa,  setEmpresa]  = useState("");
  const [segmento, setSegmento] = useState("Varejo");
  const [site,     setSite]     = useState("");
  const [logoUrl,  setLogoUrl]  = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro,     setErro]     = useState(null);
  const [cnpjJaExiste, setCnpjJaExiste] = useState(false);
  const [sucesso, setSucesso] = useState(null); // MC12.3.1 — UI sucesso pós-cadastro

  // MC12.3.1 — Cadastro DIRETO sem email-OTP.
  // Fluxo: validar client → GET ?cnpj (duplicidade) → POST register-corporativo
  // → UI de sucesso. Sem login Privy. Login fica para depois (acessar painel).
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setCnpjJaExiste(false);
    if (!validarCNPJ(cnpj)) { setErro("CNPJ inválido. Verifique os dígitos."); return; }
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setErro("Email inválido."); return;
    }
    if (!empresa.trim()) { setErro("Nome da empresa é obrigatório."); return; }
    if (!validarURL(site))    { setErro("URL do site inválida (use http:// ou https://)."); return; }
    if (!validarURL(logoUrl)) { setErro("URL do logo inválida (use http:// ou https://)."); return; }
    setEnviando(true);
    try {
      const cnpjNums = cnpj.replace(/\D/g, "");
      // FASE B — verificar duplicidade no servidor
      const checkRes = await fetch(`/.netlify/functions/cotas?cnpj=${cnpjNums}`);
      if (checkRes.ok) {
        setCnpjJaExiste(true);
        setErro("Este CNPJ já está cadastrado. Faça login com o email da empresa para acessar o painel.");
        setEnviando(false);
        return;
      } else if (checkRes.status !== 404) {
        throw new Error("Erro ao verificar CNPJ. Tente novamente.");
      }
      // FASE C — POST register-corporativo DIRETO (sem login Privy)
      const visitorId = await getVisitorId();
      const res = await fetch("/.netlify/functions/cotas?action=register-corporativo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(visitorId ? { "X-Visitor-ID": visitorId } : {}),
        },
        body: JSON.stringify({
          cnpj: cnpjNums,
          empresa: empresa.trim(),
          segmento,
          site: site.trim() || null,
          logoUrl: logoUrl.trim() || null,
          email: email.trim().toLowerCase(),
        }),
      });
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("CNPJ já cadastrado em outra conta.");
        }
        if (res.status === 429) {
          throw new Error("Limite de cadastros atingido. Tente novamente em alguns minutos.");
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Erro ao registrar.");
      }
      const registro = await res.json();
      // Atualiza estado local quando AppContext está disponível (logado).
      // Cadastros anônimos não atualizam tipoUsuario — login posterior faz isso.
      if (isConnected) atualizarTipoCorporativo(registro);
      setSucesso({
        empresa: registro.empresa,
        email: registro.email,
        cnpj: registro.cnpj,
      });
    } catch (err) {
      setErro(err?.message || "Erro ao cadastrar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const wrap = { padding: "1rem 0", maxWidth: "1200px", margin: "0 auto" };
  const wrapClass = "px-4 md:px-8";
  const card = {
    background: COR.bg,
    border: "1px solid rgba(245,166,35,0.18)",
    borderRadius: "16px",
    padding: isMobile ? "1.25rem" : "1.5rem",
    backdropFilter: "blur(16px)",
  };
  const inputStyle = {
    width: "100%", padding: "0.7rem 0.9rem",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(245,166,35,0.25)",
    borderRadius: "8px", color: COR.text,
    fontSize: "0.92rem", outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block", marginBottom: "0.4rem",
    color: COR.muted, fontSize: "0.8rem", fontWeight: 600,
    letterSpacing: "0.04em", textTransform: "uppercase",
  };

  // MC12.3 — feature flag OFF: apenas pitch comercial.
  if (!CORPORATIVO_ATIVO) {
    return (
      <div style={wrap} className={wrapClass}>
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            textAlign: "center",
            padding: isMobile ? "1.5rem 0.5rem" : "3rem 1rem",
          }}
        >
          <h1 style={{
            margin: 0, fontWeight: 900, color: COR.text, lineHeight: 1.15,
            fontFamily: "'Orbitron', sans-serif",
          }} className="text-2xl md:text-4xl">
            Seja Nosso Parceiro!
          </h1>
          <p style={{
            margin: "1.25rem auto 0", maxWidth: "680px",
            color: COR.muted, fontSize: "1rem",
          }}>
            Cadastro de parceiros temporariamente indisponível. Volte em breve.
          </p>
        </motion.header>
      </div>
    );
  }

  return (
    <div style={wrap} className={wrapClass}>
      {/* ── HERO ── */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          textAlign: "center",
          marginBottom: isMobile ? "2rem" : "3rem",
          padding: isMobile ? "1.5rem 0.5rem" : "3rem 1rem",
        }}
      >
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          padding: "0.35rem 0.85rem",
          background: COR.bgSoft,
          border: `1px solid ${COR.primary}55`,
          borderRadius: "999px", color: COR.primary,
          fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em",
          marginBottom: "1rem",
        }}>
          🤝 PARCEIROS DO DESAFIOGUT
        </div>
        <h1
          style={{
            margin: 0, fontWeight: 900, color: COR.text, lineHeight: 1.15,
            fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.01em",
          }}
          className="text-2xl md:text-4xl"
        >
          Seja Nosso Parceiro!
        </h1>
        <p style={{
          margin: "0.75rem auto 0", maxWidth: "680px",
          color: COR.muted, fontSize: isMobile ? "0.92rem" : "1.05rem", lineHeight: 1.55,
        }}>
          Anuncie no DesafioGUT e alcance milhares de usuários que disputam o
          menor lance único todos os dias. Quatro planos, exposição garantida,
          métricas em tempo real.
        </p>

        {/* MC12.3 — botão "Fazer login para se cadastrar" REMOVIDO.
            Porta corporativa é separada: o formulário abaixo dispara o
            login Privy email-OTP no submit, sem mistura com o login comum. */}
        {isConnected && tipoUsuario === "corporativo" && (
          <div style={{ marginTop: "1.5rem" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.6rem 1.2rem",
              background: "rgba(0,212,170,0.12)",
              border: "1px solid rgba(0,212,170,0.3)",
              borderRadius: "10px", color: COR.teal, fontWeight: 700,
            }}>
              ✅ Você já é parceiro!
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <Link
                to="/corporativo"
                style={{
                  color: COR.primary, fontWeight: 700,
                  textDecoration: "none", fontSize: "0.95rem",
                }}
              >
                Ir ao Painel Lojista →
              </Link>
            </div>
          </div>
        )}
      </motion.header>

      {/* ── MC12.3.1 — UI DE SUCESSO PÓS-CADASTRO ── */}
      {sucesso && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            ...card,
            marginBottom: isMobile ? "2rem" : "3rem",
            borderColor: "rgba(0,212,170,0.4)",
            background: "rgba(0,212,170,0.06)",
          }}
          aria-label="Cadastro realizado"
        >
          <h2 style={{
            margin: "0 0 0.5rem", color: COR.teal,
            fontSize: isMobile ? "1.05rem" : "1.25rem", fontWeight: 900,
          }}>
            ✅ Cadastro corporativo realizado!
          </h2>
          <p style={{ margin: "0 0 0.75rem", color: COR.text, fontSize: "0.9rem" }}>
            <strong>{sucesso.empresa}</strong> (CNPJ {sucesso.cnpj}) está
            registrado. Confirmamos os dados pelo email <strong>{sucesso.email}</strong>.
          </p>
          <p style={{ margin: "0 0 1rem", color: COR.muted, fontSize: "0.85rem" }}>
            Próximo passo: a coordenação entrará em contato em até 48h para
            ativar o seu Painel Lojista e definir o plano (Bronze / Prata / Ouro / Diamante).
          </p>
          <Link
            to="/"
            style={{
              display: "inline-block",
              padding: "0.6rem 1.25rem",
              background: `linear-gradient(135deg, ${COR.teal}, #00a888)`,
              borderRadius: "10px", color: "#0a0f1a",
              fontFamily: "'Orbitron', sans-serif", fontWeight: 800,
              fontSize: "0.85rem", textDecoration: "none",
            }}
          >
            🏠 Voltar ao início
          </Link>
        </motion.section>
      )}

      {/* ── FORMULÁRIO DE CADASTRO ── MC12.3: visível SEM login prévio. */}
      {!sucesso && tipoUsuario !== "corporativo" && (
        <motion.section
          id="form-corporativo"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ ...card, marginBottom: isMobile ? "2rem" : "3rem" }}
          aria-label="Cadastro de Parceiro"
        >
          <h2 style={{
            margin: "0 0 0.25rem", color: COR.primary,
            fontSize: isMobile ? "1.05rem" : "1.25rem", fontWeight: 900,
          }}>
            🏢 Cadastro Corporativo
          </h2>
          <p style={{ margin: "0 0 1.5rem", color: COR.muted, fontSize: "0.85rem" }}>
            Preencha os dados da sua empresa para se cadastrar como parceiro.
            A coordenação entrará em contato pelo email informado.
          </p>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>CNPJ *</label>
              <input
                type="text"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={e => setCnpj(mascaraCNPJ(e.target.value))}
                maxLength={18}
                required
                style={{
                  ...inputStyle,
                  borderColor: cnpj && !validarCNPJ(cnpj)
                    ? "rgba(255,61,113,0.5)" : "rgba(245,166,35,0.25)",
                }}
              />
              {cnpj && !validarCNPJ(cnpj) && (
                <span style={{ color: "#ff3d71", fontSize: "0.75rem" }}>CNPJ inválido</span>
              )}
              {cnpjJaExiste && (
                <span style={{ color: COR.primary, fontSize: "0.75rem" }}>
                  ⚠️ Este CNPJ já está cadastrado.
                </span>
              )}
            </div>
            <div>
              <label style={labelStyle}>Email da Empresa *</label>
              <input
                type="email"
                placeholder="contato@suaempresa.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                maxLength={120}
                required
                autoComplete="email"
                style={inputStyle}
              />
              <span style={{ color: COR.muted, fontSize: "0.72rem" }}>
                Usaremos esse email para confirmar o cadastro e o contato da coordenação.
              </span>
            </div>
            <div>
              <label style={labelStyle}>Nome da Empresa *</label>
              <input
                type="text"
                placeholder="Razão social ou nome fantasia"
                value={empresa}
                onChange={e => setEmpresa(e.target.value.slice(0, 100))}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Segmento *</label>
              <select
                value={segmento}
                onChange={e => setSegmento(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {SEGMENTOS.map(s => (
                  <option key={s} value={s} style={{ background: "#0a0f1a" }}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Site (opcional)</label>
              <input
                type="url"
                placeholder="https://suaempresa.com.br"
                value={site}
                onChange={e => setSite(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: site && !validarURL(site)
                    ? "rgba(255,61,113,0.5)" : "rgba(245,166,35,0.25)",
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>URL do Logo (opcional)</label>
              <input
                type="url"
                placeholder="https://suaempresa.com.br/logo.png"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: logoUrl && !validarURL(logoUrl)
                    ? "rgba(255,61,113,0.5)" : "rgba(245,166,35,0.25)",
                }}
              />
            </div>
            {erro && (
              <div style={{
                padding: "0.7rem 1rem", background: "rgba(255,61,113,0.12)",
                border: "1px solid rgba(255,61,113,0.3)", borderRadius: "8px",
                color: "#ff3d71", fontSize: "0.85rem",
              }}>
                ⚠️ {erro}
              </div>
            )}
            <motion.button
              type="submit"
              disabled={enviando}
              whileHover={enviando ? {} : { scale: 1.02 }}
              whileTap={enviando ? {} : { scale: 0.98 }}
              style={{
                padding: "0.85rem 1.5rem",
                background: enviando
                  ? "rgba(245,166,35,0.3)"
                  : `linear-gradient(135deg, ${COR.primary}, #e89400)`,
                border: "none", borderRadius: "10px",
                color: enviando ? COR.muted : "#0a0f1a",
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: 800, fontSize: "0.9rem",
                cursor: enviando ? "wait" : "pointer",
                opacity: enviando ? 0.7 : 1,
                marginTop: "0.5rem",
              }}
            >
              {enviando ? "⏳ Enviando cadastro…" : "⚡ Enviar cadastro corporativo"}
            </motion.button>
          </form>
        </motion.section>
      )}

      {/* ── PLANOS ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        style={{ marginBottom: isMobile ? "2rem" : "3rem" }}
        aria-label="Planos de parceria"
      >
        <h2 style={{
          textAlign: "center", margin: "0 0 1.5rem",
          color: COR.primary, fontSize: isMobile ? "1.05rem" : "1.25rem",
          fontWeight: 900, letterSpacing: "0.02em",
        }}>
          📦 Escolha o plano que combina com sua empresa
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)",
          gap: isMobile ? "0.75rem" : "1rem",
        }}>
          {PLANOS.map(p => (
            <div
              key={p.nome}
              style={{
                ...card,
                border: p.destaque
                  ? `2px solid ${p.cor}`
                  : "1px solid rgba(245,166,35,0.18)",
                position: "relative",
              }}
            >
              {p.destaque && (
                <span style={{
                  position: "absolute", top: "-10px", left: "50%",
                  transform: "translateX(-50%)",
                  background: p.cor, color: "#0a0f1a",
                  fontSize: "0.65rem", fontWeight: 800,
                  padding: "0.2rem 0.6rem", borderRadius: "999px",
                  letterSpacing: "0.06em", whiteSpace: "nowrap",
                }}>
                  MAIS POPULAR
                </span>
              )}
              <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", marginBottom: "0.5rem" }}>
                {p.icone}
              </div>
              <h3 style={{
                margin: "0 0 0.25rem", color: p.cor,
                fontSize: isMobile ? "0.95rem" : "1.05rem", fontWeight: 900,
              }}>
                {p.nome}
              </h3>
              <div style={{
                color: COR.primary, fontWeight: 800,
                fontSize: isMobile ? "1rem" : "1.15rem", marginBottom: "0.75rem",
              }}>
                R$ <strong>{p.valor.toLocaleString("pt-BR")}</strong>
                <span style={{ color: COR.muted, fontSize: "0.8rem" }}>/mês</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {p.beneficios.map(b => (
                  <li key={b} style={{
                    display: "flex", gap: "0.4rem", alignItems: "flex-start",
                    color: COR.muted, fontSize: "0.78rem", marginBottom: "0.3rem",
                  }}>
                    <span style={{ color: COR.success, flexShrink: 0 }}>✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── COMO FUNCIONA ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        style={{ marginBottom: isMobile ? "2rem" : "3rem" }}
        aria-label="Como funciona"
      >
        <h2 style={{
          textAlign: "center", margin: "0 0 1.5rem",
          color: COR.text, fontSize: isMobile ? "1.05rem" : "1.25rem",
          fontWeight: 900,
        }}>
          🛠️ Como funciona
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",
          gap: "1rem",
        }}>
          {PASSOS.map(p => (
            <div key={p.n} style={{ ...card, textAlign: "center" }}>
              <div style={{
                width: "2rem", height: "2rem",
                background: `${COR.primary}22`,
                border: `2px solid ${COR.primary}55`,
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 0.75rem",
                color: COR.primary, fontWeight: 900, fontSize: "0.85rem",
              }}>
                {p.n}
              </div>
              <span style={{ fontSize: "1.5rem" }}>{p.icone}</span>
              <h3 style={{
                margin: "0.5rem 0 0.25rem", color: COR.text,
                fontSize: "0.95rem", fontWeight: 800,
              }}>
                {" "}{p.titulo}
              </h3>
              <p style={{ margin: 0, color: COR.muted, fontSize: "0.82rem", lineHeight: 1.5 }}>
                {p.texto}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── CTA FINAL ── */}
      <section style={{ ...card, textAlign: "center", marginBottom: "2rem" }}>
        <h2 style={{
          margin: "0 0 0.5rem", color: COR.text,
          fontSize: isMobile ? "1.2rem" : "1.5rem", fontWeight: 900,
        }}>
          Pronto para começar?
        </h2>
        <p style={{ margin: "0 0 1.5rem", color: COR.muted, fontSize: "0.9rem" }}>
          Cadastre-se em segundos. O painel é ativado imediatamente após o cadastro.
        </p>
        {tipoUsuario !== "corporativo" ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const el = document.getElementById("form-corporativo");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="w-full md:w-auto"
            style={{
              padding: "0.85rem 2rem",
              background: `linear-gradient(135deg, ${COR.primary}, #e89400)`,
              border: "none", borderRadius: "12px",
              color: "#0a0f1a", fontFamily: "'Orbitron', sans-serif",
              fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.05em",
              cursor: "pointer", boxShadow: "0 8px 24px rgba(245,166,35,0.3)",
            }}
          >
            ⚡ Quero ser um parceiro
          </motion.button>
        ) : (
          <Link
            to="/corporativo"
            style={{
              display: "inline-block",
              padding: "0.85rem 2rem",
              background: `linear-gradient(135deg, ${COR.teal}, #00a888)`,
              borderRadius: "12px",
              color: "#0a0f1a", fontFamily: "'Orbitron', sans-serif",
              fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.05em",
              textDecoration: "none",
            }}
          >
            🏢 Ir ao Painel Lojista
          </Link>
        )}
      </section>

      {/* ── Rodapé ── */}
      <footer style={{
        textAlign: "center", padding: "1rem 0 2rem",
        color: COR.muted, fontSize: "0.75rem",
      }}>
        Grupo União e Trabalho · CNPJ 23.040.066/0001-00 · Manaus/AM, Brasil
      </footer>
    </div>
  );
}
