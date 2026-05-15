# Socket.dev — Setup

## O que é?
Socket.dev escaneia dependências npm em busca de malware, typosquatting,
protestware, telemetria oculta e outros riscos de supply chain.

## Como obter API key gratuita
1. Acesse https://socket.dev
2. Cadastre-se (GitHub login)
3. Plano gratuito cobre times pequenos
4. Vá em Settings → API Keys → Generate
5. Adicione como secret no GitHub:
   Settings → Secrets and variables → Actions → New repository secret
   Nome: `SOCKET_SECURITY_TOKEN`
   Valor: <sua-api-key>

## Uso no CI
O job `socket-security` em `.github/workflows/security-scan.yml` usa a
GitHub Action oficial `socket-security/github-actions@v0`.
Config: `fail-on: critical,high`.
Se encontrar ameaças critical/high, falha o build e bloqueia o merge.
