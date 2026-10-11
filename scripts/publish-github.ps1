# Upload only the review branch. No main overwrite or published release.
param([string]$Repository='NOVA-New-Tab',[string]$Branch='dev/nova-3.0',[switch]$CreateDraftRelease)
$ErrorActionPreference='Stop'
if($Repository -notmatch '^[A-Za-z0-9_.-]+$' -or $Branch -notmatch '^[A-Za-z0-9_./-]+$'){throw 'Invalid repository or branch name.'}
if($Branch -in @('main','master')){throw 'Use a review branch. This script does not publish directly to main.'}
$root=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
if(-not(Test-Path -LiteralPath 'manifest.json')){throw 'Run from the official source or github-ready folder.'}
function Run-Checked([string]$Executable,[string[]]$Arguments){& $Executable @Arguments;if($LASTEXITCODE -ne 0){throw "$Executable failed; no force push is used."}}
foreach($tool in @('git','gh')){if(-not(Get-Command $tool -ErrorAction SilentlyContinue)){throw "Install $tool from its official website first."}}
Run-Checked 'gh' @('auth','status')
$account=& gh api user --jq .login
if($LASTEXITCODE -ne 0 -or $account -ine 'xtufa7'){throw 'Sign in to xtufa7 first using gh auth login.'}
$repo="xtufa7/$Repository"
if(-not(Test-Path -LiteralPath '.git')){
 Run-Checked 'git' @('init','-b',$Branch)
 Run-Checked 'git' @('remote','add','origin',"https://github.com/$repo.git")
 $remoteMain=& git ls-remote --heads origin main
 if($LASTEXITCODE -ne 0){throw 'Cannot read the repository. No upload was performed.'}
 if($remoteMain){
  Run-Checked 'git' @('fetch','origin','main')
  Run-Checked 'git' @('reset','--mixed','FETCH_HEAD')
  $previousAssets=& git ls-tree -r --name-only FETCH_HEAD -- release-assets
  if($LASTEXITCODE -ne 0){throw 'Cannot inspect earlier release assets.'}
  foreach($asset in $previousAssets){if($asset -and -not(Test-Path -LiteralPath $asset)){Run-Checked 'git' @('restore','--source=FETCH_HEAD','--worktree','--',$asset)}}
 }
}
$remote=& git remote get-url origin
if($remote -notmatch ('github.com[:/]'+[regex]::Escape($repo)+'(\.git)?$')){throw 'Origin differs from the selected repository. Review it manually.'}
$current=& git branch --show-current
if($current -ne $Branch){Run-Checked 'git' @('switch','-c',$Branch)}
Run-Checked 'git' @('add','--all')
Run-Checked 'git' @('add','--force','dist','dist-firefox')
$releaseVersion=(Get-Content -LiteralPath 'manifest.json' -Raw -Encoding UTF8|ConvertFrom-Json).version
if($releaseVersion -notmatch '^\d+\.\d+\.\d+$'){throw 'Invalid release version.'}
$releaseAssets=@(Get-ChildItem -LiteralPath 'release-assets' -File -ErrorAction SilentlyContinue|Where-Object{$_.Name -like "NOVA-$releaseVersion-*" -and $_.Extension -in @('.zip','.xpi') -and $_.Name -notlike '*github-ready*'}|ForEach-Object{$_.FullName})
if($releaseAssets.Count){Run-Checked 'git' (@('add','--force','--')+$releaseAssets)}
& git diff --cached --quiet
if($LASTEXITCODE -eq 1){Run-Checked 'git' @('commit','-m','Prepare NOVA 3.0 for review')}elseif($LASTEXITCODE -ne 0){throw 'Cannot inspect staged changes.'}
Run-Checked 'git' @('push','-u','origin',$Branch)
Write-Output "Review branch: https://github.com/$repo/tree/$Branch"
Write-Output 'Create and review a pull request before merging into main.'
if($CreateDraftRelease){$version=(Get-Content -LiteralPath 'manifest.json' -Raw -Encoding UTF8|ConvertFrom-Json).version;$assets=@(Get-ChildItem -LiteralPath 'release-assets' -File|Where-Object{$_.Name -like "NOVA-$version-*"}|ForEach-Object{$_.FullName});Run-Checked 'gh' (@('release','create',"v$version",'--repo',$repo,'--target',$Branch,'--draft','--title',"NOVA $version",'--notes-file','RELEASE_NOTES.md')+$assets);Write-Output 'Draft release created. It is not published.'}
Write-Output "After review/merge: irm 'https://raw.githubusercontent.com/$repo/main/setup.ps1' | iex"
