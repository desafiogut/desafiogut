// Privacidade — MC90.3 (rota pública /privacidade exigida pela Google Play
// Store — User Data policy 2026).
//
// Página pública STANDALONE (fora do gate LGPD e da navegação — ver Boot.jsx),
// com o texto integral da Política de Privacidade conforme o artefacto
// docs/MC90.2-POLITICA-PRIVACIDADE-TEXTO.txt (gerado na auditoria MC90.2).
// Elimina o GAP 1 da auditoria: fornece uma URL pública estável e não-editável
// para o campo "Política de privacidade" do Play Console e para os links do
// app (substitui os antigos links iubenda, que respondiam 404).
//
// Sem providers de autenticação: não importa Privy nem AppContext — apenas
// conteúdo estático + link para /excluir-conta.

import { GlassCard } from "@/components/ui";

const COR = {
  bg: "#050818", text: "#e8f0fe", muted: "#6b7db8",
  gold: "#f5a623", blue300: "#fbbf24",
};

// Estilo comum das secções para manter a página consistente e legível.
const h2Style = {
  margin: "0 0 0.75rem", fontSize: "1.05rem", fontWeight: 800,
  color: COR.blue300, letterSpacing: "0.03em",
};
const pStyle = {
  margin: "0 0 0.75rem", fontSize: "0.86rem", color: COR.muted,
  lineHeight: 1.65,
};
const liStyle = { margin: "0 0 0.4rem", fontSize: "0.84rem", color: COR.muted, lineHeight: 1.6 };

