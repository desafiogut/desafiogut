#!/usr/bin/env bash
# scripts/run-fork-onchain.sh — MC93-E.
#
# ⚠️ LEIA ISTO ANTES DE CONFIAR NO NOME DO FICHEIRO.
# O enunciado pediu um script que fizesse FORK DE MAINNET via `ALCHEMY_URL`.
# Isso NÃO é o que este script faz, e a razão foi medida no SEG-1:
#
#   1. `ALCHEMY_URL` é uma CREDENCIAL. A R5 diz "nunca toca credenciais".
#      (E há uma chave Alchemy commitada em desafio-gut/hardhat.config.cjs
#       desde o MC89.14 — reportada ao operador; não é usada aqui.)
#   2. Sem credencial não há fork. Medido, os três RPC públicos recusam:
#        eth.llamarpc.com   -> 525
#        cloudflare-eth.com -> rate limit
#        rpc.ankr.com/eth   -> 401 "must authenticate with an API key"
#
# O que ISTO faz: levanta uma EVM em-processo (chainId 31337), deploya o
# bytecode compilado a partir de contracts/Leilao.sol, e corre o cenário
# `adicionarSenhas` -> `darLance` -> saldo decrementado, com controlo negativo
# E controlo positivo.
#
# O QUE CONTINUA POR MEDIR, e está em L-4: isto exerce a LÓGICA do contrato, não
# o BYTECODE realmente deployado em 0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd.
# A deriva entre a fonte e o deployado só um fork a apanharia. O que se cobre
# dessa lacuna são os SELECTORES do ABI que o backend usa.
#
# HARD GATE 5: nada aqui toca a mainnet. Chaves descartáveis, contrato deployado
# no momento, nenhuma transacção assinada contra rede real.
#
# Usar:  bash desafio-gut/scripts/run-fork-onchain.sh
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FUNCOES="$RAIZ/frontend/netlify/functions"

# O EDR vem com o hardhat, que vive nas dependências de desafio-gut/, não nas das
# functions. Sem ele o cenário SALTA — e um salto silencioso foi o defeito que
# este MC veio corrigir, por isso aqui é erro.
if [ ! -d "$RAIZ/node_modules/@nomicfoundation/edr" ]; then
  echo "ERRO: @nomicfoundation/edr não está instalado." >&2
  echo "  Corre:  cd '$RAIZ' && npm ci" >&2
  echo "  (não é impossível — é só uma instalação em falta)" >&2
  exit 1
fi

cd "$FUNCOES"
exec node --test --experimental-test-module-mocks "_tests/mc93e-fork-onchain.test.mjs"
