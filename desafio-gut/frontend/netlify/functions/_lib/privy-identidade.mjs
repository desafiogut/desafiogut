// _lib/privy-identidade.mjs — UTAC146 (Frente A, ℹ️5 do SEG4 do UTAC142). Verifica o IDENTITY TOKEN do Privy e devolve o
// nome Google da carteira — a única origem verificável do nome de exibição (o token lance-auth da app só prova a carteira,
// por assinatura EIP-191). Usado SÓ pelo auth-lance, que põe o nome verificado no claim `nome` do token lance-auth.
//
// Verificação (documentação do Privy, lida no UTAC146): JWT ES256; `iss` = "privy.io"; `aud` = app id; `exp`. Chaves públicas:
// JWKS do app em https://auth.privy.io/api/v1/apps/<app-id>/jwks.json (medido: 200, 2 chaves EC P-256 ES256).
// `linked_accounts` é uma STRING JSON. O nome só conta se a CARTEIRA do lance estiver entre as contas do mesmo token.
// FAIL-CLOSED: qualquer falha (assinatura, iss, aud, exp, formato, carteira) ⇒ null (= sem nome; nunca erro para o login).
//
// Requisito do operador (R18-146-A): «Return user data in an identity token» ligado no painel do Privy. Sem isso, o app
// não tem identity token e o resultado é lance sem nome.

import { createRemoteJWKSet, jwtVerify } from "jose";

/** App id público do Privy (está no bundle do site: VITE_PRIVY_APP_ID). O env manda; o valor fixo é o de produção. */
export const PRIVY_APP_ID_PADRAO = "cmo51f3v300l90clgzksivvad";
export const ISSUER_PRIVY = "privy.io";
const appIdEfetivo = () => process.env.PRIVY_APP_ID || process.env.VITE_PRIVY_APP_ID || PRIVY_APP_ID_PADRAO;

let _jwksRemoto = null;
function jwksRemoto(appId) {
  if (!_jwksRemoto || _jwksRemoto.appId !== appId) {
    _jwksRemoto = { appId, set: createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`)) };
  }
  return _jwksRemoto.set;
}

const norm = (e) => (typeof e === "string" ? e.toLowerCase() : null);

/**
 * @param {string} idToken  identity token do Privy (vindo do app)
 * @param {string} endereco a carteira já provada por assinatura EIP-191 no auth-lance
 * @param {{jwks?: Function, appId?: string}} [deps]  injectáveis para teste
 * @returns {Promise<{nome: string|null} | null>}  null = não verificado; {nome:null} = verificado sem nome Google
 */
export async function verificarIdentidadePrivy(idToken, endereco, { jwks, appId } = {}) {
  if (typeof idToken !== "string" || idToken.split(".").length !== 3 || !norm(endereco)) return null;
  const app = appId || appIdEfetivo();
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, jwks || jwksRemoto(app), {
      issuer: ISSUER_PRIVY, audience: app, algorithms: ["ES256"], requiredClaims: ["exp"],
    }));
  } catch { return null; }

  let contas;
  try { contas = typeof payload.linked_accounts === "string" ? JSON.parse(payload.linked_accounts) : payload.linked_accounts; }
  catch { return null; }
  if (!Array.isArray(contas)) return null;

  const carteiraConfere = contas.some((c) => c && c.type === "wallet" && norm(c.address) === norm(endereco));
  if (!carteiraConfere) return null;

  const google = contas.find((c) => c && c.type === "google_oauth");
  const nome = typeof google?.name === "string" && google.name.trim() ? google.name.trim() : null;
  return { nome };
}
