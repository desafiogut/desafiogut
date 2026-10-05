// RegrasOficiais.jsx — UTAC106h. Página pública `/regras-oficiais` do app.
//
// Requisito da Google Play (política **Real-Money Gambling / Gamified Loyalty**): as **Regras
// Oficiais** do programa de fidelidade têm de estar **publicadas dentro do aplicativo**.
//
// ⚠️ FONTE DE VERDADE: o documento `docs/regras-oficiais.md` (o texto que vai para o
// Play Console / para o consumidor). Esta página repete o mesmo conteúdo em JSX porque o
// projeto **não tem** motor de markdown (medido: nenhuma lib de markdown no package.json).
// Para a duplicação não derivar, há **teste que compara os dois**: os factos-chave (R$ 2,00,
// 1 ponto por Passe, 50 pontos por cartão, +2 do palpite, «não é concurso», CNPJ, e-mail,
// Manaus) têm de aparecer **nos dois ficheiros** — `utac106h-regras.test.mjs`.
//
// Reutiliza o `GlassCard` do design system (o mesmo primitivo de `Privacidade.jsx` e
// `Configuracoes.jsx`). Vive DENTRO do AppLayout (ao contrário de `/privacidade`, que é
// standalone) para ser alcançável pelo menu «Mais» com a navegação intacta.

import { Link } from "react-router-dom";
import { GlassCard, Button } from "@/components/ui";
import { useIsMobile } from "../hooks/useIsMobile.js";

const COR = {
  text: "#e8f0fe", muted: "#6b7db8", gold: "#f5a623", blue300: "#fbbf24", success: "#10b981",
};

// Factos medidos no código (não inventados): passe-pontos.mjs (1 / 50 / 2, e o palpite fora de
// TIPOS_QUE_CONTAM_PARA_CARTAO), ComprarPasseModal.jsx (PRECO_PASSE_DESAFIO) e _lib/pedidos.mjs
// (ARREPENDIMENTO_DIAS = 7, CDC art. 49).
export const VERSAO_REGRAS = "1.0";
export const VIGENCIA_REGRAS = "2026-10-05";
export const CNPJ_VENDEDOR = "23.040.066/0001-00";
export const CONTACTO_OFICIAL = "desafiogut01@gmail.com";

const h2 = { margin: "0 0 0.75rem", fontSize: "1.02rem", fontWeight: 800, color: COR.blue300, letterSpacing: "0.03em" };
const p = { margin: "0 0 0.75rem", fontSize: "0.86rem", color: COR.muted, lineHeight: 1.65 };
const li = { margin: "0 0 0.4rem", fontSize: "0.84rem", color: COR.muted, lineHeight: 1.6 };
const forte = { color: COR.text, fontWeight: 700 };
const ul = { margin: "0 0 0.75rem", paddingLeft: "1.2rem" };
const destaque = {
  margin: "0.75rem 0 0.75rem", padding: "0.7rem 0.85rem", borderRadius: "12px",
  background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.25)",
  fontSize: "0.85rem", color: COR.text, fontWeight: 600, lineHeight: 1.6,
};

