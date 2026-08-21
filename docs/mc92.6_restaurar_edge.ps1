# MC92.6-S0 — restaura a janela do Microsoft Edge (hwnd 197508) p/ leitura
# via computer_use (janela minimizada nao expoe o viewport ao driver).
# Metodo validado: ShowWindow(SW_RESTORE=9) + SetForegroundWindow.
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
$hwnd = [IntPtr]197508
[Win32]::ShowWindow($hwnd, 9) | Out-Null
Start-Sleep -Milliseconds 400
[Win32]::SetForegroundWindow($hwnd) | Out-Null
Write-Output "Edge restaurado (hwnd 197508)"
