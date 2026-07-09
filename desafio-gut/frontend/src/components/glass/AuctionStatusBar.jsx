// MC66 — AuctionStatusBar extraída de MercadoLances.jsx (Secção 3 do Glass).
// Disclaimer legal (rodapé fino) + status conectado / encerrado.
import { COR } from "./glassTokens.js";

export default function AuctionStatusBar({ isMobile, isConnected, address, encerrado }) {
  return (
    <div className={`text-[#94a3b8] leading-relaxed ${isMobile ? 'text-xs px-3 py-3' : 'text-sm px-8 py-3'}`}>
      <strong>DesafioGUT</strong>{" — "}Grupo União e Trabalho · CNPJ 23.040.066/0001-00
      {!isMobile && " · www.grupouniaoetrabalho.com.br"}
      {isConnected && (
        <span style={{
          display: isMobile ? "block" : "inline",
          marginLeft: isMobile ? 0 : "1rem",
          marginTop: isMobile ? "0.25rem" : 0,
          color: "#86efac",
        }}>✅ {address?.slice(0, 6)}...{address?.slice(-4)}</span>
      )}
      {encerrado && (
        <span style={{
          display: isMobile ? "block" : "inline",
          marginLeft: isMobile ? 0 : "1rem",
          marginTop: isMobile ? "0.25rem" : 0,
          color: COR.danger, fontWeight: "700",
        }}>🔴 Leilão encerrado — novos lances bloqueados</span>
      )}
    </div>
  );
}
