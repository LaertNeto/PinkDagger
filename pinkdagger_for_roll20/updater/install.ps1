# PinkDagger - instala (ou remove) o auxiliar de atualizacao.
#
# Uso normal: dois cliques em instalar.bat / desinstalar.bat, dentro da pasta
# updater da extensao. O ID da extensao e descoberto sozinho; se o navegador
# recusar o auxiliar, rode de novo passando o ID mostrado na janela de
# atualizacao:  instalar.bat -ExtensionId abcdefghijklmnopabcdefghijklmnop

param(
    [string[]]$ExtensionId = @(),
    [string]$ExtensionDir,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

$HostName = 'com.pinkdagger.updater'
$ExtensionName = 'PinkDagger for Roll20'
$FirefoxExtensionId = 'pinkdagger@laertneto'
$InstallDir = Join-Path $env:LOCALAPPDATA 'PinkDagger\updater'

$ChromiumRegistryRoots = @(
    'HKCU:\Software\Google\Chrome\NativeMessagingHosts',
    'HKCU:\Software\Chromium\NativeMessagingHosts',
    'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts',
    'HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts'
)
$FirefoxRegistryRoot = 'HKCU:\Software\Mozilla\NativeMessagingHosts'

$BrowserUserDataDirs = @(
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data'),
    (Join-Path $env:LOCALAPPDATA 'Chromium\User Data'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\User Data'),
    (Join-Path $env:LOCALAPPDATA 'BraveSoftware\Brave-Browser\User Data')
)

function Write-Utf8File([string]$path, [string]$content) {
    [IO.File]::WriteAllText($path, $content, (New-Object Text.UTF8Encoding $false))
}

# Mesmo calculo do Chromium para extensoes sem compactacao: SHA-256 do caminho
# absoluto (UTF-16LE, letra do drive maiuscula), 16 primeiros bytes em hex,
# com os digitos 0-f trocados pelas letras a-p.
function Get-UnpackedExtensionId([string]$path) {
    if ($path -match '^[a-zA-Z]:') {
        $path = $path.Substring(0, 1).ToUpper() + $path.Substring(1)
    }
    $sha = [Security.Cryptography.SHA256]::Create()
    $hash = $sha.ComputeHash([Text.Encoding]::Unicode.GetBytes($path))
    $chars = foreach ($b in $hash[0..15]) {
        [char](97 + ($b -shr 4))
        [char](97 + ($b -band 15))
    }
    return (-join $chars)
}

# Procura nos perfis dos navegadores qual ID foi dado a esta pasta.
function Find-ExtensionIdsInProfiles([string]$dir) {
    $found = New-Object System.Collections.Generic.List[string]
    Add-Type -AssemblyName System.Web.Extensions
    $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
    $serializer.MaxJsonLength = [int]::MaxValue

    foreach ($userData in $BrowserUserDataDirs) {
        if (-not (Test-Path -LiteralPath $userData)) { continue }
        foreach ($profileDir in Get-ChildItem -LiteralPath $userData -Directory) {
            foreach ($prefsName in @('Secure Preferences', 'Preferences')) {
                $prefsPath = Join-Path $profileDir.FullName $prefsName
                if (-not (Test-Path -LiteralPath $prefsPath)) { continue }
                try {
                    $prefs = $serializer.DeserializeObject([IO.File]::ReadAllText($prefsPath))
                    if (-not $prefs.ContainsKey('extensions')) { continue }
                    $extensions = $prefs['extensions']
                    if (-not $extensions.ContainsKey('settings')) { continue }
                    foreach ($entry in $extensions['settings'].GetEnumerator()) {
                        $settings = $entry.Value
                        if ($settings -isnot [System.Collections.IDictionary]) { continue }
                        if (-not $settings.ContainsKey('path')) { continue }
                        if (([string]$settings['path']).TrimEnd('\') -eq $dir) {
                            $found.Add($entry.Key)
                        }
                    }
                } catch {
                    # Arquivo bloqueado ou em formato inesperado: segue para o proximo.
                }
            }
        }
    }
    return $found
}

function Remove-Updater {
    foreach ($root in $ChromiumRegistryRoots + $FirefoxRegistryRoot) {
        $key = Join-Path $root $HostName
        if (Test-Path -LiteralPath $key) { Remove-Item -LiteralPath $key -Recurse -Force }
    }
    if (Test-Path -LiteralPath $InstallDir) { Remove-Item -LiteralPath $InstallDir -Recurse -Force }
}

if ($Uninstall) {
    Remove-Updater
    Write-Host ''
    Write-Host 'Auxiliar de atualizacao do PinkDagger removido.' -ForegroundColor Green
    exit 0
}

if (-not $ExtensionDir) { $ExtensionDir = Split-Path -Parent $PSScriptRoot }
$ExtensionDir = (Resolve-Path -LiteralPath $ExtensionDir).ProviderPath.TrimEnd('\')

$manifestPath = Join-Path $ExtensionDir 'manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath) -or
    (Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json).name -ne $ExtensionName) {
    Write-Host "Nao encontrei o PinkDagger em: $ExtensionDir" -ForegroundColor Red
    Write-Host 'Rode o instalar.bat que fica dentro da pasta updater da extensao.'
    exit 1
}

$ids = New-Object System.Collections.Generic.List[string]
foreach ($id in $ExtensionId) { $ids.Add($id.Trim().ToLower()) }
$ids.Add((Get-UnpackedExtensionId $ExtensionDir))
foreach ($id in Find-ExtensionIdsInProfiles $ExtensionDir) { $ids.Add($id) }
$ids = @($ids | Where-Object { $_ -match '^[a-p]{32}$' } | Select-Object -Unique)

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
foreach ($file in @('host.ps1', 'host.bat')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination (Join-Path $InstallDir $file) -Force
}
$hostBat = Join-Path $InstallDir 'host.bat'

Write-Utf8File (Join-Path $InstallDir 'config.json') (@{ extensionDir = $ExtensionDir } | ConvertTo-Json)

$chromiumManifestPath = Join-Path $InstallDir "$HostName.json"
Write-Utf8File $chromiumManifestPath (@{
    name = $HostName
    description = 'PinkDagger - auxiliar de atualizacao'
    path = $hostBat
    type = 'stdio'
    allowed_origins = @($ids | ForEach-Object { "chrome-extension://$_/" })
} | ConvertTo-Json)

$firefoxManifestPath = Join-Path $InstallDir "$HostName.firefox.json"
Write-Utf8File $firefoxManifestPath (@{
    name = $HostName
    description = 'PinkDagger - auxiliar de atualizacao'
    path = $hostBat
    type = 'stdio'
    allowed_extensions = @($FirefoxExtensionId)
} | ConvertTo-Json)

foreach ($root in $ChromiumRegistryRoots) {
    New-Item -Path (Join-Path $root $HostName) -Value $chromiumManifestPath -Force | Out-Null
}
New-Item -Path (Join-Path $FirefoxRegistryRoot $HostName) -Value $firefoxManifestPath -Force | Out-Null

Write-Host ''
Write-Host 'Auxiliar de atualizacao do PinkDagger instalado!' -ForegroundColor Green
Write-Host "  Pasta da extensao: $ExtensionDir"
Write-Host "  IDs autorizados:   $($ids -join ', ')"
Write-Host ''
Write-Host 'Agora recarregue a extensao em chrome://extensions (ou edge://extensions) uma vez'
Write-Host 'e use: botao direito no icone do PinkDagger > Verificar atualizacoes.'

$dirInfo = Get-Item -LiteralPath $ExtensionDir
while ($dirInfo) {
    if (Test-Path -LiteralPath (Join-Path $dirInfo.FullName '.git')) {
        Write-Host ''
        Write-Host 'Aviso: esta pasta esta dentro de um repositorio git. O auxiliar nao vai' -ForegroundColor Yellow
        Write-Host 'sobrescrever os arquivos aqui; use git pull para atualizar.' -ForegroundColor Yellow
        break
    }
    $dirInfo = $dirInfo.Parent
}
