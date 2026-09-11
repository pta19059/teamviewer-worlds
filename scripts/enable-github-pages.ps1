$ErrorActionPreference = 'Continue'
$repo = 'pta19059/teamviewer-worlds'
$log = Join-Path (Split-Path -Parent $PSScriptRoot) 'github-pages-output.txt'
gh api --method POST "repos/$repo/pages" -f build_type=legacy -f "source[branch]=main" -f "source[path]=/docs" 2>&1 | Tee-Object -FilePath $log
gh api "repos/$repo/pages" --jq .html_url 2>&1 | Tee-Object -FilePath $log -Append
Read-Host 'GitHub Pages configuration complete. Press Enter to close'