export default function Privacidade() {
  return (
    <div style={{
      minHeight: "100vh", background: COR.bg, color: COR.text,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "2rem 1rem", boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: "720px" }}>
        <header style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.6rem", fontWeight: 900 }}>
            Política de Privacidade — DesafioGUT
          </h1>
          <p style={{ margin: 0, color: COR.muted, fontSize: "0.9rem" }}>
            Última atualização: 17 de outubro de 2026
          </p>
        </header>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>1. IDENTIFICAÇÃO DO CONTROLADOR</h3>
          <p style={pStyle}>
            O aplicativo DesafioGUT ("DesafioGUT", "nós", "nosso") é operado pelo
            Grupo União e Trabalho, CNPJ 23.040.066/0001-00, com sede no Brasil.
          </p>
          <p style={pStyle}>
            Para questões relacionadas a esta Política de Privacidade, ao tratamento de
            dados pessoais ou a pedidos de exercício de direitos, entre em contacto através
            do e-mail:{" "}
            <a href="mailto:desafiogut01@gmail.com" style={{ color: COR.blue300 }}>
              desafiogut01@gmail.com
            </a>{" "}
            (ponto de contacto de privacidade).
          </p>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>2. VISÃO GERAL</h3>
          <p style={pStyle}>
            Esta Política de Privacidade descreve, de forma clara e completa, como o
            DesafioGUT acessa, coleta, utiliza, partilha e protege os dados pessoais dos
            utilizadores, em conformidade com a Lei Geral de Proteção de Dados (LGPD —
            Lei nº 13.709/2018), com o Regulamento Geral sobre a Proteção de Dados (GDPR,
            quando aplicável) e com as políticas do Google Play (User Data policy, em
            vigor em 2026).
          </p>
          <p style={pStyle}>
            O DesafioGUT é uma plataforma de competição de habilidade de "menor lance único": os utilizadores
            participam em edições, lançam lances e podem adquirir Passes Desafio mediante
            pagamento. A participação requer a criação de uma conta e o aceite dos Termos
            de Consentimento (gate LGPD) antes de qualquer interação.
          </p>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>3. DADOS COLETADOS E FINALIDADES</h3>
          <p style={{ ...pStyle, fontWeight: 700, color: COR.text }}>
            3.1. Informações pessoais (identificação e contacto)
          </p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Nome, e-mail e endereço de carteira Ethereum (endereço público on-chain).</li>
            <li style={liStyle}>Coletados através do serviço de autenticação Privy (login com conta Google ou e-mail com código OTP no fluxo corporativo).</li>
            <li style={liStyle}>Finalidade: criação e gestão da conta, autenticação, assinatura de transações on-chain (lances) e prestação do serviço.</li>
            <li style={liStyle}>Obrigatório para o funcionamento do app. Base legal: execução do contrato (termos de uso) e consentimento.</li>
          </ul>
          <p style={{ ...pStyle, fontWeight: 700, color: COR.text }}>
            3.2. Informações financeiras
          </p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Histórico de compras de Passes Desafio, incluindo as efetuadas pelo Google Play na app Android, e transações de pagamento PIX processadas através do Mercado Pago (instituição de pagamento).</li>
            <li style={liStyle}>Os dados de pagamento (PIX) são processados pelo Mercado Pago; o DesafioGUT não armazena chaves PIX nem dados de cartão.</li>
            <li style={liStyle}>Finalidade: processamento de pagamentos, prevenção de fraude e obrigações fiscais/legais.</li>
            <li style={liStyle}>Obrigatório para o funcionamento do app (compras). Base legal: execução do contrato e obrigação legal (legislação fiscal brasileira).</li>
          </ul>
          <p style={{ ...pStyle, fontWeight: 700, color: COR.text }}>
            3.3. Atividade no app (interações, lances, histórico)
          </p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Registos de interações: lances (com hash Argon2id off-chain de prova de intenção), histórico de compras, saldo de Passes Desafio e visualizações.</li>
            <li style={liStyle}>Armazenados na base de dados Supabase.</li>
            <li style={liStyle}>Finalidade: funcionamento do serviço, apuração do vencedor, resolução de disputas, melhoria da experiência e prevenção de abuso/fraude.</li>
            <li style={liStyle}>Coleta não estritamente obrigatória para a navegação básica, mas necessária para participar em edições. Base legal: execução do contrato e interesse legítimo (segurança e prevenção de fraude).</li>
          </ul>
          <p style={{ ...pStyle, fontWeight: 700, color: COR.text }}>
            3.4. Dados de atividade (presença)
          </p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Endereço de carteira + carimbo de data/hora da última atividade, registados na tabela "atividade_utilizadores".</li>
            <li style={liStyle}>Finalidade: gestão da conta, painéis administrativos e segurança.</li>
            <li style={liStyle}>Base legal: execução do contrato e interesse legítimo.</li>
          </ul>
          <p style={{ ...pStyle, fontWeight: 700, color: COR.text }}>
            3.5. Dados on-chain (blockchain Ethereum)
          </p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Os lances são registados no smart contract LeilaoGUT (nome do contrato on-chain, imutável) na rede Ethereum mainnet. Os dados on-chain (endereço da carteira, valores, timestamps) são públicos por natureza da blockchain e IMUTÁVEIS — não podem ser apagados.</li>
            <li style={liStyle}>Finalidade: funcionamento da competição (pipeline de lance 100% on-chain).</li>
            <li style={liStyle}>Estes dados são pseudónimos (identificados pelo endereço da carteira, não pelo nome) e não são utilizados para fins de marketing.</li>
          </ul>
          <p style={{ ...pStyle, fontWeight: 700, color: COR.text }}>
            3.6. Informações de desempenho e dispositivo (crash logs)
          </p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Dados de diagnóstico e relatórios de falhas (crash logs), processados pelo Sentry quando habilitado.</li>
            <li style={liStyle}>Métricas de desempenho da aplicação (LCP, INP, CLS e TTFB), recolhidas pela biblioteca <em>web-vitals</em> e enviadas ao mesmo serviço de diagnóstico.</li>
            <li style={liStyle}>Finalidade: monitorização da estabilidade, do desempenho e correção de erros.</li>
            <li style={liStyle}>Coleta opcional, com consentimento: o serviço só é carregado depois do aceite do Gate de Consentimento. Não é utilizada para publicidade nem associada a identificadores de publicidade.</li>
          </ul>

          <p style={{ ...pStyle, fontWeight: 700, color: COR.text }}>
            3.7. Dados de entrega do cartão colecionável (opcional)
          </p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Recolhidos apenas quando o utilizador pede o envio do cartão colecionável: nome do destinatário, CPF, CEP, logradouro, número, complemento, bairro, cidade, estado (UF) e, opcionalmente, telefone com DDD.</li>
            <li style={liStyle}>Armazenados na base de dados Supabase (registo do resgate) e utilizados exclusivamente para a entrega do cartão e para a prova dessa entrega. Não são usados para publicidade, perfilamento nem avaliação de crédito.</li>
            <li style={liStyle}>O CPF é recolhido apenas neste fluxo — não é pedido no registo, no login nem no pagamento — e é exigido pela logística de entrega.</li>
            <li style={liStyle}>Base legal: execução do contrato. O restante funcionamento do app não depende destes dados.</li>
            <li style={liStyle}>Na eliminação da conta, a morada passa a «[Conta Deletada]», o CPF é eliminado e o registo da transacção é mantido como prova de entrega (secção 8).</li>
          </ul>

          <p style={{ ...pStyle, fontWeight: 700, color: COR.text }}>
            3.8. Identificadores de dispositivo e de rede
          </p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Identificador de dispositivo calculado localmente (visitorId da biblioteca FingerprintJS, executada no próprio aparelho): guardado no armazenamento local do dispositivo e enviado nas chamadas ao servidor para prevenção de abuso e de contas múltiplas. A biblioteca não transmite dados ao seu fornecedor.</li>
            <li style={liStyle}>Endereço IP: utilizado para limitar a taxa de pedidos e para alertas de segurança, em janelas de um minuto. Não é utilizado para determinar a localização do utilizador.</li>
            <li style={liStyle}>Finalidade: segurança, prevenção de fraude e funcionamento do serviço. Base legal: interesse legítimo e execução do contrato.</li>
          </ul>

          <p style={{ ...pStyle, fontWeight: 700, color: COR.text }}>
            3.9. Mensagens escritas no assistente do app (GUTO)
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li style={liStyle}>O texto que o utilizador escreve no assistente do app e o histórico recente da conversa são enviados a um fornecedor de inteligência artificial (atualmente DeepSeek) para gerar a resposta (secção 5).</li>
            <li style={liStyle}>Estas mensagens não são guardadas nos nossos servidores; o histórico recente fica no próprio dispositivo do utilizador e desaparece quando os dados do app são limpos.</li>
            <li style={liStyle}>Finalidade: funcionalidade do app. A utilização do assistente é opcional.</li>
            <li style={liStyle}>Não escreva no assistente dados sensíveis, palavras-passe, chaves ou dados de pagamento.</li>
          </ul>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>4. DADOS QUE NÃO SÃO COLETADOS</h3>
          <p style={pStyle}>
            O DesafioGUT NÃO coleta: localização (GPS), fotos, vídeos, áudio, ficheiros e
            documentos, calendário, contactos, mensagens SMS/MMS, histórico de navegação web,
            dados de saúde, raça/etnia, opiniões políticas ou religiosas, nem orientação sexual.
          </p>
          <p style={pStyle}>
            Nota: o telefone com DDD é recolhido apenas, e a título opcional, no envio do cartão
            colecionável (secção 3.7). As mensagens escritas no assistente do app não são SMS/MMS
            e estão descritas na secção 3.9.
          </p>
          <p style={pStyle}>
            O app declara apenas a permissão Android INTERNET (necessária para a ligação à
            rede). Nenhuma permissão sensível (contactos, fotos, localização, SMS, etc.) é
            solicitada.
          </p>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>5. COMPARTILHAMENTO COM TERCEIROS (SDKs E SERVIÇOS)</h3>
          <p style={pStyle}>
            Os seus dados são tratados pelos prestadores de serviços essenciais ao
            funcionamento do app, sob contrato, e nunca são vendidos nem cedidos para
            publicidade:
          </p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}><strong style={{ color: COR.text }}>Privy (privy.io)</strong> — autenticação e carteira embutida: nome, e-mail, endereço da carteira, identificador de utilizador.</li>
            <li style={liStyle}><strong style={{ color: COR.text }}>Supabase (supabase.com)</strong> — base de dados e armazenamento: dados de conta, lances, histórico, atividade, saldos.</li>
            <li style={liStyle}><strong style={{ color: COR.text }}>Netlify (netlify.com)</strong> — backend serverless (funções): dados transitórios necessários às funções (ex.: processamento de pagamento e lances).</li>
            <li style={liStyle}><strong style={{ color: COR.text }}>Mercado Pago (mercadopago.com.br)</strong> — processamento de pagamentos PIX: dados de transação de pagamento (valor, data, referência) e o e-mail do pagador.</li>
            <li style={liStyle}><strong style={{ color: COR.text }}>Google Play (faturamento)</strong> — compras efetuadas na app Android: identificador do pedido e token de compra, validados junto do Google para confirmar o pagamento.</li>
            <li style={liStyle}><strong style={{ color: COR.text }}>SendGrid (Twilio)</strong> — envio de e-mail transacional: endereço de e-mail do destinatário e o texto da confirmação, que no resgate do cartão inclui o nome e a morada indicados na secção 3.7.</li>
            <li style={liStyle}><strong style={{ color: COR.text }}>DeepSeek</strong> — assistente do app: o texto da pergunta e o histórico recente da conversa (secção 3.9), processados para gerar a resposta.</li>
            <li style={liStyle}><strong style={{ color: COR.text }}>Frenet</strong> — rastreio de entregas: apenas o código de rastreio; não recebe nome, morada nem CPF.</li>
            <li style={liStyle}><strong style={{ color: COR.text }}>Sentry (sentry.io)</strong> — monitorização de erros: relatórios de falha e diagnóstico (se habilitado).</li>
            <li style={liStyle}><strong style={{ color: COR.text }}>Alchemy (RPC)</strong> — acesso à rede Ethereum: endereços e transações públicas on-chain.</li>
          </ul>
          <p style={pStyle}>
            O DesafioGUT não vende dados pessoais e não utiliza dados pessoais para
            publicidade comportamental. Quando o fornecedor trata os dados por conta
            própria — como o fornecedor de inteligência artificial do assistente — a
            transferência é a indicada na descrição respetiva.
          </p>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>6. CONSENTIMENTO (LGPD)</h3>
          <p style={pStyle}>
            Antes de qualquer interação com o app, o utilizador é apresentado ao Gate de
            Consentimento (Termos de Consentimento) onde deve: declarar ter lido os Termos
            e Condições; declarar ser maior de idade; aceitar esta Política de Privacidade;
            e consentir com o tratamento de dados nos termos desta Política.
          </p>
          <p style={pStyle}>
            O consentimento é registado com data/hora. O utilizador pode revogar o
            consentimento a qualquer momento, o que pode implicar a impossibilidade de
            continuar a utilizar o serviço e/ou a eliminação da conta (secção 8).
          </p>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>7. SEGURANÇA DOS DADOS</h3>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Criptografia em trânsito: todas as comunicações são feitas por HTTPS/TLS.</li>
            <li style={liStyle}>Criptografia em repouso: base de dados e armazenamento com encriptação padrão dos fornecedores (Supabase/Netlify/AWS).</li>
            <li style={liStyle}>Acesso restrito: apenas o administrador e funções serverless autenticadas acedem aos dados; chaves e credenciais nunca são expostas no cliente.</li>
            <li style={liStyle}>Autenticação forte: login via Privy (Google OAuth), com assinatura criptográfica das transações (EIP-191) e limites de taxa (rate limit) nos endpoints sensíveis.</li>
            <li style={liStyle}>Sem venda de dados e sem publicidade comportamental.</li>
          </ul>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>8. ELIMINAÇÃO DE CONTA E DADOS</h3>
          <p style={pStyle}>
            O utilizador pode eliminar a sua conta e os dados associados a qualquer momento:
          </p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}>
              <strong style={{ color: COR.text }}>Dentro do app:</strong> menu de
              definições/segurança → "Excluir conta" (rota /excluir-conta). A exclusão é
              confirmada e processada pelo serviço delete-account.
            </li>
            <li style={liStyle}>
              <strong style={{ color: COR.text }}>Fora do app (recurso web):</strong>{" "}
              <a href="/excluir-conta" style={{ color: COR.blue300 }}>página de eliminação de conta</a>{" "}
              — o utilizador entra com o mesmo método de login e solicita a exclusão.
            </li>
          </ul>
          <p style={{ ...pStyle, fontWeight: 700, color: COR.text }}>O que é apagado (hard-delete):</p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Dados de conta (nome, e-mail, identificadores), atividade no app, <strong style={{ color: COR.text }}>palpites</strong>, <strong style={{ color: COR.text }}>pontuações e rankings</strong>, saldo em R$, pacotes de patrocínio do lojista, wallet, ficheiros associados à conta, código e vínculos de indicação do próprio titular (Supabase + Blobs).</li>
            <li style={liStyle}>Notificações, sessões, cache de chatbot e registos de consentimento.</li>
          </ul>
          <p style={{ ...pStyle, fontWeight: 700, color: COR.text }}>O que é PSEUDONIMIZADO e retido por obrigação legal:</p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Registos fiscais de pagamentos PIX e de compras na Google Play (valor, data, referência) — o endereço da carteira é substituído por um <strong style={{ color: COR.text }}>identificador pseudónimo derivado dela</strong>.</li>
            <li style={liStyle}>Registo de entrega do cartão colecionável (o que foi entregue, quando) — a <strong style={{ color: COR.text }}>morada passa a «[Conta Deletada]»</strong>; o registo da transacção fica como prova de entrega.</li>
            <li style={liStyle}>Saldo de ECOQUILDO e lastro contabilístico — o valor fica, o titular sai.</li>
            <li style={liStyle}>Lances de uma edição ainda em curso — não podem ser pseudonimizados sem quebrar a apuração dessa edição; ficam com a carteira até ela fechar, e a exclusão avisa quantos são.</li>
          </ul>
          <p style={{ ...pStyle, fontWeight: 700, color: COR.text }}>O que é retido por impossibilidade técnica (declarado):</p>
          <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Dados on-chain no smart contract (blockchain Ethereum) — imutáveis e pseudónimos; não é tecnicamente possível apagá-los.</li>
          </ul>
          <p style={{ ...pStyle, marginTop: "0.75rem" }}>
            <strong style={{ color: COR.text }}>Pseudonimização não é anonimização</strong> (ANPD): nos
            registos pseudonimizados o dado permanece pessoal e o titular mantém, sobre eles, os
            direitos do artigo 18 da LGPD — incluindo pedir informação e oposição pelo contacto do
            Encarregado (secção 14).
          </p>
          <p style={{ ...pStyle, marginTop: "0.75rem" }}>
            Congelamento de conta não é utilizado como substituto de eliminação: o pedido de
            eliminação resulta na exclusão efetiva dos dados pessoais.
          </p>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>9. RETENÇÃO DE DADOS</h3>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li style={liStyle}>Dados pessoais: mantidos enquanto a conta estiver ativa; eliminados após pedido de eliminação da conta.</li>
            <li style={liStyle}>Registos fiscais (PIX anonimizados): retidos pelo prazo legal exigido pela legislação brasileira.</li>
            <li style={liStyle}>Dados on-chain: retidos permanentemente (natureza imutável da blockchain).</li>
            <li style={liStyle}>Crash logs (Sentry): retidos pelo período de retenção padrão do Sentry, conforme a configuração do projeto.</li>
          </ul>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>10. DIREITOS DO TITULAR (LGPD / GDPR)</h3>
          <p style={pStyle}>
            Nos termos da LGPD, o titular tem direito a: confirmação e acesso aos dados
            tratados; correção de dados incompletos, inexatos ou desatualizados;
            anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;
            portabilidade dos dados; eliminação dos dados tratados com consentimento (exceto
            retenção legal); informação sobre compartilhamento; revogação do consentimento;
            e oposição ao tratamento.
          </p>
          <p style={pStyle}>
            Para exercer estes direitos, contacte{" "}
            <a href="mailto:desafiogut01@gmail.com" style={{ color: COR.blue300 }}>
              desafiogut01@gmail.com
            </a>{" "}
            ou utilize a funcionalidade de eliminação de conta do app (secção 8).
          </p>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>11. TRANSFERÊNCIA INTERNACIONAL DE DADOS</h3>
          <p style={pStyle}>
            Os dados podem ser processados em servidores localizados fora do Brasil
            (Supabase, Netlify/AWS, Privy, Sentry, Mercado Pago). A transferência é
            realizada com prestadores que oferecem garantias adequadas de proteção de dados
            (cláusulas contratuais padrão, certificações de segurança) e em conformidade
            com a LGPD.
          </p>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>12. CRIANÇAS</h3>
          <p style={pStyle}>
            O DesafioGUT não é direcionado a crianças e não coleta intencionalmente dados de
            menores de idade. O Gate de Consentimento exige declaração de maioridade.
          </p>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>13. ALTERAÇÕES A ESTA POLÍTICA</h3>
          <p style={pStyle}>
            Esta Política pode ser atualizada periodicamente para refletir alterações
            legislativas, regulatórias ou de funcionalidades. A versão vigente será sempre
            a publicada nesta página, e a data da última atualização é indicada no início
            do documento.
          </p>
        </GlassCard>

        <GlassCard className="p-5 mb-5">
          <h3 style={h2Style}>14. ENCARREGADO DE PROTEÇÃO DE DADOS (DPO) E CONTACTO</h3>
          <p style={{ ...pStyle, color: COR.text, fontWeight: 700 }}>
            Encarregado de Proteção de Dados: Francisco Canindé Marinho
            <br />
            Contacto:{" "}
            <a href="mailto:dpo@grupouniaoetrabalho.com.br" style={{ color: COR.blue300 }}>
              dpo@grupouniaoetrabalho.com.br
            </a>
          </p>
          <p style={pStyle}>
            Alternativa: <em>contato@grupouniaoetrabalho.com.br</em> com o assunto «DPO». O
            Encarregado é o canal para exercer os direitos do artigo 18 da LGPD (confirmação,
            acesso, correção, eliminação, portabilidade, informação sobre partilha e oposição),
            incluindo sobre os registos pseudonimizados descritos na secção 8.
          </p>
          <p style={pStyle}>
            Para questões gerais de privacidade ou proteção de dados, contacte também:{" "}
            <a href="mailto:desafiogut01@gmail.com" style={{ color: COR.blue300 }}>
              desafiogut01@gmail.com
            </a>
            .
          </p>
          <p style={pStyle}>
            Em caso de divergência não resolvida, o titular pode recorrer à Autoridade
            Nacional de Proteção de Dados (ANPD) — Brasil.
          </p>
        </GlassCard>

        <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <a href="/excluir-conta" style={{ color: COR.blue300, fontSize: "0.86rem" }}>
            Solicitar eliminação de conta →
          </a>
        </p>
        <p style={{ textAlign: "center", marginTop: "0.75rem" }}>
          <a href="/" style={{ color: COR.muted, fontSize: "0.82rem" }}>← Voltar ao app</a>
        </p>
      </div>
    </div>
  );
}
