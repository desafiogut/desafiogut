// UTAC111 — o vencedor paga o produto físico por PIX, no valor do seu lance (14 pontos = R$ 0,14).
//
// `pagar()` → POST /iniciar-pagamento { tipo:"produto", produtoId } com o Bearer user-session (o valor
// sai do pedido no SERVIDOR, nunca daqui). Depois sonda POST /confirmar-pagamento { token } a cada 3 s
// até à expiração real do PIX (`validUntil`, 24 h). Clicar de novo devolve o MESMO código pendente
// (o servidor reaproveita-o — decisão do operador). — o webhook do Mercado Pago nunca disparou em produção (MC101), logo a confirmação por consulta é o
// caminho que funciona hoje (decisão do operador, UTAC111). 402 = ainda não pago → continua a sondar.
import { useCallback, useEffect, useRef, useState } from "react";
import { apiPost } from "../lib/api.js";

export const INTERVALO_SONDAGEM_MS = 3000;

export function usePagarProduto({ produtoId, authToken, aoPagar, intervaloMs = INTERVALO_SONDAGEM_MS } = {}) {
  const [estado, setEstado] = useState("inicial"); // inicial | gerando | aguardando | pago | erro
  const [pix, setPix] = useState(null);
  const [erro, setErro] = useState(null);
  const emCurso = useRef(false);
  const aoPagarRef = useRef(aoPagar);
  aoPagarRef.current = aoPagar;

  const pagar = useCallback(async () => {
    if (emCurso.current) return;
    if (!authToken) { setErro("Entre na sua conta para pagar."); setEstado("erro"); return; }
    emCurso.current = true;
    setEstado("gerando"); setErro(null);
    const r = await apiPost("iniciar-pagamento", { tipo: "produto", produtoId }, { token: authToken }).catch(() => null);
    emCurso.current = false;
    if (!r?.ok || !r.data?.token || !r.data?.qrCodeText) {
      setErro(r?.data?.error?.message || "Não foi possível gerar o PIX agora. Tente de novo.");
      setEstado("erro");
      return;
    }
    setPix(r.data);
    setEstado("aguardando");
  }, [authToken, produtoId]);

  useEffect(() => {
    if (estado !== "aguardando" || !pix?.token) return undefined;
    let vivo = true;
    let t;
    const tick = async () => {
      // UTAC111 — a sondagem segue a expiração REAL do PIX (24 h no MP, `validUntil`), não os 15 min de antes.
      if (Date.parse(pix.validUntil) < Date.now()) {
        setErro("O código PIX expirou. Gere um novo.");
        setEstado("erro");
        return;
      }
      const r = await apiPost("confirmar-pagamento", { token: pix.token }).catch(() => null);
      if (!vivo) return;
      if (r?.ok) {
        setEstado("pago");
        aoPagarRef.current?.();
        return;
      }
      if (r && r.status !== 402 && r.status !== 429 && r.status !== 502) {
        setErro(r.status === 401 ? "O código PIX expirou. Gere um novo." : (r.data?.error?.message || "Não foi possível confirmar o pagamento."));
        setEstado("erro");
        return;
      }
      t = setTimeout(tick, intervaloMs);
    };
    t = setTimeout(tick, intervaloMs);
    return () => { vivo = false; clearTimeout(t); };
  }, [estado, pix, intervaloMs]);

  return { estado, pix, erro, pagar };
}
