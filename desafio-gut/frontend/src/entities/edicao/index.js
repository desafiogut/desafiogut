// Edicao — entidade de negócio (rodada de leilão)
// Identificador canônico: "R-1". Gerenciada on-chain pelo contrato LeilaoGUT.

export const EDICAO_ATIVA_ID = 'R-1';

export const EdicaoStatus = {
  ATIVA:     'ativa',
  ENCERRADA: 'encerrada',
  PENDENTE:  'pendente',
};

/** Retorna true se a edição está dentro do prazo */
export function isEdicaoAberta(prazoTimestamp) {
  return prazoTimestamp > Math.floor(Date.now() / 1000);
}
