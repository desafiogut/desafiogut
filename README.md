# DesafioGUT

Plataforma brasileira de leilão de **menor lance único** — o menor valor que aparece exatamente 1 vez vence o prêmio.

**App**: https://silly-stardust-ca71bc.netlify.app  
**Rede**: Ethereum Sepolia Testnet  
**Contrato**: `0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5`

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite 8 + Tailwind CSS v4 |
| Auth + Wallet | Privy (Google / E-mail / Apple) — sem extensão, sem seed phrase |
| Blockchain | Ethers.js v6 + Sepolia Testnet |
| Deploy | Netlify (auto-deploy em push para `main`) |
| Backend | Netlify Functions + Netlify Blobs |

## Estrutura

```
desafio-gut/
├── contracts/       ← LeilaoGUT.sol (Solidity ^0.8.0)
└── frontend/
    ├── netlify/
    │   └── functions/   ← iniciar-pagamento, confirmar-pagamento, webhook-mercadopago
    └── src/
        ├── components/  ← CardLance, TabelaLances, ComprarFichasModal, TermosConsentimento
        ├── context/     ← AppContext (estado global: lances, saldo, auth)
        ├── entities/    ← modelos de domínio (lance, edicao)
        ├── features/    ← features FSD (auth, lance, comprar-fichas)
        ├── widgets/     ← Layout, BottomNav, Sidebar, Toast
        └── pages/       ← Configuracoes
docs/                ← Documentação Diataxis + análises técnicas
```

## Documentação

Ver [docs/SUMARIO.md](docs/SUMARIO.md) para índice completo.

- **Tutoriais**: como fazer seu primeiro lance
- **How-To Guides**: comprar senhas, verificar saldo
- **Reference**: ABI do contrato, variáveis de ambiente
- **Explanation**: regras de negócio, hierarquia de tiers, fluxo de pagamento

## Desenvolvimento local

```bash
cd desafio-gut/frontend
npm install
# Criar .env.local com VITE_PRIVY_APP_ID e VITE_CONTRATO_SEPOLIA
npm run dev
```

## Deploy

Push para `main` → Netlify auto-deploy. Variáveis de ambiente no painel Netlify:
- `VITE_PRIVY_APP_ID`, `VITE_CONTRATO_SEPOLIA`, `VITE_ALCHEMY_URL`
- `PIX_PROVIDER=mercadopago`, `MP_ACCESS_TOKEN`, `JWT_SECRET`
