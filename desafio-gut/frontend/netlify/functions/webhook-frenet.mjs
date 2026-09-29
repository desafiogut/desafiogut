// POST /.netlify/functions/webhook-frenet — MC102.1b (Frente B)
// Recebe a «Atualização de Tracking» da Frenet e grava os eventos no pedido (só data + código: DEC-102.1b-5).
//
// Formato (docs.frenet.com.br/docs/webhook-atualização-de-tracking, lido a 2026-09-29):
//   { OrderId, ShipmentId, TrackingUrl, TrackingNumber, ServiceDescrition,
//     TrackingEvents: [{ EventDateTime: "10/02/2017 16:48", EventDescription, EventLocation, EventType: "9" }] }
// A Frenet exige 2XX em ≤ 10 s (3XX conta como falha). Só vai o último evento em cada chamada.
//
// Autenticação: header `x-frenet-token` (o TOKEN_NAME configurado no painel da Frenet) igual a
// `process.env.FRENET_WEBHOOK_TOKEN` (o TOKEN_VALUE). FAIL-CLOSED: sem a variável → 503, nada se grava.
// NÃO é o FRENET_TOKEN da API: é um segredo só deste webhook, escolhido pelo operador.
//
// Casamento: pelo `TrackingNumber` (DEC-102.1b-10), não pelo OrderId — o nosso lojista escreve o código à mão.
// Idempotência (HARD GATE 14): `registrarEventosRastreio` ignora data+código já gravados; o reenvio dá 200.
// Todo o escritor do pedido passa por `atualizarPedido` (MC102.0) — este também (via `registrarEventosRastreio`).

import { timingSafeEqual } from "node:crypto";
import { jsonResponse, jsonError, parseJsonBody } from "./_lib/validate.mjs";
import { mapearEventosFrenet } from "./_lib/rastreio-frenet.mjs";
import { encontrarPedidoPorRastreio, registrarEventosRastreio } from "./_lib/pedidos.mjs";

export const HEADER_TOKEN = "x-frenet-token";

function tokenValido(recebido, esperado) {
  const a = Buffer.from(String(recebido ?? ""));
  const b = Buffer.from(String(esperado));
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async (req) => {
  if (req.method !== "POST") return jsonError(405, "metodo_nao_permitido", "use POST");

  const esperado = process.env.FRENET_WEBHOOK_TOKEN;
  if (!esperado) return jsonError(503, "webhook_nao_configurado", "FRENET_WEBHOOK_TOKEN em falta");
  if (!tokenValido(req.headers.get(HEADER_TOKEN), esperado)) return jsonError(401, "nao_autorizado", "token do webhook inválido");

  let corpo;
  try { corpo = await parseJsonBody(req); } catch { return jsonError(400, "body_invalido", "JSON inválido"); }
  const codigo = String(corpo?.TrackingNumber ?? "").trim();
  if (!codigo) return jsonError(400, "tracking_ausente", "TrackingNumber em falta");

  // Um código que não é de nenhum pedido nosso responde 200: a Frenet não deve reenviar para sempre.
  const pedido = await encontrarPedidoPorRastreio(codigo);
  if (!pedido) return jsonResponse({ ok: true, ignorado: "pedido_nao_encontrado" });

  const eventos = mapearEventosFrenet(corpo?.TrackingEvents);
  if (eventos.length === 0) return jsonResponse({ ok: true, ignorado: "sem_eventos_mapeados" });

  const r = await registrarEventosRastreio(pedido.produtoId, codigo, eventos);
  if (r.ok) return jsonResponse({ ok: true, duplicado: Boolean(r.idempotent) });
  if (r.code === "rastreio_diferente" || r.code === "pedido_nao_encontrado") return jsonResponse({ ok: true, ignorado: r.code });
  // conflito_escrita / etag_indisponivel / store_indisponivel: 503 para a Frenet voltar a tentar.
  return jsonError(503, r.code, "não foi possível gravar agora");
};
