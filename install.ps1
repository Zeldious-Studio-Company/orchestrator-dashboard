# Installs orchestrator-dashboard without git and without a GitHub account (the repository is public).
#   irm https://raw.githubusercontent.com/Zeldious-Studio-Company/orchestrator-dashboard/main/install.ps1 | iex
# Options (environment variables):
#   ORCH_DASHBOARD_REF   branch or tag to install (default: main)
#   ORCH_DASHBOARD_DIR   install folder (default: %LOCALAPPDATA%\orchestrator-dashboard)
& {
  $ErrorActionPreference = 'Stop'
  $ProgressPreference = 'SilentlyContinue'
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

  $repo = 'Zeldious-Studio-Company/orchestrator-dashboard'
  $ref = if ($env:ORCH_DASHBOARD_REF) { $env:ORCH_DASHBOARD_REF } else { 'main' }
  $dir = if ($env:ORCH_DASHBOARD_DIR) { $env:ORCH_DASHBOARD_DIR } else { Join-Path $env:LOCALAPPDATA 'orchestrator-dashboard' }

  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) { throw 'Node.js 18+ is required (https://nodejs.org).' }
  $major = [int](& node -p 'process.versions.node.split(String.fromCharCode(46))[0]')
  if ($major -lt 18) { throw "Node.js 18+ is required (found $(& node -v))." }

  $kind = if ($ref -match '^v\d') { 'tags' } else { 'heads' }
  $url = "https://codeload.github.com/$repo/zip/refs/$kind/$ref"
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ('orch-dash-' + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $tmp | Out-Null
  try {
    Write-Host "Downloading $repo@$ref..."
    $zip = Join-Path $tmp 'src.zip'
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath (Join-Path $tmp 'x')
    $src = Get-ChildItem (Join-Path $tmp 'x') -Directory | Select-Object -First 1
    if (-not $src -or -not (Test-Path (Join-Path $src.FullName 'server.cjs'))) { throw 'Unexpected archive content.' }

    # Stop a running server from a previous install before replacing its files.
    $old = Join-Path $dir 'server.cjs'
    if (Test-Path $old) { try { & node $old stop *> $null } catch {} }
    if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
    New-Item -ItemType Directory -Path (Split-Path $dir) -Force | Out-Null
    Move-Item $src.FullName $dir
  } finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  }

  $bin = Join-Path $dir 'bin'
  New-Item -ItemType Directory -Path $bin -Force | Out-Null
  Set-Content -Path (Join-Path $bin 'orchestrator-dashboard.cmd') -Encoding ASCII -Value "@node `"$dir\server.cjs`" %*"

  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if (-not (($userPath -split ';') -contains $bin)) {
    $newPath = if ($userPath) { $userPath.TrimEnd(';') + ';' + $bin } else { $bin }
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    Write-Host "Added $bin to your user PATH (open a new terminal to use it)."
  }
  if (-not (($env:Path -split ';') -contains $bin)) { $env:Path = "$env:Path;$bin" }

  Write-Host "Installed in $dir"
  Write-Host "Try: orchestrator-dashboard start `"$dir\examples`""
}
