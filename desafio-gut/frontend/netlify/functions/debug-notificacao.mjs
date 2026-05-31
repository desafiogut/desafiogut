// GET /.netlify/functions/debug-notificacao — MC15.7.1 DEBUG (NÃO é produção)
//
// Injeta uma notificação de teste no Blob notificacoes:{endereco} para validar
// visualmente (badge + cards + marcar-lidas) sem depender do fluxo de lance.
//
// Query: endereco (obrigatório), tipo (default "lance_unico"),
//        edicaoId (default "R-1"), valor (centavos? aqui em REAIS p/ o teste → *100).
//
// Segurança: só funciona se NODE_ENV !== "production" OU header
// x-debug-key === DEBUG_KEY. Evita exposição acidental em produção.
//
// NÃO altera nenhum ficheiro de produção — apenas reutiliza adicionarNotificacao.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { adicionarNotificacao } from "./_lib/notificacoes-usuario.mjs";

const DEBUG_KEY = "mc1571debug";
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function mensagemPara(tipo, valorCentavos, edicaoId) {
  const brl = "R$ " + (valorCentavos / 100).toFixed(2).replace(".", ",");
  switch (tipo) {
    case "lance_unico":
      return `Boa! 🎯 O teu lance de ${brl} é o menor único na edição ${edicaoId}. Estás a ganhar — se ninguém repetir, vences!`;
    case "perdeu_exclusividade":
      return `⚠️ O teu lance de ${brl} na edição ${edicaoId} deixou de ser único. Dá um novo lance para voltares à frente!`;
    case "voce_venceu":
      return `🏁🎉 A edição ${edicaoId} terminou e GANHASTE! O teu lance de ${brl} foi o menor único. Parabéns!`;
    case "edicao_encerrada":
      return `🏁 A edição ${edicaoId} terminou. O lance vencedor foi ${brl}. Não foi desta — tenta na próxima! 🚀`;
    default:
      return `Notificação de teste (${tipo}) — ${brl} — edição ${edicaoId}.`;
  }
}

export default async (req) => {
  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }

  // Gate de segurança: dev OU header x-debug-key correto.
  const ehProd = String(process.env.NODE_ENV).toLowerCase() === "production";
  const debugKey = req.headers.get("x-debug-key") || "";
  if (ehProd && debugKey !== DEBUG_KEY) {
    return jsonError(403, "debug_desativado", "endpoint de debug requer x-debug-key");
  }

  const url = new URL(req.url);
  const endereco = String(url.searchParams.get("endereco") || "").toLowerCase();
  if (!ADDRESS_RE.test(endereco)) {
    return jsonError(400, "endereco_invalido", "query 'endereco' deve ser 0x + 40 hex");
  }

  const tipo = url.searchParams.get("tipo") || "lance_unico";
  const edicaoId = url.searchParams.get("edicaoId") || "R-1";
  const valorReais = Number(url.searchParams.get("valor") ?? 10);
  const valorCentavos = Number.isFinite(valorReais) ? Math.round(valorReais * 100) : 1000;

  const notif = {
    tipo,
    edicaoId,
    valor: valorCentavos,
    mensagem: mensagemPara(tipo, valorCentavos, edicaoId),
  };

  const ok = await adicionarNotificacao(endereco, notif);
  return jsonResponse({ ok, endereco, notificacao: notif });
};
