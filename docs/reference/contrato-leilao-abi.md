# Referência — Contrato `LeilaoGUT`

> **Tipo**: Reference  
> **Rede**: Ethereum Sepolia Testnet (chainId `11155111`)  
> **Endereço**: `0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5`  
> **Etherscan**: https://sepolia.etherscan.io/address/0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5  
> **Arquivo fonte**: `desafio-gut/contracts/Leilao.sol`  
> **Deploy**: Hardhat Ignition, 2026-04-28. `coordenacao = deployer`.

---

## Constantes

| Nome | Valor | Descrição |
|------|-------|-----------|
| `MAX_LANCES_UNICOS` | `10_000` | Limite de valores únicos por edição (proteção anti-DoS em `apurarVencedor`) |

---

## Variáveis de Estado

### `coordenacao`
```solidity
address public coordenacao
```
Endereço com permissões administrativas. Único que pode chamar `abrirEdicao`, `adicionarSenhas`, e `iniciarTransferenciaCoordenacao`.

### `coordenacaoPendente`
```solidity
address public coordenacaoPendente
```
Endereço aguardando confirmação de transferência de coordenação (two-step transfer, mitigação M-02).

### `edicoes`
```solidity
mapping(string => Edicao) public edicoes
```
Mapeia `idEdicao` (ex: `"R-1"`) para a struct `Edicao`. IDs não podem ser reutilizados após criação.

```solidity
struct Edicao {
    string nome;
    bool ativa;
    uint256 prazo;               // timestamp Unix de encerramento
    uint256[] listaDeValores;    // valores únicos registrados
    mapping(uint256 => address) lances;    // valor → último lance
    mapping(uint256 => uint256) contagem;  // valor → total de lances
}
```

### `saldoSenhas`
```solidity
mapping(address => uint256) public saldoSenhas
```
Saldo de senhas de cada endereço. Cada senha = 1 lance. Decrementado por `darLance`, incrementado por `adicionarSenhas`.

---

## Funções — Leitura

### `apurarVencedor`
```solidity
function apurarVencedor(string memory idEdicao)
    public view
    returns (uint256 menorUnico, address ganhador)
```
Retorna o menor valor que aparece **exatamente 1 vez** na edição (Artigo VIII). Qualquer endereço pode chamar — é `view`.

- Se não há vencedor (todos os valores têm contagem ≠ 1), retorna `(type(uint256).max, address(0))`.

### `saldoSenhas` (getter automático)
```solidity
saldoSenhas(address usuario) → uint256
```
Getter gerado automaticamente pela variável pública. Retorna o saldo de senhas disponíveis.

### `edicoes` (getter automático)
```solidity
edicoes(string idEdicao) → (string nome, bool ativa, uint256 prazo)
```
Getter parcial (mappings internos não são expostos). Retorna metadados da edição.

---

## Funções — Escrita (qualquer endereço)

### `darLance`
```solidity
function darLance(string memory idEdicao, uint256 valorEmCentavos) public
```
Registra um lance na edição ativa. Consome 1 senha do `saldoSenhas[msg.sender]`.

**Requer**:
- `saldoSenhas[msg.sender] > 0` — sem senha, sem lance
- `valorEmCentavos >= 1` — mínimo R$ 0,01 (Artigo XXIII)
- `edicoes[idEdicao].ativa == true`
- `block.timestamp <= edicoes[idEdicao].prazo` — dentro do prazo
- Se valor novo: `listaDeValores.length < MAX_LANCES_UNICOS`

**Emite**: `LanceDado(idEdicao, lancador, valorEmCentavos, repetido, timestamp)`

### `aceitarTransferenciaCoordenacao`
```solidity
function aceitarTransferenciaCoordenacao() public
```
Conclui a transferência de coordenação iniciada. Só pode ser chamada por `coordenacaoPendente`.

---

## Funções — Escrita (somente `coordenacao`)

### `abrirEdicao`
```solidity
function abrirEdicao(
    string memory idEdicao,
    string memory nome,
    uint256 duracaoSegundos
) public apenasCoordenacao
```
Cria uma nova edição de leilão.

**Requer**: `edicoes[idEdicao].prazo == 0` — ID nunca usado antes (mitigação M-01).  
**Emite**: `EdicaoAberta(idEdicao, nome, prazo)`

