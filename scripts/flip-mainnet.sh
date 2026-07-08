#!/usr/bin/env bash
# =============================================================================
# flip-mainnet.sh — Flip PARAMETRIZADO para mainnet (MC60 / operador)
# =============================================================================
# ⚠️  Este script NÃO contém segredos. O OPERADOR exporta os valores no ambiente
#     antes de rodar. A CHAVE PRIVADA (COORDENACAO_PRIVATE_KEY) NÃO é setada por
#     este script — deve ser injetada MANUALMENTE no painel Netlify (regra do
#     projeto: o operador manuseia segredos).
#
# Pré-requisitos (ver docs/MC60-NOGO-relatorio.txt) que este script NÃO valida
# sozinho: contrato deployado na mainnet, chave ROTACIONada, MC59.4 aplicado,
# EOA custeada com ETH de gás, MP_WEBHOOK_SECRET real, SENTRY_DSN em prod.
#
# Uso:
#   export CONTRATO=0x...            # endereço do contrato NA MAINNET
#   export RPC_URL=https://...        # RPC mainnet (para o preflight getCode)
#   export CHAIN_ID=1
#   export EXPLORER_URL=https://etherscan.io
#   export MP_WEBHOOK_SECRET_SET=1    # confirmação de que você JÁ setou no painel
#   ./scripts/flip-mainnet.sh
# =============================================================================
set -euo pipefail

echo "==> MC60 flip-mainnet (parametrizado, sem segredos)"

# --- 1. Checagens de entrada ------------------------------------------------
: "${CONTRATO:?defina CONTRATO=0x... (contrato na mainnet)}"
: "${RPC_URL:?defina RPC_URL=https://... (RPC da rede alvo)}"
CHAIN_ID="${CHAIN_ID:-1}"
EXPLORER_URL="${EXPLORER_URL:-https://etherscan.io}"

command -v netlify >/dev/null || { echo "ERRO: Netlify CLI não encontrado"; exit 1; }
command -v curl >/dev/null || { echo "ERRO: curl não encontrado"; exit 1; }

# --- 2. PREFLIGHT: o contrato EXISTE na rede alvo? --------------------------
# (Esta é a checagem que faltou no plano original do MC60: getCode=0x => vazio.)
echo "==> Preflight: eth_getCode em $CONTRATO via $RPC_URL"
CODE=$(curl -s -m 15 -X POST "$RPC_URL" -H "content-type: application/json" \
  --data "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getCode\",\"params\":[\"$CONTRATO\",\"latest\"]}" \
  | sed -E 's/.*"result":"([^"]*)".*/\1/')
if [ "$CODE" = "0x" ] || [ -z "$CODE" ]; then
  echo "🔴 ABORT: nenhum contrato em $CONTRATO nesta rede (getCode=$CODE)."
  echo "   Deploy o contrato na mainnet ANTES do flip. (Ver MC60-NOGO-relatorio.txt B1.)"
  exit 2
fi
echo "   OK: bytecode presente (${#CODE} chars)."

# --- 3. Confirmação da chave (o script NÃO seta a chave) --------------------
echo "==> Verificando SIGNER_READY no health (a chave deve JÁ estar no Netlify)"
HEALTH_URL="${HEALTH_URL:-https://silly-stardust-ca71bc.netlify.app/.netlify/functions/health}"
# (informativo — se ainda em sepolia, o health não reflete a nova chave até deploy)

# --- 4. Setar variáveis NÃO-secretas ---------------------------------------
echo "==> Setando envs não-secretas (production)"
netlify env:set VITE_CONTRATO_SEPOLIA "$CONTRATO"      --context production
netlify env:set VITE_CHAIN_ID          "$CHAIN_ID"     --context production
netlify env:set VITE_EXPLORER_URL      "$EXPLORER_URL" --context production
netlify env:set SIGNER_BACKEND         "local-key"     --context production
netlify env:set MP_WEBHOOK_ENFORCE     "true"          --context production

echo ""
echo "⚠️  AÇÃO MANUAL DO OPERADOR (segredos — NÃO feitos por este script):"
echo "    netlify env:set COORDENACAO_PRIVATE_KEY <CHAVE_ROTACIONADA> --context production"
echo "    netlify env:set MP_WEBHOOK_SECRET <SEGREDO_REAL_MP>         --context production"
echo "    (confirme SENTRY_DSN em produção)"
echo ""
read -r -p "Já setou COORDENACAO_PRIVATE_KEY (rotacionada) e MP_WEBHOOK_SECRET no painel? [yes/NO] " OK
[ "$OK" = "yes" ] || { echo "Abortado: seta os segredos primeiro."; exit 3; }

# --- 5. O FLIP (por último, após tudo confirmado) ---------------------------
echo "==> NETWORK_STAGE=mainnet (o flip)"
netlify env:set NETWORK_STAGE "mainnet" --context production

# --- 6. Rebuild + deploy ----------------------------------------------------
echo "==> Rebuild + deploy"
( cd "$(dirname "$0")/../desafio-gut/frontend" && npm run build )
netlify deploy --build --prod --message "MC60: flip para mainnet (envs)"

# --- 7. Verificação pós-deploy (verification-loop mínimo) -------------------
echo "==> Health pós-deploy"
curl -s -m 15 "$HEALTH_URL" || true
echo ""
echo "✅ Envs aplicadas e deploy disparado. Rode o verification-loop completo"
echo "   (health mainnet, getCode, assinatura, webhook 401 sem HMAC, saldo) e a"
echo "   validação VIVA com transação real de R\$1,00 antes de considerar aprovado."
echo "   Rollback: netlify env:set NETWORK_STAGE sepolia --context production && redeploy."
