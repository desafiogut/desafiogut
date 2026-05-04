// GET /.netlify/functions/saldo-rs?endereco=0x...
// Resposta 200: { endereco, saldoCentavos, saldoBRL }
// Resposta 400: { error: { code, message } }
//
// Read-only. Não autentica — saldo é por endereço e o blob só pode ser mutado
// pelas functions (PIX confirmado, comprar-senhas, lance-relampago).

import {
  jsonResponse, jsonError, validarEndereco, ValidationError,
} from "./_lib/validate.mjs";
import { lerSaldoRsCentavos } from "./_lib/saldoRs.mjs";

export default async (req) => {
  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }
  const url = new URL(req.url);
  const enderecoBruto = url.searchParams.get("endereco");
  if (!enderecoBruto) {
    return jsonError(400, "endereco_obrigatorio", "use ?endereco=0x...");
  }
  let endereco;
  try { endereco = validarEndereco(enderecoBruto); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  const centavos = await lerSaldoRsCentavos(endereco);
  return jsonResponse({
    endereco,
    saldoCentavos: centavos,
    saldoBRL: Number((centavos / 100).toFixed(2)),
  });
};
