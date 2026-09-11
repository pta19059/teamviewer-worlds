$ErrorActionPreference = 'Stop'
$repoOwner = 'pta19059'
$repoName = 'teamviewer-worlds'
$repo = "$repoOwner/$repoName"
$root = Split-Path -Parent $PSScriptRoot

Set-Location -LiteralPath $root
if (-not (Test-Path -LiteralPath '.git')) {
  git init
  git branch -M main
}

git add .gitignore README.md index.html package.json START.cmd src public docs scripts tests
if (-not (git config user.name)) { git config user.name $repoOwner }
if (-not (git config user.email)) { git config user.email "$repoOwner@users.noreply.github.com" }
$hasCommit = (git rev-parse --verify HEAD 2>$null)
if (-not $hasCommit) {
  git commit -m 'Publish TeamViewer Worlds'
} else {
  git commit -m 'Update TeamViewer Worlds' 2>$null
}

gh repo view $repo 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  gh repo create $repo --public --source . --remote origin --push
} else {
  $remote = git remote get-url origin 2>$null
  if (-not $remote) { git remote add origin "https://github.com/$repo.git" }
  git push -u origin main
}

gh api "repos/$repo/pages" 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  gh api --method POST "repos/$repo/pages" -f build_type=legacy -f "source[branch]=main" -f "source[path]=/docs"
} else {
  gh api --method PUT "repos/$repo/pages" -f "source[branch]=main" -f "source[path]=/docs"
}

Write-Host ''
Write-Host 'GitHub Page published at:' -ForegroundColor Green
gh api "repos/$repo/pages" --jq .html_url
