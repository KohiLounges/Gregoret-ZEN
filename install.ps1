# Instala Gregoret-ZEN en Zen Browser (Windows).
# Uso (PowerShell):  powershell -ExecutionPolicy Bypass -File .\install.ps1
# Copia el CSS y los scripts a tu perfil de Zen, y el cargador de scripts a la
# carpeta de instalación de Zen (esa parte pide permiso de administrador).

$ErrorActionPreference = "Stop"
$repo = $PSScriptRoot

# --- 1) Perfil de Zen (el que está marcado como predeterminado en profiles.ini) ---
$zenData = Join-Path $env:APPDATA "zen"
$ini = Join-Path $zenData "profiles.ini"
if (-not (Test-Path $ini)) { throw "No encontré Zen. ¿Lo abriste al menos una vez? ($ini)" }

$profilePath = $null
$lines = Get-Content $ini
# Preferir el perfil por defecto de la instalación ([Install...] Default=)
$installDefault = ($lines | Where-Object { $_ -match '^Default=Profiles/' } | Select-Object -First 1)
if ($installDefault) { $profilePath = Join-Path $zenData ($installDefault -replace '^Default=', '') }
if (-not $profilePath -or -not (Test-Path $profilePath)) {
  $first = Get-ChildItem (Join-Path $zenData "Profiles") -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $profilePath = $first.FullName
}
$profilePath = $profilePath -replace '/', '\'
Write-Host "Perfil de Zen: $profilePath"

# --- 2) Cerrar Zen (si está abierto pisa los archivos al cerrarse) ---
if (Get-Process zen -ErrorAction SilentlyContinue) {
  Write-Host "Cerrando Zen..."
  Get-Process zen | ForEach-Object { $_.CloseMainWindow() | Out-Null }
  Start-Sleep 5
  Get-Process zen -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# --- 3) CSS + scripts al perfil (guardando lo que hubiera antes) ---
$chrome = Join-Path $profilePath "chrome"
if (Test-Path $chrome) {
  $backup = "$chrome-backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
  Copy-Item $chrome $backup -Recurse
  Write-Host "Tu carpeta chrome anterior quedó en: $backup"
}
New-Item -ItemType Directory -Force (Join-Path $chrome "JS") | Out-Null
Copy-Item (Join-Path $repo "chrome\userChrome.css") (Join-Path $chrome "userChrome.css") -Force
Copy-Item (Join-Path $repo "chrome\JS\*.uc.js") (Join-Path $chrome "JS") -Force

# --- 4) Preferencias (user.js): se agregan sin borrar las que ya tengas ---
$userJs = Join-Path $profilePath "user.js"
$ours = Get-Content (Join-Path $repo "user.js") -Encoding UTF8
$existing = if (Test-Path $userJs) { Get-Content $userJs -Encoding UTF8 } else { @() }
$merged = $existing + ($ours | Where-Object { $_ -notin $existing })
Set-Content -Path $userJs -Value $merged -Encoding UTF8

# --- 5) Cargador de scripts en la carpeta de Zen (necesita administrador) ---
$zenExe = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\zen.exe" -ErrorAction SilentlyContinue).'(default)'
$zenDir = if ($zenExe) { Split-Path $zenExe } else { "C:\Program Files\Zen Browser" }
if (-not (Test-Path (Join-Path $zenDir "zen.exe"))) { throw "No encontré zen.exe en $zenDir" }
$cfgSrc = Join-Path $repo "install-dir\config.js"
$prefSrc = Join-Path $repo "install-dir\defaults\pref\autoconfig.js"
$cmd = "Copy-Item -LiteralPath '$cfgSrc' -Destination '$zenDir\config.js' -Force; " +
       "Copy-Item -LiteralPath '$prefSrc' -Destination '$zenDir\defaults\pref\autoconfig.js' -Force"
Write-Host "Copiando el cargador de scripts a $zenDir (Windows va a pedir permiso)..."
Start-Process powershell -Verb RunAs -Wait -ArgumentList "-NoProfile -Command `"$cmd`""

if (-not (Test-Path (Join-Path $zenDir "config.js"))) {
  Write-Warning "No se copió el cargador (¿rechazaste el permiso?). El CSS funciona igual, pero sin los scripts las pestañas titilan y no se pueden arrastrar."
} else {
  Write-Host "Listo. Abrí Zen."
}
