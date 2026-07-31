// Gestão de Usuários — Tela 2 do plano do MC89.5.
//
// MC89.14 (Fase 4). Lista de utilizadores com atividade, busca, filtros
// e ações por linha (perfil, bloqueio, ajuste).
//
// (!)️ RÓTULO HONESTO (D1 do MC89.5): esta lista mostra "utilizadores COM
// ATIVIDADE" — quem já apareceu nos nossos dados. A identidade vive no
// Privy e quem se registou sem transacionar NÃO está aqui.

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { Button, Input } from "../../components/ui";
import { COR, ouTraco } from "./_ui.jsx";

function truncarEndereco(addr) {
  if (!addr || addr.length < 12) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function quando(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const COR_FONTE = { cota: "#00d4ff", saldo_rs: "#10b981", credito: "#f5a623" };

export default function GestaoUsuarios() {
  const { chamarAdmin } = useAdminAuth();
  const isMobile = useIsMobile();

  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [q, setQ] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async (reset = true) => {
    if (!chamarAdmin) return;
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      params.set("limite", "20");
      if (q.trim()) params.set("q", q.trim());
      if (!reset && cursor) params.set("antes", cursor);

      const resp = await chamarAdmin(`/.netlify/functions/admin-users?${params}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);

      if (reset) {
        setUsuarios(data.usuarios || []);
      } else {
        setUsuarios((prev) => [...prev, ...(data.usuarios || [])]);
      }
      setTotal(data.total ?? null);
      setCursor(data.proximoCursor || null);
    } catch (err) {
      setErro(err?.message || "falha");
    } finally {
      setCarregando(false);
    }
  }, [chamarAdmin, q, cursor]);

  useEffect(() => { carregar(true); }, [chamarAdmin]);

  function buscar(e) {
    e.preventDefault();
    setCursor(null);
    carregar(true);
  }

  if (!chamarAdmin) {
    return <p style={{ color: COR.muted, fontSize: "0.85rem" }}>Autentique-se para ver os utilizadores.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {/* Barra de busca */}
      <form onSubmit={buscar} style={{ display: "flex", gap: "0.4rem" }}>
        <Input
          type="text"
          placeholder="Buscar por endereço, e-mail ou nome…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="primary" size="sm" disabled={carregando}>
          {carregando ? "…" : "Buscar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => { setQ(""); setCursor(null); carregar(true); }}
          className="!border-white/15 !text-[#94a3b8]">
          Limpar
        </Button>
      </form>

      {erro && <p role="alert" style={{ color: COR.danger, fontSize: "0.78rem" }}>{erro}</p>}

      <p style={{ margin: 0, fontSize: "0.7rem", color: COR.muted }}>
        Mostrando {usuarios.length} de {ouTraco(total)} utilizadores com atividade.
        <span style={{ display: "block", marginTop: "0.1rem" }}>A identidade vive no Privy — quem se registou sem transacionar não aparece aqui.</span>
      </p>

      {/* Tabela */}
      {usuarios.length === 0 && !carregando ? (
        <p style={{ color: COR.muted, fontSize: "0.82rem", fontStyle: "italic" }}>Nenhum utilizador encontrado.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
                <th style={th}>Endereço</th>
                {!isMobile && <th style={th}>Nome</th>}
                <th style={th}>Atividade</th>
                <th style={th}>Fontes</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.cliente_id} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <td style={td}>
                    <Link to={`/admin/usuarios/${u.cliente_id}`} style={{ color: COR.primary, textDecoration: "none", fontFamily: "'JetBrains Mono', monospace" }}>
                      {truncarEndereco(u.cliente_id)}
                    </Link>
                  </td>
                  {!isMobile && (
                    <td style={td}>
                      <span style={{ color: u.nome ? COR.text : COR.muted }}>
                        {u.nome || "—"}
                      </span>
                      {u.email && <span style={{ display: "block", fontSize: "0.64rem", color: COR.muted }}>{u.email}</span>}
                    </td>
                  )}
                  <td style={{ ...td, color: COR.muted }}>{quando(u.ultima_atividade)}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap" }}>
                      {(u.fontes || []).map((f) => (
                        <span key={f} style={{
                          fontSize: "0.58rem", padding: "0.1rem 0.35rem", borderRadius: "999px",
                          background: `${COR_FONTE[f] || COR.muted}1a`, color: COR_FONTE[f] || COR.muted,
                          border: `1px solid ${COR_FONTE[f] || COR.muted}44`,
                          textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700,
                        }}>{f}</span>
                      ))}
                    </div>
                  </td>
                  <td style={td}>
                    <Link to={`/admin/usuarios/${u.cliente_id}`}
                      style={{ fontSize: "0.68rem", color: COR.primary, textDecoration: "none" }}>
                      Perfil →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
        {cursor && (
          <Button variant="ghost" size="sm" onClick={() => carregar(false)} disabled={carregando}
            className="!border-white/15 !text-[#94a3b8]">
            {carregando ? "…" : "Mais →"}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => { setCursor(null); carregar(true); }} disabled={carregando}
          className="!border-white/15 !text-[#94a3b8]">
          ↻ Recarregar
        </Button>
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: "0.35rem 0.4rem", color: COR.muted, fontWeight: 600, whiteSpace: "nowrap" };
const td = { padding: "0.4rem 0.4rem", verticalAlign: "top" };
