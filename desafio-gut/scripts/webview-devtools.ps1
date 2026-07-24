# webview-devtools.ps1 — abre o túnel CDP para o WebView do app Android.
#
# Porque existe: o socket de um WebView do Capacitor chama-se
#   webview_devtools_remote_<PID>
# e NAO `chrome_devtools_remote` (esse e do navegador Chrome). Como o PID muda a
# cada arranque do app, o nome do socket muda tambem — e um comando com o PID
# fixo (ou com o nome errado) falha de forma que parece "depuracao desativada".
# Este script descobre o PID e monta o tunel sozinho.
#
# Uso:
#   .\webview-devtools.ps1                    # usa com.desafiogut.app na porta 9333
#   .\webview-devtools.ps1 -Porta 9444
#   .\webview-devtools.ps1 -Pacote com.outro.app
#
# Requisitos: dispositivo com depuracao USB autorizada e um build DEBUGGABLE do app.

param(
  [string]$Pacote = "com.desafiogut.app",
  [int]$Porta = 9333,
  [switch]$Reiniciar    # forca o restart do app antes de ligar
)

$ErrorActionPreference = "Stop"
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) { throw "adb nao encontrado em $adb" }

# 1. Dispositivo presente?
$devs = & $adb devices | Select-String -Pattern "\sdevice$"
if (-not $devs) { throw "Nenhum dispositivo autorizado. Ligue o cabo e aceite a depuracao USB no ecra." }
Write-Host "Dispositivo: $(($devs[0] -split '\s+')[0])" -ForegroundColor Green

# 2. App a correr? (o socket so existe com o processo vivo)
if ($Reiniciar) {
  & $adb shell am force-stop $Pacote
  & $adb shell monkey -p $Pacote -c android.intent.category.LAUNCHER 1 | Out-Null
  Start-Sleep -Seconds 6
}
$appPid = (& $adb shell pidof $Pacote)
if ($appPid) { $appPid = $appPid.Trim().Split()[0] }
if (-not $appPid) {
  Write-Host "App nao esta a correr. A arrancar..." -ForegroundColor Yellow
  & $adb shell monkey -p $Pacote -c android.intent.category.LAUNCHER 1 | Out-Null
  Start-Sleep -Seconds 6
  $appPid = (& $adb shell pidof $Pacote)
  if ($appPid) { $appPid = $appPid.Trim().Split()[0] }
  if (-not $appPid) { throw "Nao consegui arrancar $Pacote." }
}
Write-Host "PID: $appPid" -ForegroundColor Green

# 3. O socket do WebView existe? (prova de que o build e depuravel)
$socket = "webview_devtools_remote_$appPid"
$existe = & $adb shell cat /proc/net/unix | Select-String $socket
if (-not $existe) {
  Write-Host "Socket '$socket' NAO existe." -ForegroundColor Red
  $flags = & $adb shell dumpsys package $Pacote | Select-String "flags=\[" | Select-Object -First 1
  Write-Host "  flags do pacote: $flags"
  throw "O build instalado provavelmente nao e DEBUGGABLE. Instale o APK debug (assembleDebug)."
}

# 4. Tunel
& $adb forward --remove-all | Out-Null
& $adb forward "tcp:$Porta" "localabstract:$socket" | Out-Null

# 5. Confirmar
Start-Sleep -Seconds 1
try {
  $r = Invoke-WebRequest "http://localhost:$Porta/json/list" -UseBasicParsing -TimeoutSec 8
  $paginas = $r.Content | ConvertFrom-Json
  Write-Host "`nDevTools ativo em http://localhost:$Porta" -ForegroundColor Green
  foreach ($p in $paginas) {
    Write-Host "  titulo : $($p.title)"
    Write-Host "  url    : $($p.url)"
    Write-Host "  ws     : $($p.webSocketDebuggerUrl)"
  }
  Write-Host "`nInspecionar no browser:" -ForegroundColor Cyan
  Write-Host "  http://localhost:$Porta/json/list      (alvos em JSON)"
  Write-Host "  chrome://inspect                       (marcar 'Discover USB devices')"
} catch {
  Write-Host "Tunel montado mas /json/list nao respondeu: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Verifique se o app continua em primeiro plano (o WebView tem de estar vivo)."
}
