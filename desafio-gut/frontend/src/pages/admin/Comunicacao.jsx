// Comunicação e Notificações — Tela 6 do plano do MC89.5. Esqueleto (Fase 0).
//
// Metade já existe: notificações pessoais em Blob, lidas pelo frontend. Falta a
// emissão pelo admin, a difusão, o agendamento e os canais externos.

import { EmConstrucao } from "./_ui.jsx";

export default function Comunicacao() {
  return (
    <EmConstrucao
      titulo="Comunicação e Notificações"
      fase="Fase 6 do plano do MC89.5 (MC90.6)"
      descricao="Envio para todos, admins, endereços específicos ou um segmento, com agendamento, histórico de entrega e templates."
      decisoes={[
        "T6 — ordem dos canais: in-app primeiro (já existe), e-mail depois (o fornecedor já existe), push por último.",
        "O push (FCM) não existe de todo: exige projeto Firebase, google-services.json, plugin Capacitor, tabela de tokens e um APK NOVO. Um deploy web não o adiciona. Até lá o canal responde 501 com a razão.",
        "O transporte é a fila_tarefas que já existe (tem agendado_para, retentativas e reserva atómica). Não se constrói um segundo agendador.",
        "A fila tem 2 a 7 minutos de latência medida: o botão diz «em fila» e mostra progresso. Dizer «enviado» no instante do clique seria falso.",
        "O e-mail alcança 3 registos hoje — só as cotas têm essa coluna preenchida.",
      ]}
    />
  );
}
