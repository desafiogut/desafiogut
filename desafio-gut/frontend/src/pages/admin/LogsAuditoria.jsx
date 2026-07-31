// Logs e Auditoria — Tela 5 do plano do MC89.5. Esqueleto (Fase 0).
//
// Já existe um log de ações do admin (Blob "log-decisoes"), mas não serve para
// auditoria: poda a 500 entradas por desenho e perde escritas em silêncio.

import { EmConstrucao } from "./_ui.jsx";

export default function LogsAuditoria() {
  return (
    <EmConstrucao
      titulo="Logs e Auditoria"
      fase="Fase 2 do plano do MC89.5 (MC90.2) — ANTECIPADA"
      descricao="Quem fez o quê, quando, sobre quem e porquê. Com filtros, busca, exportação CSV e política de retenção LGPD."
      decisoes={[
        "Sobe da Fase 5 para a Fase 2: construir comandos irreversíveis antes de existir rasto é a ordem errada.",
        "A tabela admin_logs vai para Postgres, não para Blobs — o log atual perde os registos mais antigos por desenho e perde escritas sem avisar.",
        "A escrita é fail-CLOSED, ao contrário de todo o resto do sistema: se o registo falhar, a ação é recusada. Para um comando de admin, «aconteceu e não há registo» é pior do que «não aconteceu».",
        "O histórico do Blob log-decisoes é importado e marcado com a origem, para a auditoria não começar com um buraco.",
        "A purga LGPD é agendada e ela própria registada — não um botão que apaga na hora.",
      ]}
    />
  );
}
