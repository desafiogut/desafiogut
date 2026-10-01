// UTAC105b — Cupons do Passe Desafio oferecidos pelo lojista.
// A plataforma define os valores (o servidor devolve-os em GET /cupons); o lojista só liga/desliga e guarda (PUT /cupons).
// Os valores NÃO são repetidos aqui: a fonte única é `_lib/cupom.mjs` (VALORES_CUPOM), via resposta do servidor.

import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { GlassCard } from "@/components/ui";
import { apiGet, apiPut } from "../lib/api.js";

/** Resposta do GET/PUT → lista [{ valorRs, ativo }] ou null se a forma não for a esperada. */
export function cuponsDaResposta(data) {
  const lista = data?.cupons;
  if (!Array.isArray(lista) || lista.length === 0) return null;
  if (!lista.every((c) => typeof c?.valorRs === "number" && typeof c?.ativo === "boolean")) return null;
  return lista.map((c) => ({ valorRs: c.valorRs, ativo: c.ativo }));
}

/** Corpo do PUT: todos os valores mostrados, com o estado escolhido. */
export function pedidoGuardar(clienteId, cupons) {
  return { cliente_id: clienteId, cupons: cupons.map((c) => ({ valorRs: c.valorRs, ativo: c.ativo })) };
}

const brl = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export default function CorporativoCupons() {
  const isMobile = useIsMobile();
  const { cotaCorporativa, authToken, obterAuthToken } = useAppContext();
  const clienteId = cotaCorporativa?.cliente_id ?? null;
  const [cupons, setCupons] = useState(null);       // null = ainda não lido
  const [validadeDias, setValidadeDias] = useState(null);
  const [erro, setErro] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    if (!clienteId || !authToken) return;
    let cancel = false;
    (async () => {
      const { ok, data } = await apiGet(`cupons?cliente_id=${encodeURIComponent(clienteId)}`, { token: authToken });
      if (cancel) return;
      const lista = ok ? cuponsDaResposta(data) : null;
      if (!lista) { setErro("Não foi possível carregar os cupons."); return; }
      setCupons(lista); setValidadeDias(data.validadeDias ?? null); setErro(null);
    })();
    return () => { cancel = true; };
  }, [clienteId, authToken]);

  const alternar = (valorRs) => {
    setMensagem(null);
    setCupons((atual) => atual.map((c) => (c.valorRs === valorRs ? { ...c, ativo: !c.ativo } : c)));
  };

  const guardar = async () => {
    setGuardando(true); setMensagem(null);
    try {
      const token = authToken || await obterAuthToken?.();
      const { ok, data } = await apiPut("cupons", pedidoGuardar(clienteId, cupons), { token });
      const lista = ok ? cuponsDaResposta(data) : null;
      if (!lista) { setMensagem("Não foi possível guardar. Tente novamente."); return; }
      setCupons(lista); setMensagem("Cupons guardados.");
    } finally { setGuardando(false); }
  };

  const cardCls = isMobile ? "p-4" : "p-5";

  return (
    <div style={{ padding: isMobile ? "1rem" : "1.25rem", flex: 1 }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#e8f0fe" }}>🎟️ Meus cupons</h1>
        <p style={{ margin: "0.35rem 0 0", color: "#6b7db8", fontSize: "0.85rem" }}>
          Escolha os cupons de desconto que oferece a quem compra o Passe Desafio.
          {validadeDias != null && ` Cada cupom vale ${validadeDias} dias.`}
        </p>
      </header>

      {!clienteId ? (
        <GlassCard className={`${cardCls} text-[#6b7db8]`} data-estado="sem-cota">Nenhuma cota corporativa encontrada.</GlassCard>
      ) : erro ? (
        <GlassCard className={`${cardCls} text-[#ef4444]`} data-estado="erro" role="alert">{erro}</GlassCard>
      ) : !cupons ? (
        <GlassCard className={`${cardCls} text-[#6b7db8]`} data-estado="carregando">Carregando cupons…</GlassCard>
      ) : (
        <GlassCard className={cardCls} data-estado="dados">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {cupons.map((c) => (
              <li key={c.valorRs} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e8f0fe" }}>{brl(c.valorRs)}</span>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: c.ativo ? "#10b981" : "#6b7db8", fontSize: "0.85rem", fontWeight: 700 }}>
                  <input type="checkbox" role="switch" checked={c.ativo} onChange={() => alternar(c.valorRs)}
                    aria-label={`Oferecer cupom de ${brl(c.valorRs)}`} />
                  {c.ativo ? "Ativo" : "Inativo"}
                </label>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button type="button" onClick={guardar} disabled={guardando}
              style={{ padding: "0.5rem 1.1rem", borderRadius: "0.6rem", border: "1px solid #00d4aa", background: "rgba(0,212,170,0.12)", color: "#00d4aa", fontWeight: 800, cursor: guardando ? "wait" : "pointer" }}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            {mensagem && <span role="status" style={{ color: "#6b7db8", fontSize: "0.8rem" }}>{mensagem}</span>}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
