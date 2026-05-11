// Lance — entidade de negócio
// Valor mínimo: R$ 0,01 (1 centavo). Regra: menor valor ÚNICO vence.

export const LANCE_MIN_CENTAVOS = 1;
export const LANCE_MAX_CENTAVOS = 999999;

/** Converte centavos para exibição BRL */
export function centavosToDisplay(centavos) {
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
}

/** Valida se um valor em centavos é um lance válido */
export function isValidLance(centavos) {
  const n = Number(centavos);
  return Number.isInteger(n) && n >= LANCE_MIN_CENTAVOS && n <= LANCE_MAX_CENTAVOS;
}
