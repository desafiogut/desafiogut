// POST /.netlify/functions/comprar-passe-programado — UTAC110d. Passe Programado (Regulamento 5.0, Art. 25º):
// R$ 2,00 → 10 pontos de fidelidade + direito a palpite (a linha em `public.pontos` habilita o
// `registar-palpite`). Não mexe no ledger de lance.
// Header: Authorization: Bearer ***   ·   Body: { idempotencyKey } (ou header `x-idempotency-key`)
// Contrato completo em `_lib/comprar-passe-tipado.mjs`.
import { respostaPreflight } from "./_lib/cors.mjs";
import { comprarPasseTipado } from "./_lib/comprar-passe-tipado.mjs";

export default async (req) => respostaPreflight(req) ?? comprarPasseTipado(req, "programado");
