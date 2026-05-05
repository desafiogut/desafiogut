# Auditoria de Segurança — LeilaoGUT.sol
> Gerado em: 2026-05-05  
> Metodologias: Krait v8 (4-phase pipeline) + DarkNavy/web3-skills (analysis-checklist) + Trail of Bits (audit-prep principles)  
> Contrato: `desafio-gut/contracts/Leilao.sol` (90 linhas, Solidity ^0.8.0)  
> Rede-alvo: Ethereum Sepolia Testnet

---

## Resumo Executivo

O contrato `LeilaoGUT` implementa a lógica de leilão "menor lance único" em Solidity. Por não armazenar ETH diretamente (o pagamento de senhas é off-chain via PIX), o vetor de risco financeiro imediato é baixo. Entretanto, foram identificadas **5 vulnerabilidades (0 críticas, 1 alta, 3 médias, 1 baixa)** e **3 informativos** que afetam a confiabilidade, transparência e resiliência do contrato.

| Severidade | Qtd | Status |
|---|---|---|
| CRÍTICA | 0 | — |
| ALTA | 1 | H-01 |
| MÉDIA | 3 | M-01, M-02, M-03 |
| BAIXA | 1 | L-01 |
| INFORMATIVO | 3 | I-01, I-02, I-03 |

---

## Contexto do Contrato

```
├── State: coordenacao (EOA), edicoes (mapping string→Edicao), saldoSenhas (mapping address→uint)
├── Edicao: nome, ativa, prazo, listaDeValores[], lances[v→addr], contagem[v→uint]
├── Funções admin (apenasCoordenacao): abrirEdicao, adicionarSenhas, apurarVencedor
└── Função pública: darLance
```

**Regras de negócio codificadas**:
- Artigo VIII: vence o menor lance único (`contagem[v] == 1 && v < menorUnico`)
- Artigo XXIII: lance mínimo 1 centavo
- Artigos XVII/XXI: senhas adicionadas off-chain pela coordenação (pós-PIX)

---

## Fase 0 — Recon (Krait)

**Mapa de funções × permissões:**

| Função | Modificador | Chamador | State Modificado | Risco se Quebrado |
|---|---|---|---|---|
| `abrirEdicao` | `apenasCoordenacao` | Coordenação | Abre edição | CRÍTICO — falsa edição |
| `adicionarSenhas` | `apenasCoordenacao` | Coordenação | Saldo de senhas | CRÍTICO — mint ilimitado |
| `darLance` | nenhum (público) | Usuário com saldo | Lances + saldo | MÉDIO — design intencional |
| `apurarVencedor` | `apenasCoordenacao` + `view` | Coordenação | Nenhum (leitura) | BAIXO — restrição desnecessária |

**Dependências externas**: Nenhuma (sem OpenZeppelin, sem oráculos, sem proxies).  
**Valor em risco**: Sem ETH armazenado. Risco real: manipulação de resultado (vencedor errado) → perda de confiança + risco jurídico.

---

## Findings

---

### [H-01] Loop Ilimitado em `apurarVencedor` — DoS Potencial

**Severidade**: ALTA  
**Categoria**: Gas / Resource Exhaustion  
**Fonte**: Krait UNBOUNDED-PUSH + web3-skills Quantitative Resource Accounting

**Localização**: `Leilao.sol:80`

```solidity
for (uint i = 0; i < e.listaDeValores.length; i++) { ... }
```

**Descrição**: `listaDeValores` cresce 1 item por lance único sem nenhum limite máximo. Se o número de valores únicos crescer suficientemente, a função `apurarVencedor` excederá o gas limit de `eth_call` e ficará inviável de chamar.

**Quantificação concreta**:
- Custo por iteração: ~800 gas (2× SLOAD de `contagem[v]` + `lances[v]`)
- Gas limit `eth_call`: ~30M gas
- Iterações máximas antes de DoS: ~37.500 lances únicos
- Em um leilão normal: improvável. Em ataque coordenado (alguém com muitas senhas fazendo spam de valores únicos): viável.

