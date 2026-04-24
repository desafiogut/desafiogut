/**
 * Regras de negócio para validação pré-transação.
 * Separado da UI — nenhuma dependência de React aqui.
 *
 * Art. 23: lance mínimo R$ 0,01 (1 centavo)
 * Art. 20: leilão programado exige 1 ficha por lance
 */
export function validarLance({
  valorEmCentavos,
  address,
  isConnected,
  encerrado,
  tipoLeilao,
  fichasProgramadas,
  isSepoliaOk,
}) {
  if (!isConnected || !address) {
    return { valido: false, motivo: "Conecte sua carteira para dar um lance." };
  }
  if (encerrado) {
    return { valido: false, motivo: "Este leilão já foi encerrado." };
  }
  // null significa ainda verificando; false é falha confirmada
  if (isSepoliaOk === false) {
    return { valido: false, motivo: "Rede Sepolia indisponível. Aguarde a reconexão automática." };
  }
  const valor = Number(valorEmCentavos);
  if (!Number.isInteger(valor) || valor < 1) {
    return { valido: false, motivo: "Lance mínimo: R$ 0,01 (1 centavo) — Art. 23." };
  }
  if (valor > 999_999) {
    return { valido: false, motivo: "Lance máximo permitido: R$ 9.999,99." };
  }
  if (tipoLeilao === "programado" && fichasProgramadas < 1) {
    return {
      valido: false,
      motivo: "Fichas insuficientes. Converta saldo flash em fichas para participar (Art. 20: R$ 2,00/ficha).",
    };
  }
  return { valido: true, motivo: null };
}
