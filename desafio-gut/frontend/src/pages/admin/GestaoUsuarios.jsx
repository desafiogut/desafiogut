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
import EstadoVazio from "../../components/admin/EstadoVazio.jsx";
import EnderecoTruncado from "../../components/admin/EnderecoTruncado.jsx";

function quando(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

// MC89.43 — "há 2 h" lê-se mais depressa do que uma data quando a pergunta é
// "isto ainda está vivo?". Abaixo de um dia mostra-se o tempo decorrido; acima,
// a data, que é o que interessa quando já vai longe.
function haQuantoTempo(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const min = Math.floor(ms / 60000);
  if (min < 1)  return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30)   return `há ${d} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ⚠️ `acesso` fica em cinzento-ardósia de propósito. As outras três fontes são
// FINANCEIRAS e têm cor viva; presença não é dinheiro e não deve competir com
// elas. (E o roxo #a78bfa não entra aqui: nesta app é a cor semântica de
// "senhas".)
const COR_FONTE = { cota: "#00d4ff", saldo_rs: "#10b981", credito: "#f5a623", acesso: "#94a3b8" };

export default function GestaoUsuarios() {
  const { chamarAdmin } = useAdminAuth();
  const isMobile = useIsMobile();

  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [q, setQ] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  // 0 = todos; 7 = só quem acedeu nos últimos 7 dias.
  const [ativosDias, setAtivosDias] = useState(0);

  const carregar = useCallback(async (reset = true) => {
    if (!chamarAdmin) return;
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      params.set("limite", "20");
      if (q.trim()) params.set("q", q.trim());
      if (ativosDias > 0) params.set("ativos", String(ativosDias));
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
  }, [chamarAdmin, q, cursor, ativosDias]);

  useEffect(() => { carregar(true); }, [chamarAdmin]);
  // Trocar de filtro recarrega do início — o cursor da lista anterior não serve.
  useEffect(() => { setCursor(null); carregar(true);   }, [ativosDias]);

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

      {/* Filtro de presença (MC89.43) */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {[{ v: 0, t: "Todos" }, { v: 7, t: "Ativos (7 dias)" }, { v: 30, t: "Ativos (30 dias)" }].map((o) => (
          <Button key={o.v} variant="ghost" size="sm" onClick={() => setAtivosDias(o.v)}
            aria-pressed={ativosDias === o.v}
            className={ativosDias === o.v
              ? "!border-[#f5a623]/55 !bg-[#f5a623]/[0.12] !text-[#f5a623] rounded-full"
              : "rounded-full !border-white/15 !text-[#94a3b8]"}>
            {o.t}
          </Button>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: "0.7rem", color: COR.muted }}>
        Mostrando {usuarios.length} de {ouTraco(total)} utilizadores.
        {/* ATENÇÃO: esta ressalva mudou no MC89.43 e continua a ser precisa
            dizer. Antes, quem não transacionava era invisível. Agora aparece —
            mas só a partir do momento em que a app passou a marcar presença.
            Sem esta frase, o admin lê "—" como "nunca entrou", que é diferente
            de "não sabemos".
            (Sem emoji aqui: o painel tem guarda de zero-emoji, e o stripper de
            comentários do teste não reconhece linhas iniciadas por "{/*".) */}
        <span style={{ display: "block", marginTop: "0.1rem" }}>
          A presença passou a ser registada no MC89.43: quem não voltou a entrar
          desde então aparece com “—” em Último acesso. Isso quer dizer sem dados,
          não inatividade.
        </span>
      </p>

      {/* Tabela */}
      {usuarios.length === 0 && !carregando ? (
        q.trim() ? (
          <EstadoVazio
            titulo="Nenhum resultado"
            descricao={`Nada corresponde a "${q.trim()}". A busca cobre endereço, e-mail e nome.`}
            acao={{ texto: "Limpar busca", onClick: () => { setQ(""); setCursor(null); carregar(true); } }}
          />
        ) : (
          <EstadoVazio
            titulo={ativosDias > 0 ? "Ninguém acedeu neste período" : "Nenhum utilizador"}
            descricao={ativosDias > 0
              ? `Nenhum acesso registado nos últimos ${ativosDias} dias. Veja “Todos” para a lista completa.`
              : "Ainda não há utilizadores registados nem atividade."}
            acao={ativosDias > 0 ? { texto: "Ver todos", onClick: () => setAtivosDias(0) } : undefined}
          />
        )
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
                <th style={th}>Endereço</th>
                {!isMobile && <th style={th}>Nome</th>}
                <th style={th}>Último acesso</th>
                {!isMobile && <th style={th}>Atividade</th>}
                <th style={th}>Fontes</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.cliente_id} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <td style={td}>
                    <Link to={`/admin/usuarios/${u.cliente_id}`} style={{ color: COR.primary, textDecoration: "none" }}>
                      <EnderecoTruncado endereco={u.cliente_id} copiavel={false} />
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
                  <td style={{ ...td, color: u.ultimo_acesso ? COR.text : COR.muted }}
                      title={u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleString("pt-BR") : "Sem registo de acesso"}>
                    {haQuantoTempo(u.ultimo_acesso) || "—"}
                  </td>
                  {!isMobile && <td style={{ ...td, color: COR.muted }}>{quando(u.ultima_atividade)}</td>}
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
