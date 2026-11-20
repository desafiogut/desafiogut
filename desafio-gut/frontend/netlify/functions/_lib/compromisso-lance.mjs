// _lib/compromisso-lance.mjs — UTAC140 (achado ⚠️1 do validador SEG4; decisão do operador: «pôr sal já»).
//
// O compromisso on-chain de cada lance era keccak256(abi.encode(valor, endereço)) — SEM sal. Com valores de 1 a
// 999 999, quem lê os eventos `LanceComprometido` (públicos, com o endereço inteiro) recuperava o valor de cada
// lance por força bruta em segundos (medido pelo validador: 417 ms). O «valor secreto» não se aguentava.
//
// Agora: keccak256(abi.encode(uint256 valor, address endereço, bytes32 sal)), com um sal ALEATÓRIO de 32 bytes por
// lance, guardado só no Key-Per-Bid (privado). Sem o sal, o espaço a procurar passa de 10^6 para 2^256.
// O contrato não muda (guarda um bytes32 qualquer) e nada no backend verifica o hash (medido: grep `hashLance`).
// Para verificação pública depois da apuração, publicam-se valor + sal (trabalho futuro, declarado).

import { keccak256, AbiCoder } from "ethers";
import { randomBytes } from "node:crypto";

/** Sal de 32 bytes, hex com 0x (bytes32). */
export function novoSal() {
  return `0x${randomBytes(32).toString("hex")}`;
}

/** keccak256(abi.encode(uint256, address, bytes32)) — o empacotamento da EVM (verificável num contrato). */
export function hashCompromisso(valorCentavos, endereco, sal) {
  return keccak256(AbiCoder.defaultAbiCoder().encode(["uint256", "address", "bytes32"], [valorCentavos, endereco, sal]));
}