export default function RegrasOficiais() {
  const isMobile = useIsMobile();
  const cardCls = isMobile ? "p-4 mb-4" : "p-5 mb-5";

  return (
    <div style={{ padding: isMobile ? "1rem" : "2rem", maxWidth: "720px", margin: "0 auto", boxSizing: "border-box" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: isMobile ? "1.3rem" : "1.6rem", fontWeight: 900, color: COR.text }}>
          Regras Oficiais — Programa de Fidelidade
        </h1>
        <p style={{ ...p, margin: 0 }}>
          Versão {VERSAO_REGRAS} · vigente a partir de {VIGENCIA_REGRAS} ·{" "}
          <strong style={forte}>Associação Recreativa dos Nordestinos no Amazonas</strong> — CNPJ {CNPJ_VENDEDOR}
        </p>
      </header>

      <GlassCard className={cardCls}>
        <h2 style={h2}>1. IDENTIFICAÇÃO</h2>
        <p style={p}>
          O aplicativo <strong style={forte}>DesafioGUT</strong> é operado pela{" "}
          <strong style={forte}>Associação Recreativa dos Nordestinos no Amazonas</strong> (Grupo União e
          Trabalho), CNPJ <strong style={forte}>{CNPJ_VENDEDOR}</strong>. Contacto oficial:{" "}
          <a href={`mailto:${CONTACTO_OFICIAL}`} style={{ color: COR.blue300 }}>{CONTACTO_OFICIAL}</a>.
          Foro: Comarca de <strong style={forte}>Manaus/AM</strong> — Brasil.
        </p>
        <p style={p}>
          O DesafioGUT oferece <strong style={forte}>duas modalidades distintas</strong>:
        </p>
        <ul style={ul}>
          <li style={li}>
            <strong style={forte}>Menor Lance Único</strong> — modalidade de <strong style={forte}>habilidade</strong>:
            vence o participante com o <strong style={forte}>menor lance único</strong> da edição, com resultado
            determinado pela estratégia do participante (escolha do valor e leitura do comportamento dos demais)
            e <strong style={forte}>não</strong> por mecanismos de aleatoriedade, geradores de números aleatórios
            (RNG) ou sorteios.
          </li>
          <li style={li}>
            <strong style={forte}>Ofertas Programadas</strong> — o <strong style={forte}>programa de fidelidade</strong>
            {" "}descrito nestas regras.
          </li>
        </ul>
      </GlassCard>

      <GlassCard className={cardCls}>
        <h2 style={h2}>2. O PROGRAMA DE FIDELIDADE</h2>
        <p style={p}>
          <strong style={forte}>2.1 O Passe Desafio.</strong> O <strong style={forte}>Passe Desafio</strong> é um item
          adquirido <strong style={forte}>separadamente</strong> por <strong style={forte}>R$ 2,00 (dois reais)</strong>,
          dentro do próprio aplicativo. A compra do Passe é uma <strong style={forte}>transação genuína e autónoma</strong>:
          o Passe é um produto com preço próprio, pago pelo utilizador, e <strong style={forte}>não</strong> é um bilhete
          de sorteio, uma aposta ou uma participação em concurso.
        </p>
        <p style={p}>
          <strong style={forte}>2.2 O ponto.</strong> Cada Passe Desafio adquirido gera <strong style={forte}>1 (um) ponto</strong> na
          conta do utilizador.
        </p>
        <div style={destaque}>
          Proporção fixa de acúmulo: <strong>1 Passe Desafio (R$ 2,00) = 1 ponto.</strong> Fixa e igual para todos.
        </div>
        <p style={p}>
          <strong style={forte}>2.3 O cartão colecionável.</strong> O prémio é o <strong style={forte}>cartão colecionável
          físico da Família Quildo</strong>, emitido e enviado pela Associação.
        </p>
        <div style={destaque}>
          Proporção fixa de resgate: <strong>50 (cinquenta) pontos de compra = 1 (um) cartão colecionável.</strong>{" "}
          Fixa e igual para todos.
        </div>
      </GlassCard>

      <GlassCard className={cardCls}>
        <h2 style={h2}>3. COMO SE ACUMULAM OS PONTOS</h2>
        <p style={p}>Os pontos da conta têm <strong style={forte}>duas origens</strong>, com naturezas diferentes:</p>
        <ul style={ul}>
          <li style={li}>
            <strong style={forte}>Compra do Passe Desafio (R$ 2,00): +1 ponto por Passe — CONTA para o cartão.</strong>
          </li>
          <li style={li}>
            <strong style={forte}>Palpite mais próximo numa Oferta Programada (bónus): +2 pontos — NÃO conta para o cartão.</strong>
          </li>
        </ul>
        <p style={p}>
          <strong style={forte}>3.1 Pontos de compra.</strong> Cada Passe Desafio soma <strong style={forte}>1 ponto de
          compra</strong>. <strong style={forte}>Só os pontos de compra contam</strong> para o resgate do cartão.
        </p>
        <p style={p}>
          <strong style={forte}>3.2 Pontos de bónus do palpite.</strong> Em cada Oferta Programada o utilizador pode
          registar <strong style={forte}>um palpite</strong> (a sua previsão de um número). O palpite cujo valor ficar
          mais próximo do número real apurado pela Associação recebe um <strong style={forte}>bónus de +2 pontos</strong>.
          O palpite é um <strong style={forte}>benefício complementar e subordinado</strong>: os pontos de bónus{" "}
          <strong style={forte}>NÃO</strong> contam para o resgate do cartão, <strong style={forte}>NÃO</strong>{" "}
          alteram nem decidem a atribuição do cartão, e servem apenas para o <em>placar</em> do utilizador.
        </p>
        <div style={destaque}>
          O cartão é atribuído por <strong>acumulação de compras, nunca por acertar palpites</strong>. Um utilizador
          pode palpitar em todas as Ofertas Programadas e nunca receber o cartão, se não tiver 50 pontos de{" "}
          <strong>compra</strong>.
        </div>
        <p style={p}>
          <strong style={forte}>3.3 Método de seleção divulgado.</strong> O cartão é atribuído por critério{" "}
          <strong style={forte}>objetivo, fixo e divulgado</strong>: a acumulação de <strong style={forte}>50 pontos de
          compra</strong>. Não há sorteio, apuração aleatória, julgamento subjetivo nem número limitado de
          contemplados — <strong style={forte}>todo</strong> o utilizador que atinja 50 pontos de compra tem direito ao
          cartão, e os pedidos são atendidos por <strong style={forte}>ordem de solicitação</strong>.
        </p>
        <p style={p}>
          O bónus do palpite (+2 pontos) é apurado por <strong style={forte}>proximidade</strong>: vence o palpite com
          a <strong style={forte}>menor diferença absoluta</strong> em relação ao número real revelado. Em caso de{" "}
          <strong style={forte}>empate</strong>, o bónus é atribuído ao palpite <strong style={forte}>registado
          primeiro</strong>. O bónus é creditado <strong style={forte}>uma única vez por edição</strong>.
        </p>
      </GlassCard>

      <GlassCard className={cardCls}>
        <h2 style={h2}>4. COMO SE RESGATA O CARTÃO</h2>
        <ol style={ul}>
          <li style={li}>O utilizador atinge <strong style={forte}>50 pontos de compra</strong> na sua conta.</li>
          <li style={li}>
            No ecrã <strong style={forte}>«Ofertas Programadas»</strong> o botão <strong style={forte}>«Resgatar
            cartão»</strong> fica ativo; o utilizador preenche a <strong style={forte}>morada de entrega</strong>{" "}
            (nome, CPF, CEP, endereço, cidade/UF e telefone).
          </li>
          <li style={li}>
            Ao confirmar, a conta é <strong style={forte}>debitada em 50 pontos de compra</strong> e é criado um{" "}
            <strong style={forte}>pedido de resgate</strong> (estado <em>pendente</em>), com identificação única que
            impede pedidos duplicados acidentais.
          </li>
          <li style={li}>
            A Associação <strong style={forte}>emite a nota fiscal</strong> e envia o cartão para a morada indicada.
          </li>
          <li style={li}>
            O acompanhamento é feito na área de <strong style={forte}>Meus Ativos / pedidos</strong> do aplicativo.
          </li>
        </ol>
        <div style={destaque}>
          Prazo de entrega: até <strong>30 (trinta) dias corridos</strong> contados da confirmação do resgate.
        </div>
        <p style={p}>
          A morada fornecida é usada <strong style={forte}>exclusivamente</strong> para a emissão da nota fiscal e
          para a entrega do cartão (ver secção 8 — LGPD).
        </p>
      </GlassCard>

      <GlassCard className={cardCls}>
        <h2 style={h2}>5. VALIDADE E ALTERAÇÕES</h2>
        <p style={p}>
          <strong style={forte}>5.1 Validade dos pontos.</strong> Os pontos <strong style={forte}>não têm prazo de
          validade</strong> enquanto o programa estiver ativo e a conta se mantiver em situação regular. Os pontos{" "}
          <strong style={forte}>não são convertíveis em dinheiro</strong> nem transferíveis entre contas.
        </p>
        <p style={p}>
          <strong style={forte}>5.2 Alterações ao programa.</strong> A Associação pode alterar, suspender ou encerrar o
          programa e estas regras, mediante <strong style={forte}>aviso prévio</strong> publicado nesta página.
          Alterações que reduzam direitos já adquiridos só produzem efeitos para resgates formalizados{" "}
          <strong style={forte}>depois</strong> da comunicação.
        </p>
        <p style={p}>
          <strong style={forte}>5.3 Direitos do utilizador.</strong> Consultar o saldo e o histórico de pontos;
          resgatar o cartão ao atingir 50 pontos de compra; e ser informado de qualquer alteração a estas regras.
        </p>
      </GlassCard>

      <GlassCard className={cardCls}>
        <h2 style={h2}>6. DIREITO DE ARREPENDIMENTO</h2>
        <p style={p}>
          Nos termos do <strong style={forte}>artigo 49 do Código de Defesa do Consumidor</strong> (CDC — Lei nº
          8.078/1990), nas compras realizadas <strong style={forte}>fora do estabelecimento comercial</strong> — como
          as compras no aplicativo — o consumidor pode <strong style={forte}>desistir</strong> no prazo de{" "}
          <strong style={forte}>7 (sete) dias corridos</strong>, contados da contratação ou do recebimento do produto,
          com <strong style={forte}>devolução integral</strong> do valor pago.
        </p>
        <p style={p}>
          <strong style={forte}>Como exercer:</strong> contactar{" "}
          <a href={`mailto:${CONTACTO_OFICIAL}`} style={{ color: COR.blue300 }}>{CONTACTO_OFICIAL}</a> dentro desse
          prazo, indicando a compra e o pedido de desistência. A devolução é feita pelo mesmo meio de pagamento.
          O valor devolvido implica o <strong style={forte}>estorno dos pontos</strong> correspondentes.
        </p>
      </GlassCard>

      <GlassCard className={cardCls}>
        <h2 style={h2}>7. ESTE PROGRAMA NÃO É UM CONCURSO</h2>
        <div style={destaque}>
          Declaração expressa: este programa <strong>não é concurso, promoção assimilável a concurso, sorteio,
          loteria, aposta de quota fixa ou jogo de azar</strong>.
        </div>
        <ul style={ul}>
          <li style={li}><strong style={forte}>Não há sorteio</strong> nem apuração aleatória de contemplados.</li>
          <li style={li}>
            <strong style={forte}>Não há número limitado de vencedores</strong>: o cartão é atribuído por{" "}
            <strong style={forte}>acumulação</strong> (50 pontos de compra) e todo o utilizador que atinja o limiar tem
            direito ao prémio.
          </li>
          <li style={li}>
            <strong style={forte}>O palpite não decide o cartão</strong>: é um bónus de pontos, complementar e
            subordinado à compra.
          </li>
          <li style={li}>
            <strong style={forte}>A participação não depende de sorte</strong>: depende exclusivamente da compra do
            Passe Desafio, um produto adquirido por preço próprio.
          </li>
        </ul>
        <p style={p}>
          Para esta modalidade <strong style={forte}>não se aplica autorização de quota fixa (SPA/MF)</strong>,
          precisamente porque não há concurso nem aposta, mas um programa de fidelidade com proporções fixas e
          divulgadas. A modalidade <strong style={forte}>Menor Lance Único</strong> é um{" "}
          <strong style={forte}>torneio de habilidade</strong>, cujo resultado decorre da estratégia do participante e
          não de mecanismos de aleatoriedade, RNG ou sorteios.
        </p>
      </GlassCard>

      <GlassCard className={cardCls}>
        <h2 style={h2}>8. PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)</h2>
        <p style={p}>
          Estas regras não substituem a{" "}
          <Link to="/privacidade" style={{ color: COR.blue300 }}>Política de Privacidade</Link>, que é parte
          integrante dos termos do utilizador e prevalece em matéria de tratamento de dados.
        </p>
        <p style={p}>
          <strong style={forte}>Dados tratados:</strong> endereço de carteira (identificador da conta), histórico de
          compras de Passe, saldo e histórico de pontos, palpites registados e — no resgate — os dados de
          identificação e entrega (nome, CPF, morada, telefone, CEP).
        </p>
        <p style={p}>
          <strong style={forte}>Finalidade:</strong> exclusivamente a execução do programa — contabilizar pontos,
          apurar o bónus do palpite, processar o resgate, <strong style={forte}>emitir a nota fiscal</strong> e entregar
          o cartão. Os dados de entrega <strong style={forte}>não</strong> são usados para marketing nem vendidos.
        </p>
        <p style={p}>
          <strong style={forte}>Direitos do titular (LGPD — Lei nº 13.709/2018):</strong> acesso, correção,
          portabilidade, eliminação e revogação do consentimento. O pedido pode ser feito por{" "}
          <a href={`mailto:${CONTACTO_OFICIAL}`} style={{ color: COR.blue300 }}>{CONTACTO_OFICIAL}</a> ou pela função
          de eliminação de conta do aplicativo (<Link to="/excluir-conta" style={{ color: COR.blue300 }}>/excluir-conta</Link>).
        </p>
      </GlassCard>

      <GlassCard className={cardCls}>
        <h2 style={h2}>9. DISPOSIÇÕES FINAIS</h2>
        <ul style={ul}>
          <li style={li}>A participação no programa implica a leitura e o <strong style={forte}>aceite</strong> destas Regras Oficiais.</li>
          <li style={li}>
            A aquisição do Passe Desafio é <strong style={forte}>opcional</strong>: o aplicativo é{" "}
            <strong style={forte}>gratuito</strong> e não exige nenhuma compra para ser usado.
          </li>
          <li style={li}>
            É vedado obter pontos por meios fraudulentos (pagamentos não liquidados, contas múltiplas ou
            automatismos); a Associação pode <strong style={forte}>anular esses pontos</strong> e encerrar a conta.
          </li>
          <li style={li}>
            <strong style={forte}>Foro:</strong> Comarca de <strong style={forte}>Manaus/AM</strong> — Brasil.
          </li>
        </ul>
      </GlassCard>

      <p style={{ textAlign: "center", marginTop: "1.25rem" }}>
        <Link to="/" style={{ color: COR.muted, fontSize: "0.85rem" }}>← Voltar ao app</Link>
      </p>
      <p style={{ textAlign: "center", marginTop: "0.5rem", fontSize: "0.78rem", color: COR.muted }}>
        Documento oficial — Associação Recreativa dos Nordestinos no Amazonas (CNPJ {CNPJ_VENDEDOR}). Versão{" "}
        {VERSAO_REGRAS} — vigente a partir de {VIGENCIA_REGRAS}.
      </p>
    </div>
  );
}
