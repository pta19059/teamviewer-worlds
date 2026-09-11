$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
git config user.name 'pta19059'
git config user.email 'pta19059@users.noreply.github.com'
git add .gitignore README.md index.html package.json START.cmd src public docs scripts tests
git commit -m 'Publish TeamViewer Worlds'
git log -1 --oneline
Read-Host 'Commit complete. Press Enter to close'
