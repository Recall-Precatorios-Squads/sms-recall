# Preparação do Windows do mini PC para o sms-recall. Rode no PowerShell COMO ADMINISTRADOR:
#   powershell -ExecutionPolicy Bypass -File C:\sms-recall-instalador\windows.ps1
$ErrorActionPreference = 'Stop'
$porta = 3000

Write-Host "1/3 Rede do WSL espelhada (os outros PCs enxergam a porta $porta)"
$cfg = "$env:USERPROFILE\.wslconfig"
if ((Test-Path $cfg) -and (Select-String -Path $cfg -Pattern 'networkingMode' -Quiet)) {
  Write-Host "   .wslconfig ja tem networkingMode: mantido."
} else {
  Add-Content -Path $cfg -Encoding ascii -Value "[wsl2]`r`nnetworkingMode=mirrored"
  Write-Host "   .wslconfig atualizado."
}

Write-Host "2/3 Firewall: liberando a porta $porta na rede interna"
if (-not (Get-NetFirewallRule -DisplayName "sms-recall $porta" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName "sms-recall $porta" -Direction Inbound -Protocol TCP -LocalPort $porta -Action Allow -Profile Private,Domain | Out-Null
}
try {
  if (-not (Get-NetFirewallHyperVRule -Name "sms-recall-$porta" -ErrorAction SilentlyContinue)) {
    New-NetFirewallHyperVRule -Name "sms-recall-$porta" -DisplayName "sms-recall $porta (WSL)" -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts $porta | Out-Null
  }
} catch { Write-Host "   (regra Hyper-V nao disponivel neste Windows; seguindo)" }

Write-Host "3/3 Tarefa agendada: ligar o Ubuntu (e a aplicacao) quando este usuario entrar no Windows"
# Em PC de dominio, tarefa "sem login" (senha guardada ou S4U) costuma ser bloqueada pela politica da empresa.
# Por isso a tarefa roda ao fazer logon. Para voltar sozinho apos queda de energia, ligue o login automatico do Windows.
$usuario = (whoami)
$principal = New-ScheduledTaskPrincipal -UserId $usuario -LogonType Interactive -RunLevel Limited
$acao = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-WindowStyle Hidden -Command "wsl.exe -d Ubuntu-24.04 -u root -- sleep infinity"'
$gatilho = New-ScheduledTaskTrigger -AtLogOn -User $usuario
$ajustes = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "sms-recall (WSL)" -Action $acao -Trigger $gatilho -Settings $ajustes -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName "sms-recall (WSL)"
Write-Host "   Tarefa criada para $usuario e iniciada."

Write-Host ""
Write-Host "Pronto. Se a rede espelhada foi ativada agora, rode:  wsl --shutdown  e abra o Ubuntu de novo."
Write-Host "Depois abra o Ubuntu e rode:  bash /mnt/c/sms-recall-instalador/instalar.sh"
