@echo off
title ResumeForge Local Server
color 0A
echo.
echo  ============================================
echo   ResumeForge Local Server - Port 8080
echo  ============================================
echo.
echo  Starting server...
echo  Open your browser at: http://localhost:8080
echo.
echo  Press Ctrl+C to stop the server.
echo.

:: Register URL (requires first-time admin - skip if already done)
netsh http add urlacl url="http://localhost:8080/" user=Everyone >nul 2>&1

:: Run the PowerShell server inline
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
"$listener = New-Object System.Net.HttpListener; ^
$listener.Prefixes.Add('http://localhost:8080/'); ^
try { $listener.Start() } catch { Write-Host 'ERROR: Could not start server. Try running as Administrator.' -ForegroundColor Red; pause; exit }; ^
Write-Host ' Server running at http://localhost:8080' -ForegroundColor Green; ^
Write-Host ' Press Ctrl+C to stop.' -ForegroundColor Yellow; ^
$root = 'c:\Users\rajni\OneDrive\Desktop\Final Resume Builder\Code'; ^
while ($listener.IsListening) { ^
  try { ^
    $ctx = $listener.GetContext(); ^
    $req = $ctx.Request; ^
    $res = $ctx.Response; ^
    $path = $req.Url.LocalPath.TrimStart('/'); ^
    if ([string]::IsNullOrEmpty($path) -or $path -eq '/') { $path = 'index.html' }; ^
    $file = Join-Path $root $path; ^
    if (Test-Path $file -PathType Leaf) { ^
      $ext = [System.IO.Path]::GetExtension($file); ^
      $mime = switch($ext) { '.html' {'text/html; charset=utf-8'} '.css' {'text/css'} '.js' {'application/javascript'} '.png' {'image/png'} '.jpg' {'image/jpeg'} '.gif' {'image/gif'} '.svg' {'image/svg+xml'} '.ico' {'image/x-icon'} default {'application/octet-stream'} }; ^
      $res.ContentType = $mime; ^
      $res.Headers.Add('Access-Control-Allow-Origin', '*'); ^
      $bytes = [System.IO.File]::ReadAllBytes($file); ^
      $res.ContentLength64 = $bytes.Length; ^
      $res.OutputStream.Write($bytes, 0, $bytes.Length) ^
    } else { ^
      $res.StatusCode = 404; ^
      $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found'); ^
      $res.ContentLength64 = $body.Length; ^
      $res.OutputStream.Write($body, 0, $body.Length) ^
    }; ^
    $res.OutputStream.Close() ^
  } catch [System.Net.HttpListenerException] { ^
    if ($_.Exception.ErrorCode -ne 995) { Write-Host 'Listener error:' $_ } ^
  } catch { } ^
}"

pause
