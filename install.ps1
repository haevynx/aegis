# aegis installer (Windows PowerShell) — https://github.com/nvdhai2003mobiledev/aegis
#
#   irm https://raw.githubusercontent.com/nvdhai2003mobiledev/aegis/main/install.ps1 | iex
#
# Biến môi trường: AEGIS_VERSION (mặc định: bản release mới nhất; hoặc tag / main), AEGIS_HOME (mặc định ~\.aegis), AEGIS_SOURCE_DIR (cài từ thư mục local).
# Không cần quyền admin. Không sửa PATH hệ thống.
$ErrorActionPreference = 'Stop'

$Repo = 'nvdhai2003mobiledev/aegis'
$Ref = if ($env:AEGIS_VERSION) { $env:AEGIS_VERSION } else { 'latest' }
if (-not $env:AEGIS_HOME) { $env:AEGIS_HOME = Join-Path $HOME '.aegis' }

function Fail($msg) { Write-Host "aegis: $msg" -ForegroundColor Red; exit 1 }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'cần Node.js >= 18 — https://nodejs.org' }
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)'
if ($LASTEXITCODE -ne 0) { Fail "cần Node.js >= 18 (đang có $(node --version))" }

$tmp = Join-Path ([IO.Path]::GetTempPath()) ("aegis-" + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  if ($env:AEGIS_SOURCE_DIR) {
    $src = $env:AEGIS_SOURCE_DIR
    Write-Host "aegis: cài từ thư mục local: $src"
  } else {
    if ($Ref -eq 'latest') {
      try { $Ref = (Invoke-RestMethod -UseBasicParsing -Uri "https://api.github.com/repos/$Repo/releases/latest").tag_name } catch { $Ref = $null }
      if (-not $Ref) { $Ref = 'main'; Write-Host 'aegis: không lấy được bản release mới nhất (giới hạn API?) — dùng nhánh main' }
    }
    $url = "https://codeload.github.com/$Repo/zip/$Ref"
    Write-Host "aegis: tải $Repo@$Ref"
    $zip = Join-Path $tmp 'aegis.zip'
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $tmp -Force
    $src = (Get-ChildItem -Path $tmp -Directory | Select-Object -First 1).FullName
  }
  if (-not (Test-Path (Join-Path $src 'bin/aegis.mjs'))) { Fail 'gói tải về không hợp lệ (thiếu bin/aegis.mjs)' }
  node (Join-Path $src 'bin/aegis.mjs') install @args
  if ($LASTEXITCODE -ne 0) { Fail 'cài đặt thất bại' }
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

$bin = Join-Path $env:AEGIS_HOME 'bin'
if (-not (($env:Path -split ';') -contains $bin)) {
  Write-Host ''
  Write-Host 'Thêm aegis vào PATH của user (chạy một lần, rồi mở terminal mới):' -ForegroundColor Cyan
  Write-Host "  [Environment]::SetEnvironmentVariable('Path', `"$bin;`" + [Environment]::GetEnvironmentVariable('Path', 'User'), 'User')" -ForegroundColor Green
}
Write-Host ''
Write-Host 'aegis đã sẵn sàng. Chạy "aegis doctor" trong thư mục project để xem bước tiếp theo.' -ForegroundColor Green
