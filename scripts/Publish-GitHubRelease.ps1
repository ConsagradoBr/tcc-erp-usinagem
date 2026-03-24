param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [string]$Repo = "ConsagradoBr/tcc-erp-usinagem",

    [string]$TargetCommitish = "main"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$releaseName = "AMP-Usinagem-Industrial-$Version"
$exePath = Join-Path $root "release\$releaseName.exe"
$zipPath = Join-Path $root "release\$releaseName.zip"

if (-not (Test-Path $exePath)) {
    throw "Executavel versionado nao encontrado em $exePath. Rode o Prepare-GitHubRelease primeiro."
}

if (-not (Test-Path $zipPath)) {
    throw "Pacote zip nao encontrado em $zipPath. Rode o Prepare-GitHubRelease primeiro."
}

$releaseNotes = @"
## Destaques
- shell desktop com visual mais moderno, clean e mais proximo de um app nativo premium
- lint do frontend zerado
- acessibilidade dos formularios revisada
- build desktop consolidado com script dedicado
- cobertura de testes ampliada

## Arquivos
- $([IO.Path]::GetFileName($exePath))
- $([IO.Path]::GetFileName($zipPath))
"@

git rev-parse --verify $Version *> $null
if ($LASTEXITCODE -ne 0) {
    git tag -a $Version -m "Release $Version"
}

git push origin $Version

$cred = "protocol=https`nhost=github.com`n" | git credential fill
$username = (($cred | Select-String '^username=').Line -replace '^username=', '')
$password = (($cred | Select-String '^password=').Line -replace '^password=', '')

if (-not $username -or -not $password) {
    throw "Nao foi possivel obter credenciais do GitHub via git credential fill."
}

$basic = [Convert]::ToBase64String(
    [Text.Encoding]::ASCII.GetBytes("${username}:${password}")
)

$headers = @{
    Authorization = "Basic $basic"
    Accept = "application/vnd.github+json"
    "User-Agent" = "Codex"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$releasePayload = @{
    tag_name = $Version
    target_commitish = $TargetCommitish
    name = $Version
    body = $releaseNotes
    draft = $true
    prerelease = $false
    make_latest = "true"
} | ConvertTo-Json -Depth 5

$release = Invoke-RestMethod `
    -Method Post `
    -Uri "https://api.github.com/repos/$Repo/releases" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $releasePayload

$uploadBase = "https://uploads.github.com/repos/$Repo/releases/$($release.id)/assets"
foreach ($asset in @($exePath, $zipPath)) {
    $assetName = [IO.Path]::GetFileName($asset)
    $uploadUri = "$uploadBase?name=$([Uri]::EscapeDataString($assetName))"
    Invoke-WebRequest `
        -Method Post `
        -Uri $uploadUri `
        -Headers $headers `
        -ContentType "application/octet-stream" `
        -InFile $asset | Out-Null
}

$publishPayload = @{
    draft = $false
    name = $Version
    make_latest = "true"
} | ConvertTo-Json -Depth 3

$published = Invoke-RestMethod `
    -Method Patch `
    -Uri "https://api.github.com/repos/$Repo/releases/$($release.id)" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $publishPayload

Write-Host "Release publicada: $($published.html_url)"
