// POST /.netlify/functions/comprar-passe-relampago — UTAC110d. Passe Relâmpago (Regulamento 5.0, Art. 13º):
// R$ 2,00 → 10 pontos de fidelidade + 1 CRÉDITO de lance directo (R18-110d-2). NÃO credita pontos de lance.
// Header: Authorization: Bearer ***   ·   Body: { idempotencyKey } (ou header `x-idempotency-key`)
// Contrato completo em `_lib/comprar-passe-tipado.mjs`.
import { respostaPreflight } from "./_lib/cors.mjs";
import { comprarPasseTipado } from "./_lib/comprar-passe-tipado.mjs";

export default async (req) => respostaPreflight(req) ?? comprarPasseTipado(req, "relampago");
