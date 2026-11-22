# Installs orchestrator-dashboard without git and without a GitHub account (the repository is public).
# Download, check, read, then run (do not pipe it into iex):
#   irm https://raw.githubusercontent.com/Zeldious-Studio-Company/orchestrator-dashboard/v1.0.0/install.ps1 -OutFile install.ps1
#   Get-Content install.ps1
#   .\install.ps1
# Options (environment variables):
#   ORCH_DASHBOARD_REF      tag or branch to install (default: v1.0.0, a fixed release, not main)
#   ORCH_DASHBOARD_SHA256   expected SHA256 of the downloaded archive; the install stops on mismatch
#   ORCH_DASHBOARD_DIR      install folder (default: %LOCALAPPDATA%\orchestrator-dashboard)
#   ORCH_DASHBOARD_ADD_PATH set to 1 to add the launcher folder to your user PATH (off by default)
& {
  $ErrorActionPreference = 'Stop'
  $ProgressPreference = 'SilentlyContinue'
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

  $repo = 'Zeldious-Studio-Company/orchestrator-dashboard'
  $ref = if ($env:ORCH_DASHBOARD_REF) { $env:ORCH_DASHBOARD_REF } else { 'v1.0.0' }
  $dir = if ($env:ORCH_DASHBOARD_DIR) { $env:ORCH_DASHBOARD_DIR } else { Join-Path $env:LOCALAPPDATA 'orchestrator-dashboard' }
  $sha256 = if ($env:ORCH_DASHBOARD_SHA256) { $env:ORCH_DASHBOARD_SHA256.Trim().ToUpperInvariant() } else { '' }

  # An install is a folder with server.cjs and a package.json named "orchestrator-dashboard".
  function Test-Install([string]$p) {
    if (-not (Test-Path -LiteralPath (Join-Path $p 'server.cjs')) -or -not (Test-Path -LiteralPath (Join-Path $p 'package.json'))) { return $false }
    try { return ((Get-Content -LiteralPath (Join-Path $p 'package.json') -Raw | ConvertFrom-Json).name -eq 'orchestrator-dashboard') } catch { return $false }
  }

  if ($ref -notmatch '^[A-Za-z0-9._/-]+$' -or $ref -match '\.\.') { throw "Invalid ORCH_DASHBOARD_REF '$ref'." }
  if ($sha256 -and $sha256 -notmatch '^[0-9A-F]{64}$') { throw 'ORCH_DASHBOARD_SHA256 must be a 64-character hex SHA256.' }

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
    if ($sha256) {
      $actual = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash
      if ($actual -ne $sha256) { throw "SHA256 mismatch (expected $sha256, got $actual). Nothing was installed." }
      Write-Host 'SHA256 verified.'
    }
    Expand-Archive -Path $zip -DestinationPath (Join-Path $tmp 'x')
    $src = Get-ChildItem (Join-Path $tmp 'x') -Directory | Select-Object -First 1
    if (-not $src -or -not (Test-Install $src.FullName)) { throw 'Unexpected archive content.' }

    # Refuse to replace a folder that is not an orchestrator-dashboard install, since it is deleted below.
    # This check runs before the old server is stopped, so a server.cjs that is not ours is never executed.
    $full = [IO.Path]::GetFullPath($dir).TrimEnd('\')
    if ($full -eq [IO.Path]::GetPathRoot($full).TrimEnd('\') -or $full -eq $env:USERPROFILE.TrimEnd('\')) { throw "Refusing to use $full as the install folder." }
    if (Test-Path -LiteralPath $dir) {
      if (-not (Test-Install $dir)) { throw "Refusing to replace $dir: it is not an orchestrator-dashboard install (no server.cjs and package.json named orchestrator-dashboard). Remove it yourself or set ORCH_DASHBOARD_DIR." }
      # Stop a running server from a previous install before replacing its files.
      try { & node (Join-Path $dir 'server.cjs') stop *> $null } catch {}
      Remove-Item -LiteralPath $dir -Recurse -Force
    }
    New-Item -ItemType Directory -Path (Split-Path $dir) -Force | Out-Null
    Move-Item $src.FullName $dir
  } finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  }

  $bin = Join-Path $dir 'bin'
  New-Item -ItemType Directory -Path $bin -Force | Out-Null
  Set-Content -Path (Join-Path $bin 'orchestrator-dashboard.cmd') -Encoding ASCII -Value "@node `"$dir\server.cjs`" %*"

  if ($env:ORCH_DASHBOARD_ADD_PATH -eq '1') {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (-not (($userPath -split ';') -contains $bin)) {
      $newPath = if ($userPath) { $userPath.TrimEnd(';') + ';' + $bin } else { $bin }
      [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
      Write-Host "Added $bin to your user PATH (open a new terminal to use it)."
    }
    if (-not (($env:Path -split ';') -contains $bin)) { $env:Path = "$env:Path;$bin" }
  } else {
    Write-Host "Not added to your PATH (nothing was changed). To add it, rerun with `$env:ORCH_DASHBOARD_ADD_PATH = '1'."
  }

  Write-Host "Installed in $dir"
  Write-Host ('Command: ' + (Join-Path $bin 'orchestrator-dashboard.cmd'))
  Write-Host "Try: orchestrator-dashboard start `"$dir\examples`""
}
