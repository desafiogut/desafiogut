// MC11.1 — Seção pública "Seja Nosso Parceiro!".
// MC12 — formulário de cadastro corporativo funcional (CNPJ, empresa, etc.)
// MC12.3 — Login Corporativo Independente: form sem login prévio, porta separada.
// MC12.3.1 — Cadastro DIRETO sem email-OTP: POST register-corporativo no submit,
//            sem disparar modal Privy. cliente_id derivado do CNPJ no servidor.
// Rota: /seja-nosso-parceiro (pública — visível para qualquer usuário).

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLoginWithEmail } from "@privy-io/react-auth";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { getVisitorId } from "../lib/fingerprint.js";
import GutoAvatar from "../components/GutoAvatar.jsx";
import { Button } from "@/components/ui";

const COR = {
  text: "#e8f0fe", muted: "#6b7db8", primary: "#f5a623",
  bg: "rgba(255,255,255, var(--glass-opacity, 0.03))", bgSoft: "rgba(245,166,35,0.07)",
  teal: "#00d4aa", success: "#10b981",
};

// MC17.2.1 — Conteúdo comercial (PLANOS e PASSOS) REMOVIDO da página pública.
// A página passa a ser um GATE de lojista (Novo cadastro / Já tenho conta).
// Os planos e a contratação vivem apenas no Painel Lojista (/corporativo, MC17.1).

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
  const { isConnected, tipoUsuario, atualizarTipoCorporativo, address } = useAppContext();
  const navigate = useNavigate();
  // MC15.6 — login via One-Time Code (headless): envia o OTP direto ao email
  // do cadastro e mostra só o campo de código, sem o modal de email do Privy.
  const { sendCode, loginWithCode, state: otpState } = useLoginWithEmail();

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
  const [cnpjEndereco, setCnpjEndereco] = useState(null); // MC14.10.1 BUGFIX — endereco esperado pós-cnpj-ja-existe

  // MC15.6 — UI de One-Time Code pós-cadastro.
  const [otpAberto, setOtpAberto] = useState(false); // mostra o campo de código
  const [emailOtp,  setEmailOtp]  = useState("");    // email destino do OTP
  const [codigo,    setCodigo]    = useState("");    // 6 dígitos digitados
  const [otpErro,   setOtpErro]   = useState(null);
  // MC15.7 — guarda contra dupla chamada concorrente a sendCode/loginWithCode.
  // Um segundo sendCode invalida o OTP anterior ("expirado"); um segundo
  // loginWithCode (Enter + clique) falha porque o código já foi consumido.
  const otpBusyRef = useRef(false);

  // MC15.3 — abas "Novo Cadastro" / "Já Tenho Cadastro" + estado do login de lojista.
  const [aba, setAba] = useState(null); // MC17.2.1 — null = gate (só os 2 CTAs) | "novo" | "existente"
  const [cnpjLogin, setCnpjLogin] = useState("");
  const [empresaLogin, setEmpresaLogin] = useState("");
  const [erroLogin, setErroLogin] = useState(null);
  const [enviandoLogin, setEnviandoLogin] = useState(false);

  // MC14.10.1 BUGFIX — após login Privy disparado por CNPJ já existente,
  // verifica se o address bate com o endereco do cadastro e redireciona.
  useEffect(() => {
    if (cnpjJaExiste && isConnected && address && cnpjEndereco) {
      if (address.toLowerCase() === cnpjEndereco.toLowerCase()) {
        navigate("/corporativo", { replace: true });
      } else {
        setErro("CNPJ já registrado em outra conta. Faça login com a conta correta.");
        setCnpjJaExiste(false);
        setCnpjEndereco(null);
      }
    }
  }, [isConnected, address, cnpjJaExiste, cnpjEndereco, navigate]);

  // MC17 — redirect automático quando lojista fica corporate + conectado
  useEffect(() => {
    if (isConnected && tipoUsuario === "corporativo") {
      navigate("/corporativo", { replace: true });
    }
  }, [isConnected, tipoUsuario, navigate]);

  // MC15.7 — envia o OTP UMA única vez por disparo. A guarda otpBusyRef evita
  // que dois sendCode concorrentes invalidem o código (causa de "expirado").
  const enviarOtp = async (emailDestino) => {
    if (otpBusyRef.current) return;
    otpBusyRef.current = true;
    try {
      setEmailOtp(emailDestino);
      await sendCode({ email: emailDestino });
      setOtpAberto(true);
    } finally {
      otpBusyRef.current = false;
    }
  };

  // MC15.4 — Cadastro DIRETO sem etapa intermediária.
  // Fluxo: validar client → GET ?cnpj (duplicidade) → POST register-corporativo
  // → guarda email no sessionStorage → envia OTP (sendCode). O redirect p/
  // /corporativo é reativo (useEffect tipoUsuario).
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
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
        const { endereco, email: emailCadastrado, empresa: empresaCadastrada } = await checkRes.json();
        setCnpjJaExiste(true);
        setErro(null);
        if (isConnected) {
          // Já logado: verifica se address bate com o cadastro
          if (address && endereco && address.toLowerCase() === endereco.toLowerCase()) {
            navigate("/corporativo", { replace: true });
            return;
          }
          setErro("CNPJ já registrado em outra conta. Faça login com a conta correta.");
          setEnviando(false);
          return;
        }
        // MC15.4 — CNPJ já cadastrado: guarda o email e vai DIRETO ao login,
        // sem tela intermediária. O redirect p/ /corporativo é reativo (useEffect
        // tipoUsuario==="corporativo") assim que o AppContext resolve o perfil.
        const emailJaCad = emailCadastrado || email.trim().toLowerCase();
        try { sessionStorage.setItem("gut_corp_recem_cadastrado", emailJaCad); } catch {}
        // MC15.6 — envia o OTP direto ao email do cadastro e abre o campo de
        // código (sem modal de email). O redirect p/ /corporativo é reativo.
        await enviarOtp(emailJaCad);
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
      // MC15.4 — guarda o email do cadastro para o AppContext resolver o perfil
      // corporativo no login seguinte (mesmo que a identidade Privy use outro email).
      try { sessionStorage.setItem("gut_corp_recem_cadastrado", registro.email); } catch {}
      // Vai DIRETO ao painel, sem tela intermediária: se já autenticado, navega;
      // senão, abre o login. O redirect pós-login é reativo (useEffect
      // tipoUsuario==="corporativo").
      if (isConnected) {
        atualizarTipoCorporativo(registro);
        navigate("/corporativo", { replace: true });
      } else {
        // MC15.6 — envia o OTP direto ao email do cadastro e abre o campo de código.
        await enviarOtp(registro.email);
      }
    } catch (err) {
      setErro(err?.message || "Erro ao cadastrar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  // MC15.3 — login de lojista já cadastrado: verifica CNPJ + Nome da Empresa,
  // guarda o email no sessionStorage e reutiliza o fluxo OTP existente (enviarOtp).
  const handleLoginExistente = async (e) => {
    e.preventDefault();
    setErroLogin(null);
    if (!validarCNPJ(cnpjLogin)) { setErroLogin("CNPJ inválido. Verifique os dígitos."); return; }
    if (empresaLogin.trim().length < 3) { setErroLogin("Informe o nome da empresa (mín. 3 caracteres)."); return; }
    setEnviandoLogin(true);
    try {
      const cnpjNums = cnpjLogin.replace(/\D/g, "");
      const res = await fetch(`/.netlify/functions/cotas?acao=verificar-login&cnpj=${cnpjNums}&empresa=${encodeURIComponent(empresaLogin.trim())}`);
      if (!res.ok) {
        setErroLogin("CNPJ ou Nome da Empresa não encontrados. Verifique os dados.");
        return;
      }
      const data = await res.json();
      if (!data?.email) {
        setErroLogin("Cadastro encontrado, mas sem email associado. Contacte a coordenação.");
        return;
      }
      try { sessionStorage.setItem("gut_corp_recem_cadastrado", data.email); } catch {}
      await enviarOtp(data.email); // REUTILIZA o fluxo OTP — abre o card de código
    } catch {
      setErroLogin("Erro ao verificar. Tente novamente.");
    } finally {
      setEnviandoLogin(false);
    }
  };

  // MC15.6 — confirma o One-Time Code. Em sucesso, o Privy autentica e cria a
  // carteira (createOnLogin); o AppContext resolve o perfil corporativo e o
  // useEffect (isConnected && tipoUsuario==="corporativo") redireciona ao painel.
  const confirmarCodigo = async () => {
    // MC15.7 — evita dupla submissão (Enter + clique): a 2ª chamada falharia
    // porque o código já teria sido consumido, aparecendo como "expirado".
    if (otpBusyRef.current) return;
    setOtpErro(null);
    const code = codigo.replace(/\D/g, "").trim();
    if (code.length < 6) { setOtpErro("Digite os 6 dígitos do código."); return; }
    otpBusyRef.current = true;
    try {
      await loginWithCode({ code });
      // sucesso: o useEffect (isConnected && corporativo) redireciona ao painel.
    } catch (e) {
      const msg = `${e?.message || ""} ${e?.code || ""}`.toLowerCase();
      if (/expir/.test(msg)) {
        setOtpErro('O código expirou. Toque em "Reenviar código" para receber um novo.');
      } else if (/attempt|too many|max/.test(msg)) {
        setOtpErro('Muitas tentativas. Toque em "Reenviar código" para receber um novo.');
      } else {
        setOtpErro("Código incorreto. Confira os 6 dígitos e tente novamente.");
      }
    } finally {
      otpBusyRef.current = false;
    }
  };

  const reenviarCodigo = async () => {
    setOtpErro(null);
    setCodigo("");
    try { await enviarOtp(emailOtp); }
    catch { setOtpErro("Não foi possível reenviar o código. Tente novamente."); }
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
          textAlign: "center",
          marginBottom: isMobile ? "0.75rem" : "1rem",
        }}>
          <GutoAvatar custom="parceiro-hero-orgulhoso" size={isMobile ? 70 : 100} animate />
        </div>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.35rem 0.85rem",
            background: COR.bgSoft,
            border: `1px solid ${COR.primary}55`,
            borderRadius: "999px", color: COR.primary,
            fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em",
            marginBottom: "1rem",
          }}
        >
          🤝 PARCEIROS DO DESAFIOGUT
        </div>
        <h1
          style={{
            margin: "0.5rem 0 0.25rem", fontWeight: 900, color: COR.text, lineHeight: 1.15,
            fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.01em",
          }}
          className="text-2xl md:text-4xl"
        >
          Seja Nosso Parceiro!
        </h1>
        <p style={{
          margin: "0 auto", maxWidth: "680px",
          color: COR.muted, fontSize: isMobile ? "0.92rem" : "1.05rem", lineHeight: 1.55,
        }}>
          Faça parte do DESAFIOGUT como lojista. Crie a sua conta ou entre para
          aceder ao Painel Lojista, onde gere as suas cotas e campanhas.
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

      {/* MC15.6 — UI de One-Time Code: só o campo de código (sem campo de email).
          O OTP já foi enviado por sendCode no submit. */}
      {otpAberto && tipoUsuario !== "corporativo" && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            ...card,
            marginBottom: isMobile ? "2rem" : "3rem",
            borderColor: "rgba(0,212,170,0.4)",
            background: "rgba(0,212,170,0.06)",
            maxWidth: "460px",
          }}
          aria-label="Confirmação por código"
        >
          <h2 style={{
            margin: "0 0 0.5rem", color: COR.teal,
            fontSize: isMobile ? "1.05rem" : "1.25rem", fontWeight: 900,
          }}>
            📩 Digite o código de acesso
          </h2>
          <p style={{ margin: "0 0 1rem", color: COR.muted, fontSize: "0.88rem" }}>
            Enviámos um código de 6 dígitos para <strong style={{ color: COR.text }}>{emailOtp}</strong>.
            Digite-o abaixo para entrar no Painel do Lojista.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => { if (e.key === "Enter") confirmarCodigo(); }}
            placeholder="••••••"
            aria-label="Código de 6 dígitos"
            style={{
              ...inputStyle,
              letterSpacing: "0.5em", textAlign: "center",
              fontSize: "1.3rem", fontWeight: 800,
            }}
          />
          {otpErro && (
            <p role="alert" style={{ margin: "0.6rem 0 0", color: COR.primary, fontSize: "0.82rem" }}>
              ⚠️ {otpErro}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <Button variant="primary" size="md" onClick={confirmarCodigo}
              disabled={otpState.status === "submitting-code" || codigo.length < 6}
              className="!bg-gradient-to-br !from-[#00d4aa] !to-[#00a888] hover:!from-[#00e4ba] hover:!to-[#00b898] !shadow-none font-['Orbitron']">
              {otpState.status === "submitting-code" ? "Verificando…" : "Confirmar código"}
            </Button>
            <Button variant="ghost" size="md" onClick={reenviarCodigo}
              disabled={otpState.status === "sending-code"}
              className="!border-[#6b7db8]/33 !text-[#6b7db8]">
              {otpState.status === "sending-code" ? "Enviando…" : "Reenviar código"}
            </Button>
          </div>
        </motion.section>
      )}

      {/* ── MC15.3 — ABAS: Novo Cadastro / Já Tenho Cadastro ── */}
      {!otpAberto && tipoUsuario !== "corporativo" && (
        <div
          role="tablist"
          aria-label="Modo de acesso corporativo"
          style={{
            display: "flex",
            gap: "0.5rem",
            maxWidth: "640px",
            margin: "0 auto",
            marginBottom: "1rem",
          }}
        >
          {[
            { id: "novo", rotulo: "Novo cadastro" },
            { id: "existente", rotulo: "Já tenho conta" },
          ].map((t) => {
            const ativo = aba === t.id;
            return (
              <Button
                key={t.id}
                variant={ativo ? "primary" : "ghost"}
                size="md"
                role="tab"
                aria-selected={ativo}
                onClick={() => setAba(t.id)}
                className={ativo ? "flex-1 font-['Orbitron'] tracking-[0.02em]" : "flex-1 !border-[#f5a623]/30 !text-[#6b7db8] font-['Orbitron'] tracking-[0.02em]"}
              >
                {t.rotulo}
              </Button>
            );
          })}
        </div>
      )}

      {/* ── FORMULÁRIO DE CADASTRO ── MC12.3: visível SEM login prévio. */}
      {!otpAberto && tipoUsuario !== "corporativo" && aba === "novo" && (
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
            <Button type="submit" variant="primary" size="lg" disabled={enviando}
              className="w-full mt-2 font-['Orbitron']">
              {enviando ? "⏳ Enviando cadastro…" : "⚡ Enviar cadastro corporativo"}
            </Button>
          </form>
        </motion.section>
      )}

      {/* ── MC15.3 — JÁ TENHO CADASTRO: login de lojista via CNPJ + Nome da Empresa ── */}
      {!otpAberto && tipoUsuario !== "corporativo" && aba === "existente" && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ ...card, marginBottom: isMobile ? "2rem" : "3rem" }}
          aria-label="Login de Parceiro"
        >
          <h2 style={{
            margin: "0 0 0.25rem", color: COR.primary,
            fontSize: isMobile ? "1.05rem" : "1.25rem", fontWeight: 900,
          }}>
            🔑 Já Tenho Cadastro
          </h2>
          <p style={{ margin: "0 0 1.5rem", color: COR.muted, fontSize: "0.85rem" }}>
            Acesse o seu Painel Lojista com CNPJ e Nome da Empresa.
          </p>
          <form onSubmit={handleLoginExistente} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>CNPJ *</label>
              <input
                type="text"
                placeholder="00.000.000/0000-00"
                value={cnpjLogin}
                onChange={e => setCnpjLogin(mascaraCNPJ(e.target.value))}
                maxLength={18}
                required
                style={{
                  ...inputStyle,
                  borderColor: cnpjLogin && !validarCNPJ(cnpjLogin)
                    ? "rgba(255,61,113,0.5)" : "rgba(245,166,35,0.25)",
                }}
              />
              {cnpjLogin && !validarCNPJ(cnpjLogin) && (
                <span style={{ color: "#ff3d71", fontSize: "0.75rem" }}>CNPJ inválido</span>
              )}
            </div>
            <div>
              <label style={labelStyle}>Nome da Empresa *</label>
              <input
                type="text"
                placeholder="Razão social ou nome fantasia"
                value={empresaLogin}
                onChange={e => setEmpresaLogin(e.target.value.slice(0, 100))}
                required
                style={inputStyle}
              />
            </div>
            {erroLogin && (
              <div style={{
                padding: "0.7rem 1rem", background: "rgba(255,61,113,0.12)",
                border: "1px solid rgba(255,61,113,0.3)", borderRadius: "8px",
                color: "#ff3d71", fontSize: "0.85rem",
              }}>
                ⚠️ {erroLogin}
              </div>
            )}
            <Button type="submit" variant="primary" size="lg" disabled={enviandoLogin}
              className="w-full mt-2 font-['Orbitron']">
              {enviandoLogin ? "⏳ Verificando…" : "Entrar no Meu Painel"}
            </Button>
          </form>
        </motion.section>
      )}

      {/* MC17.2.1 — Secções PLANOS, "Como funciona" e CTA comercial REMOVIDAS.
          A página pública é um GATE de lojista (Novo cadastro / Já tenho conta).
          Os planos e a contratação ficam exclusivos do Painel Lojista (MC17.1). */}

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
