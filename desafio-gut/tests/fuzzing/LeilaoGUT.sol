// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../contracts/Leilao.sol";

/// @title LeilaoGUTFuzzing — Echidna invariants harness para o LeilaoGUT.
/// @notice MC4 / Item 1. Roda local apenas (não no CI):
///   docker run --rm -v $(pwd):/code ghcr.io/crytic/echidna/echidna:latest \
///     echidna /code/desafio-gut/tests/fuzzing/LeilaoGUT.sol \
///     --contract LeilaoGUTFuzzing --config /code/desafio-gut/echidna.yaml
///
/// O harness herda LeilaoGUT e:
///   1. Pré-abre uma edição "R-FUZZ" longa, pra darLance sempre ser elegível.
///   2. Pré-credita saldoSenhas em 3 wallets do pool de senders configurado
///      em echidna.yaml (0x10000, 0x20000, 0x30000), de forma que os bots
///      gerem darLance(...) com >50% de hit rate em vez de revertarem por
///      "Voce nao possui senhas".
///   3. Mantém contadores shadow (senhasCreditadasShadow / senhasGastasShadow)
///      pra validar conservação total (invariante 4).
///   4. Expõe ações coordenacao-only via try/catch (hookCredita*) pra que
///      bots não-coord testem a fronteira de acesso (invariante 5).
contract LeilaoGUTFuzzing is LeilaoGUT {
    string  internal constant EDICAO_FUZZ      = "R-FUZZ";
    address internal constant SENDER_A         = address(0x10000);
    address internal constant SENDER_B         = address(0x20000);
    address internal constant SENDER_C         = address(0x30000);
    uint256 internal constant SALDO_INICIAL    = 1_000;

    // Shadow accounting: o contrato real não soma totalCreditos; aqui rastreamos
    // para checar conservação. Conservação esperada após N ações:
    //   senhasCreditadasShadow == senhasGastasShadow + saldoSenhas[A]+B+C
    uint256 internal senhasCreditadasShadow;
    uint256 internal senhasGastasShadow;

    // Hook: registra se coordenacao mudou via aceitar() — usado pelo invariante 6.
    address internal coordenacaoOriginal;
    bool    internal coordenacaoMudouViaAceitar;

    constructor() {
        // Coordenação == este contrato (deployer = LeilaoGUT.constructor → msg.sender).
        // Pré-abre edição.
        Edicao storage e = edicoes[EDICAO_FUZZ];
        e.nome  = "Fuzz Edition";
        e.ativa = true;
        e.prazo = block.timestamp + 365 days; // largo, não vai expirar no fuzz.

        // Pré-credita saldoSenhas direto no storage (bypass apenasCoordenacao,
        // pq aqui SOMOS a coordenação no constructor).
        saldoSenhas[SENDER_A] = SALDO_INICIAL;
        saldoSenhas[SENDER_B] = SALDO_INICIAL;
        saldoSenhas[SENDER_C] = SALDO_INICIAL;
        senhasCreditadasShadow = SALDO_INICIAL * 3;

        coordenacaoOriginal = coordenacao;
    }

    // ── Wrappers que mantêm shadow accounting ────────────────────────────────
    // Echidna chama os methods do harness; precisamos espelhar a contabilidade.
    function darLanceComShadow(string memory idEdicao, uint256 valorEmCentavos) public {
        // Pré-condição: saldoSenhas > 0 (replica gate do contrato).
        if (saldoSenhas[msg.sender] == 0) return;
        // Chama o método original; em revert, propaga.
        darLance(idEdicao, valorEmCentavos);
        senhasGastasShadow += 1;
    }

    function adicionarSenhasComShadow(address usuario, uint256 quantidade) public {
        // Bots NÃO-coord chamando — esperado revert. Em sucesso, atualiza shadow.
        // Limita quantidade para evitar overflow do shadow.
        if (quantidade > 1_000_000) return;
        try this.adicionarSenhasExterno(usuario, quantidade) {
            senhasCreditadasShadow += quantidade;
        } catch {
            // Esperado quando msg.sender != coordenacao.
        }
    }

    function adicionarSenhasExterno(address usuario, uint256 quantidade) external {
        adicionarSenhas(usuario, quantidade);
    }

    // Hook em aceitar — marca que a troca foi via two-step.
    function aceitarComHook() public {
        address coordAntes = coordenacao;
        aceitarTransferenciaCoordenacao();
        if (coordenacao != coordAntes) {
            coordenacaoMudouViaAceitar = true;
        }
    }

    // MC40-CI: expõe consolidarResultado para os bots fuzzarem o fecho da edição.
    // Chamada INTERNA (sem `this.`) → msg.sender propaga: só o sender == coordenacao
    // (deployer 0x30000 do echidna.yaml) consegue consolidar; os demais revertem.
    // O guard `require(!consolidado)` no contrato impede 2º fecho bem-sucedido, então
    // edicaoNonce[EDICAO_FUZZ] só pode ir de 0→1 — nunca 2 (ver invariante 7).
    function consolidarResultadoFuzz(address vencedor, uint256 menorUnico) public {
        consolidarResultado(EDICAO_FUZZ, vencedor, menorUnico);
    }

    // ── Invariants Echidna (funções `echidna_*` retornam bool; false = breach)

    /// Invariante 1: coordenacao nunca é address(0) (sanity, two-step previne).
    function echidna_coordenacao_nao_zero() public view returns (bool) {
        return coordenacao != address(0);
    }

    /// Invariante 2: lista de valores nunca passa do limite anti-DoS.
    function echidna_listaDeValores_limitada() public view returns (bool) {
        Edicao storage e = edicoes[EDICAO_FUZZ];
        return e.listaDeValores.length <= MAX_LANCES_UNICOS;
    }

    /// Invariante 3: apurarVencedor só elege quando contagem[v] == 1.
    function echidna_unicidade_para_ganhar() public view returns (bool) {
        (uint256 valor, address ganhador) = apurarVencedor(EDICAO_FUZZ);
        if (ganhador == address(0)) return true; // sem vencedor é OK
        Edicao storage e = edicoes[EDICAO_FUZZ];
        return e.contagem[valor] == 1;
    }

    /// Invariante 4: conservação total de senhas.
    /// creditado == gasto + saldo_em_circulação (apenas dos 3 senders rastreados).
    function echidna_lance_consome_senha() public view returns (bool) {
        uint256 saldoVivo = saldoSenhas[SENDER_A] + saldoSenhas[SENDER_B] + saldoSenhas[SENDER_C];
        return senhasCreditadasShadow == senhasGastasShadow + saldoVivo;
    }

    /// Invariante 5: bots não-coord nunca creditam (controle de acesso).
    /// Se `senhasCreditadasShadow > SALDO_INICIAL*3`, foi via adicionarSenhasComShadow
    /// que checou try/catch — só passa se msg.sender == coordenacao. Como
    /// coordenacao é este contrato (que só roda no constructor), nenhum
    /// crédito adicional deve ter ocorrido a partir de calls externas dos bots.
    function echidna_apenas_coordenacao_credita() public view returns (bool) {
        return senhasCreditadasShadow == SALDO_INICIAL * 3;
    }

    /// Invariante 6: coordenacao só muda via two-step.
    /// Se coordenacao != original, o flag `coordenacaoMudouViaAceitar` foi setado.
    function echidna_two_step_transfer() public view returns (bool) {
        if (coordenacao == coordenacaoOriginal) return true;
        return coordenacaoMudouViaAceitar;
    }

    /// Invariante 7 (MC40-CI): edição não pode ser encerrada (consolidada) duas vezes.
    /// `consolidarResultado` incrementa edicaoNonce exatamente 1× por fecho e o guard
    /// `require(!resultados[id].consolidado, "Resultado ja consolidado")` reverte a 2ª
    /// tentativa. Logo, por mais que os bots chamem consolidarResultadoFuzz, o nonce
    /// do leilão de fuzz nunca passa de 1. Quebra desta invariante = fecho duplicado.
    function echidna_encerramento_unico() public view returns (bool) {
        return edicaoNonce[EDICAO_FUZZ] <= 1;
    }
}
