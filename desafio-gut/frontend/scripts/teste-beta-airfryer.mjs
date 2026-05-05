#!/usr/bin/env node
// scripts/teste-beta-airfryer.mjs
// Smoke-test completo para o leilão relâmpago Airfryer Mondial.
//
// Uso:
//   cd desafio-gut/frontend && node scripts/teste-beta-airfryer.mjs
//
// Verifica:
//   1. /health          — funções respondendo, envs configuradas
//   2. /lances-flash    — blob lances-relampago acessível
//   3. /saldo-rs        — blob saldo-rs acessível (endereço de teste)
//   4. Saldo ETH coord  — coordenação tem gas para adicionarSenhas

import { JsonRpcProvider, Wallet } from "ethers";

const BASE = "https://silly-stardust-ca71bc.netlify.app/.netlify/functions";
const ALCHEMY = "https://eth-sepolia.g.alchemy.com/v2/qU_kw3WpEY4gttS0Cfr2B";
const EDICAO  = "R-1";
// Endereço público de teste (sem fundos reais)
const ADDR_TESTE = "0x0000000000000000000000000000000000000001";

const OK  = (msg) => console.log(`  ✅ ${msg}`);
const ERR = (msg) => { console.error(`  ❌ ${msg}`); process.exitCode = 1; };
const INF = (msg) => console.log(`  ℹ️  ${msg}`);

async function checkHealth() {
  console.log("\n── 1. /health ──────────────────────────────────────");
  try {
    const r = await fetch(`${BASE}/health`);
    const d = await r.json();
    if (!r.ok) { ERR(`HTTP ${r.status}`); return; }
    OK(`HTTP ${r.status} · service: ${d.service}`);
    OK(`Node ${d.node}`);
    for (const [k, v] of Object.entries(d.env ?? {})) {
      if (v && v !== "missing" && v !== "not_set" && v !== "unset") {
        const display = (k === "PIX_PROVIDER") ? v : "configurado";
        OK(`env ${k}: ${display}`);
      } else {
        ERR(`env ${k}: AUSENTE`);
      }
    }
  } catch (e) {
    ERR(`fetch falhou: ${e.message}`);
  }
}

async function checkLancesFlash() {
  console.log("\n── 2. /lances-flash ─────────────────────────────────");
  try {
    const r = await fetch(`${BASE}/lances-flash?edicaoId=${EDICAO}`);
    const d = await r.json();
    if (!r.ok) { ERR(`HTTP ${r.status}`); return; }
    OK(`HTTP ${r.status} · edicaoId: ${d.edicaoId}`);
    INF(`Lances na edição ${EDICAO}: ${d.lances?.length ?? 0}`);
    if (d.lances?.length) {
      for (const l of d.lances.slice(0, 3)) {
        INF(`  · ${l.endereco?.slice(0,10)}… R$ ${(l.valor / 100).toFixed(2)} ${l.repetido ? "❌" : "✅"}`);
      }
    }
  } catch (e) {
    ERR(`fetch falhou: ${e.message}`);
  }
}

async function checkSaldoRs() {
  console.log("\n── 3. /saldo-rs ─────────────────────────────────────");
  try {
    const r = await fetch(`${BASE}/saldo-rs?endereco=${ADDR_TESTE}`);
    const d = await r.json();
    if (!r.ok) { ERR(`HTTP ${r.status} · ${d?.error?.message}`); return; }
    OK(`HTTP ${r.status} · saldo: R$ ${d.saldoBRL?.toFixed(2) ?? "0.00"}`);
  } catch (e) {
    ERR(`fetch falhou: ${e.message}`);
  }
}

async function checkEthBalance() {
  console.log("\n── 4. Saldo ETH coordenação (Sepolia) ───────────────");
  try {
    const provider = new JsonRpcProvider(ALCHEMY);
    // Deriva endereço a partir da PRIVATE_KEY do .env (leitura via env ou hardcode do endereço conhecido)
    // Endereço da coordenação derivado da PRIVATE_KEY do projeto:
    const COORD_ADDRESS = "0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E";
    const balanceWei = await provider.getBalance(COORD_ADDRESS);
    const eth = Number(balanceWei) / 1e18;
    OK(`Coordenação: ${COORD_ADDRESS}`);
    if (eth >= 0.01) {
      OK(`Saldo: ${eth.toFixed(4)} ETH — suficiente para adicionarSenhas`);
    } else if (eth > 0) {
      INF(`⚠️  Saldo: ${eth.toFixed(6)} ETH — baixo! Considere abastecer via faucet`);
    } else {
      ERR(`Saldo ZERO — adicionarSenhas vai reverter por falta de gas`);
    }
  } catch (e) {
    ERR(`RPC falhou: ${e.message}`);
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  🍟  Smoke-test Beta — Airfryer Mondial Grand 5L");
  console.log(`  Produção: ${BASE}`);
  console.log("═══════════════════════════════════════════════════");

  await checkHealth();
  await checkLancesFlash();
  await checkSaldoRs();
  await checkEthBalance();

  console.log("\n═══════════════════════════════════════════════════");
  if (process.exitCode === 1) {
    console.log("  RESULTADO: ❌ FALHA — corrigir antes do beta");
  } else {
    console.log("  RESULTADO: ✅ PASS — sistema pronto para beta");
  }
  console.log("═══════════════════════════════════════════════════\n");
}

main();
