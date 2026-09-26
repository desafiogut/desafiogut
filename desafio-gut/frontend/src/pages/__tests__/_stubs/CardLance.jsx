// _stubs/CardLance.jsx — MC94.2. O real arrasta o SDK do Privy (useWallets), que
// em SSR estoura a heap (medido no MC94). O duplo expõe no markup as props que
// importam — a página tem de provar que licita na edição CERTA.
export default function CardLance({ idEdicao, modalidade, encerrado }) {
  return (
    <div data-stub="card-lance" data-id-edicao={idEdicao} data-tipo={modalidade} data-encerrado={String(encerrado)}>
      formulário de lance
    </div>
  );
}
