$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$output=Join-Path $root 'dist'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$files=@('index.html','manifest.webmanifest','sw.js','assets') | ForEach-Object { Join-Path $root $_ }
Compress-Archive -LiteralPath $files -DestinationPath (Join-Path $output 'KetCauStudio-web.zip') -Force
Write-Output (Join-Path $output 'KetCauStudio-web.zip')
