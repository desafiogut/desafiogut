// Gestão de Usuários — Tela 2 do plano do MC89.5. Esqueleto (Fase 0).
//
// É a tela mais cara do programa e a única sem fonte de dados: NÃO existe tabela
// de utilizadores no Supabase (achado A-1 do MC89.5). A identidade vive no Privy
// e o backend só conhece quem já transacionou.

import { EmConstrucao } from "./_ui.jsx";

export default function GestaoUsuarios() {
  return (
    <EmConstrucao
      titulo="Gestão de Usuários"
      fase="Fase 4 do plano do MC89.5 (MC90.4)"
      descricao="Lista, busca, filtros, bloqueio e perfil com histórico. Depende de uma projeção derivada em SQL (vw_utilizadores), porque não existe tabela de utilizadores para ler."
      decisoes={[
        "D1: a lista chama-se «utilizadores COM ATIVIDADE», nunca «todos». Quem se registou e nunca fez nada não aparece — e o rótulo tem de o dizer.",
        "D-SALDO: não há botão «resetar saldo». A ação é «Ajuste manual», exige justificativa e escreve um débito auditável — o modelo já é de livro-razão e sobrescrever apagaria história.",
        "O e-mail existe para 3 de 7 cotas (verificado na base). A busca por e-mail alcança essa minoria, e a tela tem de o explicar em vez de parecer partida.",
        "Saldo de senhas NÃO entra na lista: é on-chain e custaria uma chamada RPC por linha. Só no perfil, sob pedido.",
        "Histórico de lances: os lances programados são on-chain e não passam pelo backend. A tela mostra os relâmpago e declara a ausência dos outros.",
      ]}
    />
  );
}