**Exploit trace**:
1. Atacante adquire grande volume de senhas (ou explora M-02 se for a própria coordenação comprometida).
2. Atacante submete lances em valores 1, 2, 3, ..., N — todos únicos.
3. `listaDeValores.length` atinge ~37.500.
4. Chamada a `apurarVencedor` via `eth_call` reverte por out-of-gas.
5. Resultado: impossível determinar vencedor on-chain para essa edição.

**Impacto**: Inviabilidade permanente de apuração on-chain de uma edição específica. Resultado só pode ser apurado off-chain lendo eventos.

**Correção sugerida**:

```solidity
uint256 public constant MAX_LANCES_UNICOS = 10_000;

function darLance(...) public {
    // ... checks existentes ...
    
    bool jaExistia = e.contagem[valorEmCentavos] > 0;
    if (!jaExistia) {
        require(
            e.listaDeValores.length < MAX_LANCES_UNICOS,
            "Limite de lances unicos atingido para esta edicao"
        );
        e.listaDeValores.push(valorEmCentavos);
    }
    // ... resto ...
}
```

---

### [M-01] Estado da Edição Não Resetado ao Re-Abrir — Lances Obsoletos Persistem

**Severidade**: MÉDIA  
**Categoria**: State Management / Business Logic  
**Fonte**: Krait Phase 2 State Analysis — Mutation Matrix

**Localização**: `Leilao.sol:39-45`

```solidity
function abrirEdicao(...) public apenasCoordenacao {
    Edicao storage e = edicoes[idEdicao];
    e.nome = nome;
    e.ativa = true;
    e.prazo = block.timestamp + duracaoSegundos;
    // ⚠️ listaDeValores, lances, contagem NÃO são resetados
    emit EdicaoAberta(idEdicao, nome, e.prazo);
}
```

**Descrição**: Se a coordenação chamar `abrirEdicao("R-1", ...)` duas vezes com o mesmo `idEdicao`, a segunda chamada reabre a edição mas mantém todos os lances anteriores. Usuários do ciclo anterior "continuam participando" da nova edição sem saber.

**Exploit trace**:
1. Edição "R-1" corre. Usuário A faz lance único de 42 centavos — o menor.
2. Prazo expira. Coordenação esquece de apurar e chama `abrirEdicao("R-1", "Airfryer 2ª Rodada", 7200)`.
3. `listaDeValores` ainda contém o lance de 42 de A. A ainda aparece como `lances[42]`.
4. Novos usuários fazem lances. Se ninguém fizer lance de 42 na 2ª rodada, A vence automaticamente — sem ter participado.

**Impacto**: Resultado incorreto do leilão se IDs de edição forem reutilizados. Risco real para o negócio: usuário pode reclamar vitória indevida.

**Correção sugerida — opção A (limpar na re-abertura)**:

```solidity
function abrirEdicao(...) public apenasCoordenacao {
    Edicao storage e = edicoes[idEdicao];
    // Limpar lances anteriores se a edição já foi usada
    if (e.listaDeValores.length > 0) {
        for (uint i = 0; i < e.listaDeValores.length; i++) {
            uint256 v = e.listaDeValores[i];
            delete e.lances[v];
            delete e.contagem[v];
        }
        delete e.listaDeValores;
    }
    e.nome = nome;
    e.ativa = true;
    e.prazo = block.timestamp + duracaoSegundos;
    emit EdicaoAberta(idEdicao, nome, e.prazo);
}
```

**Correção sugerida — opção B (mais simples — impedir reutilização)**:

```solidity
function abrirEdicao(...) public apenasCoordenacao {
    require(
        !edicoes[idEdicao].ativa && edicoes[idEdicao].prazo == 0,
        "ID de edicao ja utilizado — use um novo ID"
    );
    // ... resto ...
}
```

Opção B é mais segura pois evita o custo de gas do loop de limpeza.

---

### [M-02] Papel de Coordenação é Único EOA sem Transferência — Single Point of Failure

