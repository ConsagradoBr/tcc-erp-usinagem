param(
    [string]$Version = "v1.0.0"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$releaseName = "AMP-Usinagem-Industrial-$Version"
$releaseDir = Join-Path $root "release\$releaseName"
$exeSource = Join-Path $root "dist\AMP Usinagem Industrial.exe"
$zipPath = Join-Path $root "release\$releaseName.zip"
$readmeSource = Join-Path $root "release\AMP-Usinagem-Industrial-v1.0.0\LEIA-ME.txt"
$readmeDestino = Join-Path $releaseDir "LEIA-ME.txt"

if (-not (Test-Path $exeSource)) {
    throw "Executavel nao encontrado em $exeSource. Gere o build desktop antes de preparar a release."
}

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
Copy-Item $exeSource (Join-Path $releaseDir "AMP Usinagem Industrial.exe") -Force

if (Test-Path $readmeSource) {
    $sourcePath = (Resolve-Path $readmeSource).Path
    if ($sourcePath -ne $readmeDestino) {
        Copy-Item $readmeSource $readmeDestino -Force
    }
}

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $releaseDir "*") -DestinationPath $zipPath -Force

Write-Host "Release pronta: $releaseDir"
Write-Host "Pacote zip: $zipPath"
Write-Host "Publique esses arquivos na tela de GitHub Releases junto com a tag $Version"
