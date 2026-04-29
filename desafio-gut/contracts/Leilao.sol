// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LeilaoGUT {
    address public coordenacao;

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

    event LanceDado(
        string idEdicao,
        address indexed lancador,
        uint256 valorEmCentavos,
        bool repetido,
        uint256 timestamp
    );
    event EdicaoAberta(string idEdicao, string nome, uint256 prazo);
    event SenhasCreditadas(address indexed usuario, uint256 quantidade);

    constructor() {
        coordenacao = msg.sender;
    }

    modifier apenasCoordenacao() {
        require(msg.sender == coordenacao, "Acesso restrito a coordenacao");
        _;
    }

    // Coordenacao abre uma edicao com prazo em segundos a partir de agora
    function abrirEdicao(string memory idEdicao, string memory nome, uint256 duracaoSegundos) public apenasCoordenacao {
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
            e.listaDeValores.push(valorEmCentavos);
        }

        e.lances[valorEmCentavos] = msg.sender;
        e.contagem[valorEmCentavos]++;
        saldoSenhas[msg.sender]--; // Consome uma senha (R$ 2,00)

        emit LanceDado(idEdicao, msg.sender, valorEmCentavos, jaExistia, block.timestamp);
    }

    // Artigo XXII: Apuracao automatica do vencedor
    function apurarVencedor(string memory idEdicao) public view apenasCoordenacao returns (uint256, address) {
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
}