**Severidade**: MÉDIA  
**Categoria**: Access Control / Centralization  
**Fonte**: Krait access-control-state.md — Role Hierarchy check

**Localização**: `Leilao.sol:29-31`

```solidity
constructor() {
    coordenacao = msg.sender;  // EOA sem mecanismo de transferência
}
```

**Descrição**: O endereço de `coordenacao` é definido no deploy e nunca pode ser alterado. Se a chave privada for perdida ou comprometida:
- Impossível adicionar novas senhas (`adicionarSenhas`)
- Impossível abrir novas edições (`abrirEdicao`)
- Impossível apurar vencedores on-chain (`apurarVencedor`)
- Contrato efetivamente travado para sempre

**Impacto**: Perda total da capacidade administrativa se o deployer perder acesso à chave.

**Correção sugerida — two-step transfer**:

```solidity
address public coordenacaoPendente;

function iniciarTransferencia(address novaCoordenacao) public apenasCoordenacao {
    require(novaCoordenacao != address(0), "Endereco invalido");
    coordenacaoPendente = novaCoordenacao;
}

function aceitarTransferencia() public {
    require(msg.sender == coordenacaoPendente, "Nao autorizado");
    coordenacao = coordenacaoPendente;
    coordenacaoPendente = address(0);
}
```

---

### [M-03] `apurarVencedor` Restrito à Coordenação — Sem Verificação Pública do Vencedor

**Severidade**: MÉDIA  
**Categoria**: Transparency / Trust Minimization  
**Fonte**: Web3-skills analysis-checklist — Missing Defense Inventory

**Localização**: `Leilao.sol:75`

```solidity
function apurarVencedor(...) public view apenasCoordenacao returns (uint256, address) {
```

**Descrição**: A função de verificação do vencedor é `view` (só leitura) mas tem `apenasCoordenacao`. Isso significa que nenhum usuário externo pode verificar independentemente se o vencedor anunciado é o correto. Qualquer chamada `eth_call` de endereço não-coordenador reverte com "Acesso restrito a coordenacao".

**Impacto**: Usuários precisam confiar inteiramente na coordenação para a corretude do resultado. Contradiz o propósito de ter o leilão on-chain (transparência/imutabilidade). Isso é um *finding* para o modelo de negócio do DesafioGUT.

**Correção sugerida**:

```solidity
// Remover apenasCoordenacao de apurarVencedor — é view, não modifica estado
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
```

Isso não compromete a segurança (a função é `view` — não muda estado), e transforma o leilão em verificável por qualquer pessoa.

---

### [L-01] Frontrunning Estrutural — Lances Visíveis no Mempool

**Severidade**: BAIXA  
**Categoria**: MEV / Game Theory  
**Fonte**: Krait heuristics-extended — EPOCH-BOUNDARY-RACE pattern

**Localização**: `darLance` — toda a função

**Descrição**: Quando um usuário submete `darLance(idEdicao, valorEmCentavos)`, a transação fica visível no mempool antes de ser minerada. Um observador pode:
1. Ver o lance X submetido
2. Submeter imediatamente `darLance(idEdicao, X)` com gas price maior → faz X não-único
3. Submeter `darLance(idEdicao, X-1)` → torna-se o menor único

**Impacto**: Em Sepolia testnet (sem MEV bot sofisticado), este risco é teórico. Em mainnet ou se o jogo crescer, bots podem explorar isso sistematicamente.

**Mitigação possível (commit-reveal)**:

```solidity
// Fase 1: Usuário submete hash do lance
function commitLance(string memory idEdicao, bytes32 hashLance) public { ... }

// Fase 2: Usuário revela o lance após período de commit
function revelarLance(string memory idEdicao, uint256 valor, bytes32 salt) public { ... }
```

> Nota: Commit-reveal adiciona complexidade significativa. Para o modelo atual do DesafioGUT (Sepolia testnet, contexto controlado), esta mitigação pode ser post-MVP.

---

## Informativos

### [I-01] Manipulação de `block.timestamp` — Janela de ~12s

**Localização**: `Leilao.sol:43, 61`

