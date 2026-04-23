/**
 * saldoInterno.js — Sistema de Saldo Interno Beta (DESAFIOGUT)
 *
 * Carteiras:
 *  • carteira_flash     → saldo decimal em reais (R$), fonte: depósito PIX
 *  • fichas_programadas → inteiro (unidades), fonte: conversão de flash
 *
 * Substitui chamadas on-chain Sepolia na fase Beta.
 * Persistência: localStorage (client-side, sem backend).
 */

const KEY_FLASH  = 'gut_carteira_flash';
const KEY_FICHAS = 'gut_fichas_programadas';

export const CUSTO_FICHA_BRL = 2.00; // R$ 2,00 = 1 ficha

// ── Leitura ───────────────────────────────────────────────────────────────────

export function getCarteiraFlash() {
  return parseFloat(localStorage.getItem(KEY_FLASH) ?? '0');
}

export function getFichasProgramadas() {
  return parseInt(localStorage.getItem(KEY_FICHAS) ?? '0', 10);
}

// ── Escrita interna ───────────────────────────────────────────────────────────

function _setFlash(valor) {
  localStorage.setItem(KEY_FLASH, Math.max(0, valor).toFixed(2));
}

function _setFichas(qtd) {
  localStorage.setItem(KEY_FICHAS, String(Math.max(0, Math.floor(qtd))));
}

// ── Operações públicas ────────────────────────────────────────────────────────

/**
 * Simula um depósito via PIX, creditando R$ na carteira_flash.
 * @param {number} valor — padrão R$ 10,00
 * @returns {number} novo saldo flash
 */
export function simularDepositoPix(valor = 10.00) {
  const novo = getCarteiraFlash() + valor;
  _setFlash(novo);
  return novo;
}

/**
 * Converte saldo flash em fichas programadas.
 * Taxa: R$ 2,00 por ficha.
 * @param {number} quantidade — fichas a converter (padrão 1)
 * @returns {{ saldoFlash: number, fichas: number }}
 * @throws se saldo insuficiente
 */
export function converterEmFichas(quantidade = 1) {
  const custo  = quantidade * CUSTO_FICHA_BRL;
  const saldo  = getCarteiraFlash();

  if (saldo < custo) {
    throw new Error(
      `Saldo insuficiente. Necessário R$ ${custo.toFixed(2)}, disponível R$ ${saldo.toFixed(2)}.`
    );
  }

  const novoFlash  = saldo - custo;
  const novasFichas = getFichasProgramadas() + quantidade;
  _setFlash(novoFlash);
  _setFichas(novasFichas);
  return { saldoFlash: novoFlash, fichas: novasFichas };
}

/**
 * Consome 1 ficha programada para um lance de leilão programado.
 * @returns {number} fichas restantes após o consumo
 * @throws se não houver fichas disponíveis
 */
export function gastarFicha() {
  const fichas = getFichasProgramadas();
  if (fichas <= 0) {
    throw new Error(
      'Sem fichas disponíveis. Converta saldo flash em fichas (R$ 2,00 / ficha).'
    );
  }
  _setFichas(fichas - 1);
  return fichas - 1;
}
