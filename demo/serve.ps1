# Локальный сервер для показа: 3D-тур в корне сайта, прототип двойника в /twin/.
# Работает на любой Windows 10/11 без установки Node, Python и Docker.
# Запуск — двойной щелчок по ZAPUSK.bat (или: powershell -ExecutionPolicy Bypass -File serve.ps1).

param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'site'
if (-not (Test-Path (Join-Path $root 'index.html'))) {
  Write-Host "Не найдена папка site рядом со скриптом: $root" -ForegroundColor Red
  exit 1
}

$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.svg' = 'image/svg+xml'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.webp' = 'image/webp'; '.ico' = 'image/x-icon'
  '.glb' = 'model/gltf-binary'; '.gltf' = 'model/gltf+json'; '.mp4' = 'video/mp4'; '.webm' = 'video/webm'
  '.woff' = 'font/woff'; '.woff2' = 'font/woff2'; '.txt' = 'text/plain; charset=utf-8'; '.pdf' = 'application/pdf'
}

# первый свободный порт из диапазона
$listener = $null
foreach ($p in 8765..8785) {
  try {
    $l = New-Object System.Net.HttpListener
    $l.Prefixes.Add("http://localhost:$p/")
    $l.Start()
    $listener = $l; $port = $p; break
  } catch { }
}
if (-not $listener) { Write-Host 'Не удалось занять порт 8765-8785.' -ForegroundColor Red; exit 1 }

$base = "http://localhost:$port"
Write-Host ''
Write-Host '  Цифровой двойник и 3D-тур завода — сервер запущен' -ForegroundColor Green
Write-Host "  Двойник (дашборд + тур во фрейме):  $base/twin/"
Write-Host "  3D-тур отдельно:                     $base/"
Write-Host "  Демо-вход руководителя: manager@demo.ru / demo1234"
Write-Host ''
Write-Host '  Чтобы остановить — закройте это окно.' -ForegroundColor Yellow
if (-not $NoBrowser) { Start-Process "$base/twin/" }

$rootFull = [System.IO.Path]::GetFullPath($root)
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq '/twin') { $res.Redirect("$base/twin/"); $res.Close(); continue }
    $rel = $path.TrimStart('/').Replace('/', '\')
    $file = [System.IO.Path]::GetFullPath((Join-Path $rootFull $rel))
    if (-not $file.StartsWith($rootFull)) { $res.StatusCode = 403; $res.Close(); continue }
    if (Test-Path $file -PathType Container) { $file = Join-Path $file 'index.html' }
    if (-not (Test-Path $file -PathType Leaf)) {
      # адреса страниц тура (/tour, /dashboard, …) отдаёт index.html — роутинг на стороне браузера
      $ext = [System.IO.Path]::GetExtension($file)
      if ($ext -eq '' -and -not $path.StartsWith('/twin/')) { $file = Join-Path $rootFull 'index.html' }
      else { $res.StatusCode = 404; $res.Close(); continue }
    }
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
    $res.AddHeader('Cache-Control', 'no-cache')
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    try { $res.StatusCode = 500 } catch { }
  } finally {
    try { $res.Close() } catch { }
  }
}