```solidity
e.prazo = block.timestamp + duracaoSegundos;
require(block.timestamp <= e.prazo, ...);
```

Validadores Ethereum podem ajustar `block.timestamp` em até ~12 segundos. Para leilões de duração longa (horas), o impacto é negligenciável. Para leilões de duração muito curta (< 60s), um validador malicioso poderia estender ou comprimir a janela. **Risco: mínimo no contexto atual.**

---

### [I-02] Sem Função de Emergência para Encerrar Edição

Não existe `fecharEdicaoEmergencia(string idEdicao)`. Se houver bug ou fraude, a coordenação não pode encerrar uma edição ativa prematuramente. O prazo corre até o fim independente de qualquer circunstância. **Sugestão**: adicionar `fecharEdicao(string idEdicao) public apenasCoordenacao` que define `e.ativa = false`.

---

### [I-03] Sem Evento de Apuração — Trilha de Auditoria Incompleta

Quando `apurarVencedor` é chamado e o vencedor é determinado, nenhum evento é emitido. A coordenação pode verificar o resultado off-chain mas não há registro on-chain de "apuração ocorreu em bloco X, vencedor foi endereço Y com lance Z". **Sugestão**: emitir `event VencedorApurado(string idEdicao, address ganhador, uint256 menorLance, uint256 blockNumber)` quando apurado.

---

## Contrato Corrigido (Sugestão)

