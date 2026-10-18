# Kete Loom installer for Windows PowerShell.
#
#   irm https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.ps1 | iex
#
# Uses the Node CLI when Node 18+ is available; otherwise copies every skill
# into $HOME\.agents\skills and $HOME\.claude\skills.
$ErrorActionPreference = 'Stop'
$Repo = if ($env:KETE_LOOM_REPO) { $env:KETE_LOOM_REPO } else { 'https://github.com/Kete-org/kete-loom.git' }
$Ref  = if ($env:KETE_LOOM_REF)  { $env:KETE_LOOM_REF }  else { 'main' }

if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot 'bin/kete-loom.js'))) {
  $Src = $PSScriptRoot
} else {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'kete-loom: git is required' }
  $Src = Join-Path ([IO.Path]::GetTempPath()) ("kete-loom-" + [guid]::NewGuid())
  git clone --quiet --depth 1 --branch $Ref $Repo $Src
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node -and [int](node -p "process.versions.node.split('.')[0]") -ge 18) {
  $cliArgs = if ($args.Count -gt 0) { $args } else { @('install') }
  node (Join-Path $Src 'bin/kete-loom.js') @cliArgs
  exit $LASTEXITCODE
}

Write-Host 'kete-loom: Node 18+ not found, using basic copy install (no filters).'
foreach ($dest in @("$HOME\.agents\skills", "$HOME\.claude\skills")) {
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  foreach ($skill in Get-ChildItem -Directory (Join-Path $Src 'skills')) {
    $target = Join-Path $dest $skill.Name
    if ((Test-Path $target) -and -not (Test-Path (Join-Path $target '.kete-loom.json'))) {
      Write-Host "skipped   $($skill.Name) (exists, not installed by kete-loom)"; continue
    }
    if (Test-Path $target) { Remove-Item -Recurse -Force $target }
    Copy-Item -Recurse $skill.FullName $target
    Remove-Item -Recurse -Force (Join-Path $target 'evals') -ErrorAction SilentlyContinue
    "{ `"source`": `"kete-loom`", `"skill`": `"$($skill.Name)`" }" | Set-Content (Join-Path $target '.kete-loom.json')
    Write-Host "installed $($skill.Name) -> $target"
  }
}
Write-Host 'Restart your agent so it picks up the new skills.'
