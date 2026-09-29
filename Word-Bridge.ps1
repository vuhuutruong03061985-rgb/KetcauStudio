param([int]$Port=18765,[switch]$NoBrowser)
$ErrorActionPreference='Stop'
$templatePath=Join-Path $PSScriptRoot 'data/templates.json'
[void][IO.Directory]::CreateDirectory((Split-Path $templatePath))
function Read-TemplateStore {
 if(Test-Path -LiteralPath $templatePath){$raw=[IO.File]::ReadAllText($templatePath)}else{$raw='[]'}
 $entries=ConvertFrom-Json -InputObject $raw
 $hash=[Security.Cryptography.SHA256]::Create()
 try {$revision=[Convert]::ToBase64String($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($raw)))}finally{$hash.Dispose()}
 return @{entries=@($entries);revision=$revision}
}
$token=[Guid]::NewGuid().ToString('N')
$listener=[Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
try {$listener.Start()} catch {
 if($NoBrowser){throw}
 try {
  $existing=Invoke-RestMethod -Uri "http://localhost:$Port/open" -TimeoutSec 3
  if($existing.ok){exit 0}
 } catch {}
 Add-Type -AssemblyName System.Windows.Forms
 [void][Windows.Forms.MessageBox]::Show('Cannot start Word connection. Close the previous connection and retry.','Ket Cau Studio')
 exit 1
}
if(-not $NoBrowser){Start-Process "http://localhost:$Port/"}
Write-Host 'Ket Cau Studio - Word bridge. Keep this window open. Ctrl+C to stop.'
try {
 while($listener.IsListening){
  $ctx=$listener.GetContext();$response=$ctx.Response
  try {
   $path=$ctx.Request.Url.AbsolutePath
   if($ctx.Request.HttpMethod -eq 'GET' -and $path -eq '/open'){
    Start-Process "http://localhost:$Port/"
    $response.ContentType='application/json'
    $bytes=[Text.Encoding]::UTF8.GetBytes('{"ok":true}')
   } elseif($ctx.Request.HttpMethod -eq 'GET' -and $path -eq '/bridge-info'){
    $response.ContentType='application/json; charset=utf-8'
    $response.Headers['Cache-Control']='no-store'
    $bytes=[Text.Encoding]::UTF8.GetBytes((@{token=$token}|ConvertTo-Json -Compress))
   } elseif($path -eq '/templates' -and $ctx.Request.HttpMethod -in @('GET','POST')){
    if($ctx.Request.Headers['X-Studio-Token'] -ne $token){throw 'Invalid connection token.'}
    $store=Read-TemplateStore
    if($ctx.Request.HttpMethod -eq 'POST'){
     if($ctx.Request.ContentLength64 -lt 0 -or $ctx.Request.ContentLength64 -gt 20000000){throw 'Template library too large.'}
     $reader=[IO.StreamReader]::new($ctx.Request.InputStream)
     try {$payload=ConvertFrom-Json -InputObject $reader.ReadToEnd()}finally{$reader.Dispose()}
     if($payload.revision -ne $store.revision){$response.StatusCode=409;throw 'Library changed. Reload before saving.'}
     if($payload.entries -isnot [Array]){throw 'Invalid template list.'}
     foreach($entry in $payload.entries){if(-not $entry.id -or -not $entry.name -or $null -eq $entry.items){throw 'Invalid template.'}}
     $json=ConvertTo-Json -InputObject @($payload.entries) -Depth 100
     $temporary=$templatePath+'.'+[Guid]::NewGuid().ToString('N')+'.tmp'
     try {
      [IO.File]::WriteAllText($temporary,$json,[Text.UTF8Encoding]::new($false))
      if(Test-Path -LiteralPath $templatePath){[IO.File]::Replace($temporary,$templatePath,$templatePath+'.bak')}else{[IO.File]::Move($temporary,$templatePath)}
     }finally{if(Test-Path -LiteralPath $temporary){[IO.File]::Delete($temporary)}}
     $store=Read-TemplateStore
    }
    $response.ContentType='application/json; charset=utf-8';$response.Headers['Cache-Control']='no-store'
    $bytes=[Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $store -Depth 100 -Compress))
   } elseif($ctx.Request.HttpMethod -eq 'GET' -and $path -in @('/','/index.html','/index.updated.html','/assets/app.css','/assets/app.js','/assets/tablet.js','/assets/calculator.js','/assets/section.js','/assets/icon.svg','/assets/icon-192.png','/assets/icon-512.png','/manifest.webmanifest','/sw.js')){
    $relative=if($path -eq '/'){'index.html'}else{$path.TrimStart('/')}
    $types=@{'.html'='text/html; charset=utf-8';'.css'='text/css; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.svg'='image/svg+xml';'.png'='image/png';'.webmanifest'='application/manifest+json'}
    $response.ContentType=$types[[IO.Path]::GetExtension($relative)]
    $response.Headers['Cache-Control']='no-cache'
    $bytes=[IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $relative))
   } elseif($ctx.Request.HttpMethod -eq 'POST' -and $path -eq '/insert-word'){
    if($ctx.Request.Headers['X-Studio-Token'] -ne $token){throw 'Invalid connection token.'}
    if($ctx.Request.ContentLength64 -gt 20000000){throw 'Image exceeds size limit.'}
    $reader=[IO.StreamReader]::new($ctx.Request.InputStream)
    $body=$reader.ReadToEnd();$reader.Dispose()
    $data=$body | ConvertFrom-Json
    $imageBytes=[Convert]::FromBase64String($data.png)
    if($imageBytes.Length -lt 24 -or [BitConverter]::ToString($imageBytes[0..7]) -ne '89-50-4E-47-0D-0A-1A-0A'){throw 'Invalid PNG image.'}
    $word=[Runtime.InteropServices.Marshal]::GetActiveObject('Word.Application')
    if($word.Documents.Count -eq 0){throw 'Open a Word document and place the text cursor first.'}
    $range=$word.Selection.Range.Duplicate
    $range.Collapse(1)
    $temp=Join-Path ([IO.Path]::GetTempPath()) ('ketcau-'+[Guid]::NewGuid().ToString('N')+'.png')
    try {
     Add-Type -AssemblyName System.Drawing
     $stream=[IO.MemoryStream]::new($imageBytes,$false)
     $source=$null;$bitmap=$null;$graphics=$null
     try {
      $source=[Drawing.Image]::FromStream($stream)
      if($source.Width -gt 4000 -or $source.Height -gt 4001){throw 'Image dimensions exceed limit.'}
      $bitmap=[Drawing.Bitmap]::new($source.Width,$source.Height)
      $bitmap.SetResolution(600,600)
      $graphics=[Drawing.Graphics]::FromImage($bitmap)
      $graphics.Clear([Drawing.Color]::White)
      # Explicit pixel rectangles prevent DPI conversion from enlarging and cropping the image.
      $pixelRect=[Drawing.Rectangle]::new(0,0,$source.Width,$source.Height)
      $graphics.DrawImage($source,$pixelRect,0,0,$source.Width,$source.Height,[Drawing.GraphicsUnit]::Pixel)
      $bitmap.Save($temp,[Drawing.Imaging.ImageFormat]::Png)
      $widthPt=$source.Width*72.0/600
      $heightPt=$source.Height*72.0/600
     } finally {
      if($graphics){$graphics.Dispose()};if($bitmap){$bitmap.Dispose()};if($source){$source.Dispose()};$stream.Dispose()
     }
     $shape=$range.InlineShapes.AddPicture($temp,$false,$true)
     $shape.LockAspectRatio=0
     $shape.Width=$widthPt
     $shape.Height=$heightPt
     $shape.LockAspectRatio=-1
     $end=$shape.Range.Duplicate;$end.Collapse(0);$end.Select()
     $word.Activate()
    } finally {if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force}}
    $response.ContentType='application/json; charset=utf-8'
    $bytes=[Text.Encoding]::UTF8.GetBytes('{"ok":true}')
   }else{$response.StatusCode=404;$bytes=[Text.Encoding]::UTF8.GetBytes('Not found')}
  }catch{
   if($response.StatusCode -ne 409){$response.StatusCode=400};$response.ContentType='application/json; charset=utf-8'
   $bytes=[Text.Encoding]::UTF8.GetBytes((@{error=$_.Exception.Message}|ConvertTo-Json -Compress))
  }
  try{$response.OutputStream.Write($bytes,0,$bytes.Length)}finally{$response.Close()}
 }
}finally{$listener.Stop();$listener.Close()}