Aplicando H-01, M-01 (opção B), M-02, M-03 e I-02, I-03:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LeilaoGUT {
    address public coordenacao;
    address public coordenacaoPendente;

    // [H-01 fix] Limite máximo de lances únicos por edição
    uint256 public constant MAX_LANCES_UNICOS = 10_000;

    struct Edicao {
        string nome;
        bool ativa;
        uint256 prazo;
        uint256[] listaDeValores;
        mapping(uint256 => address) lances;
        mapping(uint256 => uint256) contagem;
    }

    mapping(string => Edicao) private edicoes;
    mapping(address => uint256) public saldoSenhas;

    event LanceDado(
        string idEdicao,
        address indexed lancador,
        uint256 valorEmCentavos,
        bool repetido,
        uint256 timestamp
    );
    event EdicaoAberta(string idEdicao, string nome, uint256 prazo);
    event EdicaoEncerrada(string idEdicao, uint256 timestamp);  // [I-02]
    event SenhasCreditadas(address indexed usuario, uint256 quantidade);
    event VencedorApurado(string idEdicao, address ganhador, uint256 menorLance, uint256 blockNumber);  // [I-03]
    event TransferenciaIniciada(address novaCoordenacao);  // [M-02]

    constructor() {
        coordenacao = msg.sender;
    }

    modifier apenasCoordenacao() {
        require(msg.sender == coordenacao, "Acesso restrito a coordenacao");
        _;
    }

    // [M-01 fix — opção B] Impede reutilização de ID de edição
    function abrirEdicao(
        string memory idEdicao,
        string memory nome,
        uint256 duracaoSegundos
    ) public apenasCoordenacao {
        require(
            edicoes[idEdicao].prazo == 0,
            "ID de edicao ja utilizado — use novo ID (ex: R-2)"
        );
        Edicao storage e = edicoes[idEdicao];
        e.nome = nome;
        e.ativa = true;
        e.prazo = block.timestamp + duracaoSegundos;
        emit EdicaoAberta(idEdicao, nome, e.prazo);
    }

    // [I-02 fix] Função de emergência para encerrar edição
    function fecharEdicao(string memory idEdicao) public apenasCoordenacao {
        edicoes[idEdicao].ativa = false;
        emit EdicaoEncerrada(idEdicao, block.timestamp);
    }

    function adicionarSenhas(address usuario, uint256 quantidade) public apenasCoordenacao {
        saldoSenhas[usuario] += quantidade;
        emit SenhasCreditadas(usuario, quantidade);
    }

    function darLance(string memory idEdicao, uint256 valorEmCentavos) public {
        require(saldoSenhas[msg.sender] > 0, "Voce nao possui senhas disponiveis");
        require(valorEmCentavos >= 1, "Lance minimo e R$ 0,01");

        Edicao storage e = edicoes[idEdicao];
        require(e.ativa, "Edicao nao esta ativa");
        require(block.timestamp <= e.prazo, "Prazo da edicao encerrado");

        bool jaExistia = e.contagem[valorEmCentavos] > 0;
        if (!jaExistia) {
            // [H-01 fix] Limite de lances únicos
            require(
                e.listaDeValores.length < MAX_LANCES_UNICOS,
                "Limite de lances unicos desta edicao atingido"
            );
            e.listaDeValores.push(valorEmCentavos);
        }

        e.lances[valorEmCentavos] = msg.sender;
        e.contagem[valorEmCentavos]++;
        saldoSenhas[msg.sender]--;

        emit LanceDado(idEdicao, msg.sender, valorEmCentavos, jaExistia, block.timestamp);
    }

    // [M-03 fix] Público e verificável por qualquer endereço
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

    // [I-03] Função separada para coordenação emitir evento de apuração
    function registrarApuracao(string memory idEdicao) public apenasCoordenacao {
        (uint256 menorLance, address ganhador) = apurarVencedor(idEdicao);
        emit VencedorApurado(idEdicao, ganhador, menorLance, block.number);
    }

    // [M-02 fix] Two-step coordinator transfer
    function iniciarTransferenciaCoordenacao(address novaCoordenacao) public apenasCoordenacao {
        require(novaCoordenacao != address(0), "Endereco invalido");
        coordenacaoPendente = novaCoordenacao;
        emit TransferenciaIniciada(novaCoordenacao);
    }

    function aceitarTransferenciaCoordenacao() public {
        require(msg.sender == coordenacaoPendente, "Nao autorizado");
        coordenacao = coordenacaoPendente;
        coordenacaoPendente = address(0);
    }

    // Getter para edicoes (necessário pois struct com mapping não é auto-public)
    function getEdicao(string memory idEdicao) public view returns (
        string memory nome,
        bool ativa,
        uint256 prazo,
        uint256 totalLancesUnicos
    ) {
        Edicao storage e = edicoes[idEdicao];
        return (e.nome, e.ativa, e.prazo, e.listaDeValores.length);
    }
}
```

---

## Checklist de Mitigação Prioritária

| # | Finding | Prioridade | Esforço | Ação |
|---|---|---|---|---|
| H-01 | Unbounded loop DoS | 🔴 Alta | Baixo | Adicionar `MAX_LANCES_UNICOS` em `darLance` |
| M-01 | Stale bids on reopen | 🟡 Média | Baixo | Proibir reutilização de ID (opção B) |
| M-02 | Single EOA coordinator | 🟡 Média | Médio | Two-step transfer |
| M-03 | `apurarVencedor` privado | 🟡 Média | Trivial | Remover `apenasCoordenacao` |
| I-02 | Sem emergency close | 🟢 Baixo | Trivial | Adicionar `fecharEdicao` |
| I-03 | Sem evento de apuração | 🟢 Baixo | Trivial | Emitir `VencedorApurado` |
| L-01 | Frontrunning | ⚪ Post-MVP | Alto | Commit-reveal scheme |

---

## Cobertura de Ferramentas Estáticas

As seguintes ferramentas de análise estática de Solidity são recomendadas para varredura complementar:

```bash
# Slither (Trail of Bits)
pip install slither-analyzer
slither desafio-gut/contracts/Leilao.sol

# Mythril
pip install mythril
myth analyze desafio-gut/contracts/Leilao.sol

# Aderyn (lightweight)
aderyn desafio-gut/contracts/
```

Nenhuma dessas ferramentas foi executada nesta auditoria (ambiente não configurado). Recomenda-se rodar Slither antes do deploy em mainnet.

---

*Auditoria realizada por Claude com Krait v8 + DarkNavy/web3-skills. Não substitui auditoria profissional certificada antes de deploy em mainnet com valor real.*
