// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/Leilao.sol";

/// @title LeilaoGUTTest — Foundry test suite para LeilaoGUT.
/// @notice MC4 / Item 2. Roda local apenas (não no CI):
///   cd desafio-gut
///   forge install foundry-rs/forge-std --no-git --no-commit  # primeira vez
///   forge test -vv
contract LeilaoGUTTest is Test {
    LeilaoGUT internal leilao;
    address   internal coord = address(this);
    address   internal alice = address(0xA11CE);
    address   internal bob   = address(0xB0B);
    address   internal carol = address(0xCAA0);
    string    internal constant ID = "R-T1";

    function setUp() public {
        leilao = new LeilaoGUT();
        // coord (deployer) credita Alice/Bob/Carol com saldoSenhas.
        leilao.adicionarSenhas(alice, 10);
        leilao.adicionarSenhas(bob,   10);
        leilao.adicionarSenhas(carol, 10);
        // Abre edição de duração padrão (1h).
        leilao.abrirEdicao(ID, "Teste 1", 3600);
    }

    // ── Acesso e reuso de ID ─────────────────────────────────────────────────

    function test_abrirEdicaoRevertOnReuso() public {
        vm.expectRevert(bytes("ID de edicao ja utilizado - use novo ID (ex: R-2)"));
        leilao.abrirEdicao(ID, "Reuso", 3600);
    }

    function test_apenasCoordenacaoAbreEdicao() public {
        vm.prank(alice);
        vm.expectRevert(bytes("Acesso restrito a coordenacao"));
        leilao.abrirEdicao("R-2", "Tentativa", 3600);
    }

    function test_apenasCoordenacaoCredita() public {
        vm.prank(bob);
        vm.expectRevert(bytes("Acesso restrito a coordenacao"));
        leilao.adicionarSenhas(alice, 100);
    }

    // ── Lance: gates e edge cases ────────────────────────────────────────────

    function test_darLanceSemSaldoReverts() public {
        address semSaldo = address(0xDEAD);
        vm.prank(semSaldo);
        vm.expectRevert(bytes("Voce nao possui senhas disponiveis"));
        leilao.darLance(ID, 50);
    }

    function test_darLancePrazoExpiradoReverts() public {
        vm.warp(block.timestamp + 3601); // passa do prazo (3600s)
        vm.prank(alice);
        vm.expectRevert(bytes("Prazo da edicao encerrado"));
        leilao.darLance(ID, 50);
    }

    function test_darLanceLanceMinimoZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert(bytes("Lance minimo e R$ 0,01"));
        leilao.darLance(ID, 0);
    }

    function test_darLanceLanceMinimoUmCentavoPassa() public {
        vm.prank(alice);
        leilao.darLance(ID, 1);
        assertEq(leilao.saldoSenhas(alice), 9);
    }

    // ── Apuração: menor lance único ──────────────────────────────────────────

    function test_apurarVencedorMenorUnico() public {
        // Alice = 10 (único), Bob = 20, Carol = 20 (repetido).
        vm.prank(alice); leilao.darLance(ID, 10);
        vm.prank(bob);   leilao.darLance(ID, 20);
        vm.prank(carol); leilao.darLance(ID, 20);
        (uint256 v, address g) = leilao.apurarVencedor(ID);
        assertEq(v, 10);
        assertEq(g, alice);
    }

    function test_apurarVencedorVazio() public view {
        (uint256 v, address g) = leilao.apurarVencedor(ID);
        // Sem lances: menorUnico = type(uint256).max, ganhador = address(0).
        assertEq(g, address(0));
        assertEq(v, type(uint256).max);
    }

    function test_apurarVencedorTodosRepetidos() public {
        vm.prank(alice); leilao.darLance(ID, 10);
        vm.prank(bob);   leilao.darLance(ID, 10);
        (, address g) = leilao.apurarVencedor(ID);
        assertEq(g, address(0)); // ninguém ganha
    }

    // ── Limite anti-DoS (MAX_LANCES_UNICOS = 10_000) ─────────────────────────

    function test_limiteMaxLancesUnicos() public {
        // Reduz custo: cada lance consome 1 senha. Damos saldo grande à Alice
        // e ela faz 10_000 lances únicos. O 10_001º deve reverter.
        leilao.adicionarSenhas(alice, 10_001);
        vm.startPrank(alice);
        for (uint256 i = 1; i <= 10_000; i++) {
            leilao.darLance(ID, i);
        }
        vm.expectRevert(bytes("Limite de lances unicos desta edicao atingido"));
        leilao.darLance(ID, 10_001);
        vm.stopPrank();
    }

    // ── Two-step transfer de coordenação ─────────────────────────────────────

    function test_transferenciaTwoStepHappyPath() public {
        leilao.iniciarTransferenciaCoordenacao(alice);
        assertEq(leilao.coordenacao(), coord); // ainda não mudou
        vm.prank(alice);
        leilao.aceitarTransferenciaCoordenacao();
        assertEq(leilao.coordenacao(), alice);
    }

    function test_transferenciaSemAceitarNaoMuda() public {
        leilao.iniciarTransferenciaCoordenacao(alice);
        assertEq(leilao.coordenacao(), coord);
        // Sem aceitar, coordenação não muda.
        assertEq(leilao.coordenacaoPendente(), alice);
    }

    function test_aceitarSemIniciarReverts() public {
        vm.prank(alice);
        vm.expectRevert(bytes("Somente o novo coordenador pode aceitar"));
        leilao.aceitarTransferenciaCoordenacao();
    }

    function test_aceitarPorOutroEnderecoReverts() public {
        leilao.iniciarTransferenciaCoordenacao(alice);
        vm.prank(bob); // não é alice
        vm.expectRevert(bytes("Somente o novo coordenador pode aceitar"));
        leilao.aceitarTransferenciaCoordenacao();
    }

    function test_iniciarComZeroReverts() public {
        vm.expectRevert(bytes("Endereco invalido"));
        leilao.iniciarTransferenciaCoordenacao(address(0));
    }
}