### `adicionarSenhas`
```solidity
function adicionarSenhas(address usuario, uint256 quantidade) public apenasCoordenacao
```
Credita senhas ao usuário após confirmação de PIX (Artigos XVII e XXI). Chamado pelas Netlify Functions após aprovação do pagamento.  
**Emite**: `SenhasCreditadas(usuario, quantidade)`

### `iniciarTransferenciaCoordenacao`
```solidity
function iniciarTransferenciaCoordenacao(address novaCoordenacao) public apenasCoordenacao
```
Primeira etapa da transferência de coordenação (two-step, mitigação M-02). Requer endereço não-zero.  
**Emite**: `TransferenciaIniciada(novaCoordenacao)`

---

## Eventos

### `LanceDado`
```solidity
event LanceDado(
    string idEdicao,
    address indexed lancador,
    uint256 valorEmCentavos,
    bool repetido,
    uint256 timestamp
)
```
Emitido em cada lance. `repetido = true` quando o mesmo valor já havia sido registrado anteriormente.

### `EdicaoAberta`
```solidity
event EdicaoAberta(string idEdicao, string nome, uint256 prazo)
```
Emitido quando a coordenação cria uma nova edição.

### `SenhasCreditadas`
```solidity
event SenhasCreditadas(address indexed usuario, uint256 quantidade)
```
Emitido após crédito de senhas on-chain. O frontend escuta este evento via `AppContext.subscribeSaldoSenhas`.

### `TransferenciaIniciada`
```solidity
event TransferenciaIniciada(address indexed novaCoordenacao)
```
Emitido ao iniciar transferência de coordenação.

---

## Mitigações de Segurança

| ID | Descrição |
|----|-----------|
| H-01 | `MAX_LANCES_UNICOS = 10_000` — previne DoS no loop de `apurarVencedor` |
| M-01 | Reuse de ID bloqueado — `require(edicoes[idEdicao].prazo == 0)` |
| M-02 | Two-step coordinator transfer — evita perda permanente de coordenação por typo |
| M-03 | `apurarVencedor` é `view` e sem `apenasCoordenacao` — qualquer endereço pode verificar o vencedor |

---

## ABI Mínimo (uso no frontend)

```json
[
  { "type": "function", "name": "darLance",      "stateMutability": "nonpayable", "inputs": [{"name":"idEdicao","type":"string"},{"name":"valorEmCentavos","type":"uint256"}], "outputs": [] },
  { "type": "function", "name": "apurarVencedor","stateMutability": "view",       "inputs": [{"name":"idEdicao","type":"string"}], "outputs": [{"name":"","type":"uint256"},{"name":"","type":"address"}] },
  { "type": "function", "name": "saldoSenhas",   "stateMutability": "view",       "inputs": [{"name":"","type":"address"}], "outputs": [{"name":"","type":"uint256"}] },
  { "type": "function", "name": "coordenacao",   "stateMutability": "view",       "inputs": [], "outputs": [{"name":"","type":"address"}] },
  { "type": "function", "name": "abrirEdicao",   "stateMutability": "nonpayable", "inputs": [{"name":"idEdicao","type":"string"},{"name":"nome","type":"string"},{"name":"duracaoSegundos","type":"uint256"}], "outputs": [] },
  { "type": "function", "name": "adicionarSenhas","stateMutability": "nonpayable","inputs": [{"name":"usuario","type":"address"},{"name":"quantidade","type":"uint256"}], "outputs": [] },
  { "type": "function", "name": "edicoes",       "stateMutability": "view",       "inputs": [{"name":"","type":"string"}], "outputs": [{"name":"nome","type":"string"},{"name":"ativa","type":"bool"},{"name":"prazo","type":"uint256"}] },
  { "type": "event",    "name": "LanceDado",     "inputs": [{"name":"idEdicao","type":"string","indexed":false},{"name":"lancador","type":"address","indexed":true},{"name":"valorEmCentavos","type":"uint256","indexed":false},{"name":"repetido","type":"bool","indexed":false},{"name":"timestamp","type":"uint256","indexed":false}] },
  { "type": "event",    "name": "SenhasCreditadas","inputs": [{"name":"usuario","type":"address","indexed":true},{"name":"quantidade","type":"uint256","indexed":false}] },
  { "type": "event",    "name": "EdicaoAberta",  "inputs": [{"name":"idEdicao","type":"string","indexed":false},{"name":"nome","type":"string","indexed":false},{"name":"prazo","type":"uint256","indexed":false}] }
]
```
