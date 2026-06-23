<#
.SYNOPSIS
  Testa o token do Mercado Pago (producao/sandbox) criando uma cobranca PIX real
  via POST /v1/payments -- com o MESMO payload corrigido no MC39.13
  (payer.identification + X-Idempotency-Key dinamico).

  NOTA: script propositadamente ASCII-only. PowerShell 5.1 le arquivos UTF-8 sem
  BOM como ANSI e corromperia acentos/simbolos (ver memoria utf8-mangling).

.DESCRIPTION
  Use este script para isolar a causa do erro 502 (pix_provider_indisponivel):
  fala DIRETO com a API do Mercado Pago, sem passar pela Netlify Function, e
  imprime a resposta detalhada (sucesso ou o erro exato do MP).

  Interpretacao rapida do resultado:
    - HTTP 201 + transaction_data.qr_code                  -> token OK, conta homologada. [OK]
    - 400 "...without key enabled for QR render"           -> falta CADASTRAR CHAVE PIX na conta MP.
    - 401 / 403                                            -> token invalido/sem permissao (verificar APP_USR-).
    - 400 sobre "identification" / "payer"                 -> ajustar -Cpf / -IdType.
    - 403 "not homologated" / conta nao verificada         -> concluir KYC no painel MP.

.PARAMETER Token
  Access Token do Mercado Pago (APP_USR-... producao, TEST-... sandbox).
  Se omitido, le de $env:MP_ACCESS_TOKEN. NUNCA e impresso por completo (so o prefixo).

.PARAMETER Valor
  Valor em BRL. Padrao: 2.00 (1 ficha). Em producao isso gera uma cobranca REAL.

.PARAMETER Cpf
  CPF (11 dig.) ou CNPJ (14 dig.) do pagador. So digitos sao usados. Costuma ser
  exigido em producao homologada. Pode vir de $env:MP_PAYER_ID_NUMBER.

.PARAMETER IdType
  Tipo do documento: CPF ou CNPJ. Padrao: inferido pelo tamanho (11->CPF, 14->CNPJ).

.PARAMETER Email
  E-mail do pagador (placeholder aceito). Padrao: pagador@desafiogut.com.br.

.EXAMPLE
  # Producao (token via env -- recomendado, nao fica no historico do shell):
  $env:MP_ACCESS_TOKEN = "APP_USR-xxxx"
  ./scripts/test-mp-token.ps1 -Cpf "12345678909"

.EXAMPLE
  ./scripts/test-mp-token.ps1 -Token "APP_USR-xxxx" -Cpf "12345678909" -Valor 2.00
#>
[CmdletBinding()]
param(
  [string]$Token  = $env:MP_ACCESS_TOKEN,
  [double]$Valor  = 2.00,
  [string]$Cpf    = $env:MP_PAYER_ID_NUMBER,
  [string]$IdType,
  [string]$Email  = "pagador@desafiogut.com.br"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Token)) {
  Write-Error "Token ausente. Passe -Token ou defina `$env:MP_ACCESS_TOKEN (R9: nunca hardcode o token)."
  exit 1
}

# --- Mascarar o token nos logs (R10/R14): so o prefixo ---
$tokenPrefix = if ($Token.Length -ge 8) { $Token.Substring(0, 8) } else { $Token.Substring(0, [Math]::Min(4, $Token.Length)) }
if     ($Token.StartsWith("APP_USR-")) { $ambiente = "PRODUCAO (dinheiro real)" }
elseif ($Token.StartsWith("TEST-"))    { $ambiente = "SANDBOX" }
else                                    { $ambiente = "DESCONHECIDO (prefixo inesperado)" }

# --- Normalizar documento (so digitos) ---
$docDigits = if ($Cpf) { ($Cpf -replace '\D','') } else { $null }
if ($docDigits -and -not $IdType) {
  if ($docDigits.Length -eq 14) { $IdType = "CNPJ" } else { $IdType = "CPF" }
}

# --- IDs dinamicos (UUID v4): external_reference + X-Idempotency-Key ---
$pedidoId = [guid]::NewGuid().ToString()

# --- Montar payload (identico ao mercadopago.mjs do MC39.13) ---
$payer = @{ email = $Email }
if ($docDigits) {
  $payer.identification = @{ type = $IdType.ToUpper(); number = $docDigits }
}
$payload = @{
  transaction_amount = [double]$Valor
  description        = "DesafioGUT - teste $pedidoId"
  payment_method_id  = "pix"
  external_reference = $pedidoId
  payer              = $payer
}
$bodyJson = $payload | ConvertTo-Json -Depth 6

$headers = @{
  "Authorization"     = "Bearer $Token"
  "Content-Type"      = "application/json"
  "X-Idempotency-Key" = $pedidoId
}

Write-Host "------------------------------------------------"
Write-Host " Mercado Pago - teste de token (MC39.13)"
Write-Host " Token   : $tokenPrefix... ($ambiente)"
Write-Host (" Valor   : R$ {0}" -f $Valor.ToString('0.00'))
if ($docDigits) {
  $tail = if ($docDigits.Length -ge 2) { $docDigits.Substring($docDigits.Length - 2) } else { $docDigits }
  Write-Host " Doc     : $IdType ****$tail"
} else {
  Write-Host " Doc     : (nenhum - pode falhar em producao homologada)"
}
Write-Host " PedidoId: $pedidoId"
Write-Host "------------------------------------------------"

try {
  $resp = Invoke-RestMethod -Method Post -Uri "https://api.mercadopago.com/v1/payments" -Headers $headers -Body $bodyJson
  $qr = $resp.point_of_interaction.transaction_data.qr_code
  Write-Host ""
  Write-Host "[OK] SUCESSO - pagamento criado" -ForegroundColor Green
  Write-Host " payment id : $($resp.id)"
  Write-Host " status     : $($resp.status) / $($resp.status_detail)"
  if ($qr) {
    Write-Host " qr_code    : presente ($($qr.Length) chars)"
    Write-Host ""
    Write-Host " PIX copia-e-cola:"
    Write-Host " $qr" -ForegroundColor Yellow
  } else {
    Write-Host " qr_code    : AUSENTE - verificar chave PIX na conta MP"
  }
}
catch {
  Write-Host ""
  Write-Host "[FALHA] erro na chamada ao Mercado Pago" -ForegroundColor Red
  $r = $_.Exception.Response
  if ($r) {
    try {
      $reader = New-Object System.IO.StreamReader($r.GetResponseStream())
      $detalhe = $reader.ReadToEnd()
      Write-Host (" HTTP   : {0} {1}" -f [int]$r.StatusCode, $r.StatusCode)
      Write-Host " corpo  : $detalhe" -ForegroundColor Red
    } catch {
      Write-Host " (nao foi possivel ler o corpo do erro)"
    }
  } else {
    Write-Host " erro: $($_.Exception.Message)" -ForegroundColor Red
  }
  exit 1
}
