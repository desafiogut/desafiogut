// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LeilaoGUT {
    address public coordenacao;
    address public coordenacaoPendente; // [M-02] two-step transfer

    // [H-01] Limite máximo de lances únicos por edição (anti-DoS)
    uint256 public constant MAX_LANCES_UNICOS = 10_000;

    struct Edicao {
        string nome;
        bool ativa;
        uint256 prazo;       // timestamp Unix de encerramento
        uint256[] listaDeValores;
        mapping(uint256 => address) lances;
        mapping(uint256 => uint256) contagem;
    }

    mapping(string => Edicao) public edicoes; // Ex: "R-1", "P-1"
    mapping(address => uint256) public saldoSenhas;

    // ── MC28.1: Blindagem de privacidade (Blind Commitment — Abordagem A2) ─────
    // Aditivo e zero-regressão: as funções legadas (darLance/apurarVencedor) e a
    // interface `string idEdicao` permanecem intactas para a Sepolia/localhost.
    // NOTA (ITEM 1.1): a conversão idEdicao→bytes32 foi DELIBERADAMENTE não
    // aplicada — o contrato Sepolia já deployado usa `string` e R1/R9 exigem zero
    // regressão no legado. bytes32 é otimização; R1 é absoluto → mantém-se `string`.
    // Ver security_audit.md (separação EIP-712 off-chain vs edicaoNonce on-chain).

    // Compromisso cego por (edição, lançador): keccak256(abi.encode(valor, lancador)).
    // A coordenação (relayer confiável) regista APONTANDO para o endereço real do
    // participante → auditabilidade pública sem 2ª assinatura (UX 1 clique mantida).
    mapping(string => mapping(address => bytes32)) public lancesComprometidos;

    // Nonce auto-incremental por edição — anti-replay nativo on-chain. Queimado a
    // cada consolidarResultado (independente da assinatura EIP-712 off-chain).
    mapping(string => uint256) public edicaoNonce;

    // Resultado consolidado O(1) — escrito uma única vez pela coordenação no fecho.
    struct Resultado { uint256 menorUnico; address vencedor; bool consolidado; }
    mapping(string => Resultado) public resultados;

    event LanceDado(
        string idEdicao,
        address indexed lancador,
        uint256 valorEmCentavos,
        bool repetido,
        uint256 timestamp
    );
    event EdicaoAberta(string idEdicao, string nome, uint256 prazo);
    event SenhasCreditadas(address indexed usuario, uint256 quantidade);
    event TransferenciaIniciada(address indexed novaCoordenacao); // [M-02]

    // ── MC28.1: eventos da blindagem ──────────────────────────────────────────
    event LanceComprometido(string idEdicao, address indexed lancador, bytes32 hashLance);
    event ResultadoConsolidado(string idEdicao, address indexed vencedor, uint256 menorUnico, uint256 nonce);

    constructor() {
        coordenacao = msg.sender;
    }

    modifier apenasCoordenacao() {
        require(msg.sender == coordenacao, "Acesso restrito a coordenacao");
        _;
    }

    // Coordenacao abre uma edicao com prazo em segundos a partir de agora
    function abrirEdicao(string memory idEdicao, string memory nome, uint256 duracaoSegundos) public apenasCoordenacao {
        // [M-01] Impede reuso de ID — evita lances residuais de edições anteriores
        require(edicoes[idEdicao].prazo == 0, "ID de edicao ja utilizado - use novo ID (ex: R-2)");

        Edicao storage e = edicoes[idEdicao];
        e.nome = nome;
        e.ativa = true;
        e.prazo = block.timestamp + duracaoSegundos;
        emit EdicaoAberta(idEdicao, nome, e.prazo);
    }

    // Artigo XVII e XXI: Coordenacao libera senhas apos PIX ou Bonus
    function adicionarSenhas(address usuario, uint256 quantidade) public apenasCoordenacao {
        saldoSenhas[usuario] += quantidade;
        emit SenhasCreditadas(usuario, quantidade);
    }

    // Artigo VIII: O menor e unico ganha
    function darLance(string memory idEdicao, uint256 valorEmCentavos) public {
        require(saldoSenhas[msg.sender] > 0, "Voce nao possui senhas disponiveis");
        require(valorEmCentavos >= 1, "Lance minimo e R$ 0,01"); // Artigo XXIII

        Edicao storage e = edicoes[idEdicao];
        require(e.ativa, "Edicao nao esta ativa");
        require(block.timestamp <= e.prazo, "Prazo da edicao encerrado");

        bool jaExistia = e.contagem[valorEmCentavos] > 0;
        if (!jaExistia) {
            // [H-01] Proteção contra DoS por loop ilimitado em apurarVencedor
            require(
                e.listaDeValores.length < MAX_LANCES_UNICOS,
                "Limite de lances unicos desta edicao atingido"
            );
            e.listaDeValores.push(valorEmCentavos);
        }

        e.lances[valorEmCentavos] = msg.sender;
        e.contagem[valorEmCentavos]++;
        saldoSenhas[msg.sender]--; // Consome uma senha (R$ 2,00)

        emit LanceDado(idEdicao, msg.sender, valorEmCentavos, jaExistia, block.timestamp);
    }

    // Artigo XXII: Apuracao automatica do vencedor
    // [M-03] Removido apenasCoordenacao — função é view (só leitura), qualquer endereço pode verificar
    function apurarVencedor(string memory idEdicao) public view returns (uint256, address) {
        Edicao storage e = edicoes[idEdicao];
        uint256 menorUnico = type(uint256).max;
        address ganhador = address(0);

        for (uint i = 0; i < e.listaDeValores.length; i++) {
            uint256 v = e.listaDeValores[i];
            if (e.contagem[v] == 1 && v < menorUnico) {
                menorUnico = v;
                ganhador = e.lances[v];
            }
        }
        return (menorUnico, ganhador);
    }

    // [M-02] Two-step coordinator transfer — evita perda permanente por typo
    function iniciarTransferenciaCoordenacao(address novaCoordenacao) public apenasCoordenacao {
        require(novaCoordenacao != address(0), "Endereco invalido");
        coordenacaoPendente = novaCoordenacao;
        emit TransferenciaIniciada(novaCoordenacao);
    }

    function aceitarTransferenciaCoordenacao() public {
        require(msg.sender == coordenacaoPendente, "Somente o novo coordenador pode aceitar");
        coordenacao = coordenacaoPendente;
        coordenacaoPendente = address(0);
    }

    // ── MC28.1: Blindagem de privacidade dos lances (Anti-Bot) ─────────────────
    // [ITEM 1.2/A2] Registo do compromisso cego. A coordenação (relayer confiável)
    // submete o hash em nome do participante `lancador`, preservando a UX de 1
    // clique. A elegibilidade (saldo de senhas / edição ativa) é validada no
    // backend ANTES desta chamada. O valor real NUNCA toca a cadeia até à
    // consolidação — só o hash fica on-chain, invisível a bots no mempool.
    function comprometerLance(string memory idEdicao, address lancador, bytes32 hashLance)
        public apenasCoordenacao
    {
        require(lancador != address(0), "Lancador invalido");
        lancesComprometidos[idEdicao][lancador] = hashLance;
        emit LanceComprometido(idEdicao, lancador, hashLance);
    }

    // [ITEM 1.4] Consolidação O(1). A coordenação calcula o menor lance único
    // OFF-CHAIN (Artigo VIII; desempate resolvido off-chain) e publica apenas a
    // decisão final — valor SINGULAR, sem arrays dinâmicos (gás constante).
    // edicaoNonce++ queima o nonce do leilão → anti-replay nativo on-chain.
    function consolidarResultado(string memory idEdicao, address vencedor, uint256 menorUnico)
        public apenasCoordenacao
    {
        require(!resultados[idEdicao].consolidado, "Resultado ja consolidado");
        resultados[idEdicao] = Resultado(menorUnico, vencedor, true);
        edicaoNonce[idEdicao]++;
        emit ResultadoConsolidado(idEdicao, vencedor, menorUnico, edicaoNonce[idEdicao]);
    }
}
