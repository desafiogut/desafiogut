// Gestão Financeira — Tela 3 do plano do MC89.5. Esqueleto (Fase 0).
//
// Ao contrário da Tela 2, esta já tem a fonte pronta: `saldo_rs_creditos` e
// `saldo_rs_debitos` são o livro-razão, com saldoAntes/saldoDepois e `fonte` no
// payload. Não é preciso criar tabela nenhuma.

import { EmConstrucao } from "./_ui.jsx";

export default function GestaoFinanceira() {
  return (
    <EmConstrucao
      titulo="Gestão Financeira"
      fase="Fase 5 do plano do MC89.5 (MC90.5)"
      descricao="Resumo, lista de transações com filtros, exportação CSV e reembolso interno. Lê o livro-razão que já existe — sem tabela nova."
      decisoes={[
        "D11: NÃO haverá botão de «abastecer EOA». Isso é mover ETH na mainnet atrás de um gate desenhado para aprovar cotas. A tela mostra o saldo, o limiar e o alerta; abastecer é operação manual do operador.",
        "«Reembolso» é só o ajuste INTERNO (um débito com justificativa). O estorno no Mercado Pago fica fora do âmbito, e a tela di-lo.",
        "«Gás gasto» não tem fonte agregada sem indexador on-chain. Em vez de o inventar, mostra-se a variação do saldo da EOA no período.",
        "A coluna «fonte» fica visível: é ela que mostra que, até hoje, 18 de 18 créditos vieram de confirmar-pagamento e nenhum do webhook.",
      ]}
    />
  );
}
