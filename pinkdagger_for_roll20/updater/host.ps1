# PinkDagger - auxiliar de atualizacao (native messaging host).
#
# O navegador inicia este script via host.bat e conversa pelo stdin/stdout:
# cada mensagem e um inteiro de 4 bytes (little-endian) com o tamanho, seguido
# do JSON em UTF-8. NADA alem das respostas pode ir para o stdout, entao toda
# saida de comando e descartada com Out-Null / [void].
#
# Acoes aceitas:
#   { "action": "ping" }    -> confirma que o auxiliar esta instalado
#   { "action": "update" }  -> baixa a ultima release do GitHub e extrai por
#                              cima da pasta da extensao

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$HostVersion = '1.0.0'
$Repo = 'LaertNeto/PinkDagger'
$ExtensionName = 'PinkDagger for Roll20'
$InstallDir = $PSScriptRoot
$ConfigPath = Join-Path $InstallDir 'config.json'

function Read-NativeMessage {
    $stdin = [Console]::OpenStandardInput()
    $lengthBytes = New-Object byte[] 4
    $read = 0
    while ($read -lt 4) {
        $n = $stdin.Read($lengthBytes, $read, 4 - $read)
        if ($n -le 0) { return $null }
        $read += $n
    }
    $length = [BitConverter]::ToInt32($lengthBytes, 0)
    $buffer = New-Object byte[] $length
    $read = 0
    while ($read -lt $length) {
        $n = $stdin.Read($buffer, $read, $length - $read)
        if ($n -le 0) { return $null }
        $read += $n
    }
    return ([Text.Encoding]::UTF8.GetString($buffer) | ConvertFrom-Json)
}

function Send-NativeMessage($message) {
    $json = $message | ConvertTo-Json -Compress -Depth 5
    $bytes = (New-Object Text.UTF8Encoding $false).GetBytes($json)
    $stdout = [Console]::OpenStandardOutput()
    $stdout.Write([BitConverter]::GetBytes([int]$bytes.Length), 0, 4)
    $stdout.Write($bytes, 0, $bytes.Length)
    $stdout.Flush()
}

function Get-Config {
    if (-not (Test-Path -LiteralPath $ConfigPath)) {
        throw [System.Exception]::new('config_missing')
    }
    return (Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Get-ManifestVersion([string]$dir) {
    $manifestPath = Join-Path $dir 'manifest.json'
    if (-not (Test-Path -LiteralPath $manifestPath)) { return $null }
    $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($manifest.name -ne $ExtensionName) { return $null }
    return $manifest.version
}

# Quem desenvolve usa git: sobrescrever a pasta apagaria trabalho nao commitado.
function Test-InsideGitRepo([string]$dir) {
    $current = Get-Item -LiteralPath $dir
    while ($current) {
        if (Test-Path -LiteralPath (Join-Path $current.FullName '.git')) { return $true }
        $current = $current.Parent
    }
    return $false
}

function Copy-Tree([string]$source, [string]$destination) {
    $sourceRoot = (Get-Item -LiteralPath $source).FullName.TrimEnd('\')
    foreach ($file in Get-ChildItem -LiteralPath $sourceRoot -Recurse -File -Force) {
        $relative = $file.FullName.Substring($sourceRoot.Length + 1)
        $target = Join-Path $destination $relative
        $targetDir = Split-Path -Parent $target
        if (-not (Test-Path -LiteralPath $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item -LiteralPath $file.FullName -Destination $target -Force
    }
}

function Invoke-Update {
    $config = Get-Config
    $extensionDir = $config.extensionDir
    $previousVersion = Get-ManifestVersion $extensionDir
    if (-not $previousVersion) {
        return @{ ok = $false; error = 'extension_dir_invalid'; detail = $extensionDir }
    }
    if (Test-InsideGitRepo $extensionDir) {
        return @{ ok = $false; error = 'git_repo'; detail = $extensionDir }
    }

    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $headers = @{ 'User-Agent' = 'PinkDagger-Updater'; 'Accept' = 'application/vnd.github+json' }
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers $headers -UseBasicParsing

    # Um .zip anexado a release tem preferencia; senao usa o codigo-fonte da tag.
    $asset = $release.assets | Where-Object { $_.name -like '*.zip' } | Select-Object -First 1
    $zipUrl = if ($asset) { $asset.browser_download_url } else { $release.zipball_url }

    $workDir = Join-Path ([IO.Path]::GetTempPath()) ('pinkdagger-update-' + [Guid]::NewGuid().ToString('N'))
    $backupDir = Join-Path $InstallDir 'backup'
    New-Item -ItemType Directory -Path $workDir -Force | Out-Null
    try {
        $zipPath = Join-Path $workDir 'release.zip'
        $extractDir = Join-Path $workDir 'extracted'
        Invoke-WebRequest -Uri $zipUrl -Headers $headers -OutFile $zipPath -UseBasicParsing
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $extractDir)

        # A raiz da extensao e a pasta mais rasa com o manifest.json do PinkDagger.
        $newRoot = Get-ChildItem -LiteralPath $extractDir -Recurse -Filter 'manifest.json' -File |
            Where-Object { Get-ManifestVersion $_.DirectoryName } |
            Sort-Object { $_.FullName.Split('\').Count } |
            Select-Object -First 1
        if (-not $newRoot) {
            return @{ ok = $false; error = 'manifest_not_found'; detail = $zipUrl }
        }
        $newRootDir = $newRoot.DirectoryName
        $newVersion = Get-ManifestVersion $newRootDir

        if (Test-Path -LiteralPath $backupDir) { Remove-Item -LiteralPath $backupDir -Recurse -Force }
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        Copy-Tree $extensionDir $backupDir

        try {
            Copy-Tree $newRootDir $extensionDir
        } catch {
            Copy-Tree $backupDir $extensionDir
            throw
        }

        # Atualiza a copia instalada do proprio auxiliar (este script ja foi
        # lido inteiro pelo PowerShell, entao sobrescreve-lo agora e seguro).
        $newHost = Join-Path $newRootDir 'updater\host.ps1'
        if (Test-Path -LiteralPath $newHost) {
            Copy-Item -LiteralPath $newHost -Destination (Join-Path $InstallDir 'host.ps1') -Force
        }

        return @{
            ok = $true
            previousVersion = $previousVersion
            version = $newVersion
            tag = $release.tag_name
        }
    } finally {
        Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

try {
    $message = Read-NativeMessage
    if ($null -eq $message) { exit 0 }

    switch ($message.action) {
        'ping' {
            $config = Get-Config
            Send-NativeMessage @{
                ok = $true
                hostVersion = $HostVersion
                extensionDir = $config.extensionDir
                gitRepo = [bool](Test-InsideGitRepo $config.extensionDir)
            }
        }
        'update' {
            Send-NativeMessage (Invoke-Update)
        }
        default {
            Send-NativeMessage @{ ok = $false; error = 'unknown_action'; detail = [string]$message.action }
        }
    }
} catch {
    $code = if ($_.Exception.Message -eq 'config_missing') { 'config_missing' } else { 'exception' }
    Send-NativeMessage @{ ok = $false; error = $code; detail = $_.Exception.Message }
}
