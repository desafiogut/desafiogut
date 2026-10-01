// UTAC000.8 (DEBT-007) — resultado OFICIAL da edição.
//
// PORQUE EXISTE: o 🏆 «Menor e Único» das `MeusAtivos` não pode ser apurado no browser.
// Em produção (mainnet) o VALOR do lance nunca vai em claro para a cadeia — vai o
// `keccak256` (evento `LanceComprometido`) — e a lista pública vem blindada até à
// consolidação. O único resultado honesto é, por isso, o que a coordenação publicou
// on-chain via `consolidarResultado` (mapping `resultados`, Leilao.sol), que é também
// o que decide o vencedor. Este hook lê-o.
//
// A LEITURA NÃO É CÓDIGO NOVO: reutiliza `lerResultadoOnchain` de
// `components/edicao-especial/useResultadoEspecial.js` (o painel da edição especial já
// o usa em produção, com provider read-only — sem sessão nem carteira).
//
// Devolve `null` — e não um objecto «vazio» — enquanto não houver resultado utilizável
// (edição por consolidar, sem lance único, ou valor ilegível). Quem consome este hook
// NUNCA inventa um vencedor: sem resultado, a página fica exactamente como estava.
// Fail-soft: se a leitura falhar, mantém-se `null`.
//
// ⚠️ O RESULTADO É GUARDADO COM A EDIÇÃO A QUE PERTENCE (2.ª ronda, achado do validador
// adversarial). A 1.ª versão guardava só o resultado: ao mudar de edição (ou ao passar a
// edição activa a vazio, ou quando a leitura da edição nova falha fica pendente), a página
// continuava a mostrar o vencedor da edição ANTERIOR — um vencedor de outra edição na
// edição nova é exactamente a mentira que este UTAC existe para acabar. Agora o valor
// devolvido só é servido se corresponder à edição pedida; qualquer outra situação devolve
// `null` (sem vencedor), que é o honesto.

import { useEffect, useState } from "react";
import { lerResultadoOnchain } from "../components/edicao-especial/useResultadoEspecial.js";
import { ENDERECO_ZERO } from "../components/edicao-especial/_estilo-especial.js";

/** Até haver consolidação, relê de minuto a minuto (quem está a olhar vê o vencedor aparecer). */
export const INTERVALO_MS = 60_000;

const ENDERECO_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Normaliza a leitura crua num resultado oficial, ou `null`.
 *
 * Função PURA (testável sem React nem rede). Regras de honestidade, todas explícitas:
 *   • sem `consolidado: true` → `null` (o leilão ainda não tem vencedor publicado);
 *   • sem `menorUnicoCentavos` inteiro → `null` (não se formata um valor inventado);
 *   • vencedor que não é um endereço de 20 bytes → `null`;
 *   • vencedor = endereço nulo → `null` (é o que `resultados()` devolve quando NÃO
 *     houve lance único — a edição fecha sem vencedor).
 * O endereço sai sempre em minúsculas (a caixa EIP-55 não serve para comparar).
 *
 * @param {{consolidado?:boolean, vencedor?:unknown, menorUnicoCentavos?:unknown}|null} r
 * @returns {{consolidado:true, vencedor:string, menorUnicoCentavos:number}|null}
 */
export function normalizarResultadoOficial(r) {
  if (!r || r.consolidado !== true) return null;
  if (!Number.isInteger(r.menorUnicoCentavos)) return null;
  const vencedor = String(r.vencedor ?? "").toLowerCase();
  if (!ENDERECO_RE.test(vencedor)) return null;
  if (vencedor === ENDERECO_ZERO) return null;
  return { consolidado: true, vencedor, menorUnicoCentavos: r.menorUnicoCentavos };
}

/**
 * Resultado oficial da edição (ou `null`).
 *
 * @param {string} edicaoId
 * @param {{lerResultado?: (id:string)=>Promise<object>, intervaloMs?: number}} [deps]
 *        injectáveis nos testes
 * @returns {{consolidado:true, vencedor:string, menorUnicoCentavos:number}|null}
 */
export function useResultadoOficial(edicaoId, { lerResultado = lerResultadoOnchain, intervaloMs = INTERVALO_MS } = {}) {
  // `edicaoId` acompanha o resultado de propósito: sem isso, um vencedor de OUTRA edição
  // sobrevive a uma mudança de edição (achado medido do validador adversarial).
  const [estado, setEstado] = useState({ edicaoId: null, resultado: null });

  useEffect(() => {
    if (!edicaoId) return undefined; // sem edição não se lê (e o valor devolvido será null)
    let cancelado = false;
    let intervalo = null;

    const ler = async () => {
      try {
        const r = normalizarResultadoOficial(await lerResultado(edicaoId));
        if (cancelado) return;
        setEstado({ edicaoId, resultado: r });
        // Consolidado: o resultado não muda mais — pára de reler.
        if (r && intervalo) { clearInterval(intervalo); intervalo = null; }
      } catch {
        // fail-soft: sem resultado oficial, nada muda — e o da edição anterior
        // (se havia) NÃO é servido, porque pertence a outra edição.
      }
    };
    ler();
    intervalo = setInterval(ler, intervaloMs);

    return () => { cancelado = true; if (intervalo) clearInterval(intervalo); };
  }, [edicaoId, lerResultado, intervaloMs]);

  // Só se serve o resultado que pertence à edição PEDIDA.
  return estado.edicaoId === edicaoId ? estado.resultado : null;
}
