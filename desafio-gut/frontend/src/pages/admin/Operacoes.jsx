// Operações e Infraestrutura — Tela 4 do plano do MC89.5. Esqueleto (Fase 0).
//
// É a tela com maior risco de execução: é a primeira que MUTA o estado do
// sistema. Por isso a Fase 2 (auditoria + níveis) vem antes dela.

import { EmConstrucao } from "./_ui.jsx";

export default function Operacoes() {
  return (
    <EmConstrucao
      titulo="Operações e Infraestrutura"
      fase="Fase 3 do plano do MC89.5 (MC90.3)"
      descricao="Estado das dependências, fila de tarefas e comandos operacionais. Cada comando com confirmação, justificativa obrigatória e registo de auditoria antes de executar."
      decisoes={[
        "Dos 5 comandos pedidos, 2 já existem (kill switch, executar monitor), 1 é possível (processar fila), 1 é no-op enquanto o Redis não estiver configurado (limpar cache) e 1 é IMPOSSÍVEL a partir do backend (reindexar RAG — o índice é construído fora do repo pelo operador).",
        "«Reiniciar o monitor» não corresponde a nada: não há processo para reiniciar, há uma execução para disparar. O rótulo será «Executar agora».",
        "Sonda de Netlify Blobs é NOVA e é a mais valiosa: hoje nada a verifica, e metade do substrato admin vive lá com falha silenciosa.",
        "O indicador do monitor compara BLOCOS (último processado vs. atual), não o booleano `atrasado` — que é um verde falso quando os Blobs estão cegos.",
      ]}
    />
  );
}
