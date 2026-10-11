# Official NOVA setup. Download only from https://github.com/xtufa7/NOVA-New-Tab
# Prepares browser packages; browser approval is required for local/unsigned extensions.
param(
 [ValidatePattern('^[A-Za-z0-9_.-]+$')][string]$Repository = 'NOVA-New-Tab',
 [ValidatePattern('^[A-Za-z0-9_./-]+$')][string]$Branch = 'main',
 [ValidateSet('all','chrome','chromium','helium','edge','brave','vivaldi','opera','opera-gx','firefox','zen')][string[]]$Browsers = @('all'),
 [string]$InstallRoot = $(Join-Path $env:LOCALAPPDATA 'NOVA\BrowserSetup'),
 [string]$ArchivePath = '',
 [string]$ExtensionId = $env:NOVA_EXTENSION_ID,
 [hashtable]$BrowserPaths = @{},
 [switch]$DryRun, [switch]$PrepareOnly, [switch]$SkipBridge, [switch]$NoOpenBrowser
)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'This setup is for Windows. Use the Chromium or Firefox package manually on other systems.' }
$root = [IO.Path]::GetFullPath($InstallRoot)
if ($root -eq [IO.Path]::GetPathRoot($root)) { throw 'Choose a dedicated NOVA folder.' }
$local = $env:LOCALAPPDATA; $roaming = $env:APPDATA
$programs = @($env:ProgramFiles, [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')) | Where-Object { $_ }
$definitions = @(
 @{Name='chrome'; Family='chromium'; App='chrome.exe'; Paths=@("$local\Google\Chrome\Application\chrome.exe") + @($programs | ForEach-Object { "$_\Google\Chrome\Application\chrome.exe" }); Profile="$local\Google\Chrome\User Data"},
 @{Name='chromium'; Family='chromium'; App='chromium.exe'; Paths=@("$local\Chromium\Application\chrome.exe"); Profile="$local\Chromium\User Data"},
 @{Name='helium'; Family='chromium'; App='chrome.exe'; Paths=@("$local\imput\Helium\Application\chrome.exe","$local\Helium\Application\chrome.exe"); Profile="$local\imput\Helium\User Data"},
 @{Name='edge'; Family='chromium'; App='msedge.exe'; Paths=@($programs | ForEach-Object { "$_\Microsoft\Edge\Application\msedge.exe" }); Profile="$local\Microsoft\Edge\User Data"},
 @{Name='brave'; Family='chromium'; App='brave.exe'; Paths=@("$local\BraveSoftware\Brave-Browser\Application\brave.exe") + @($programs | ForEach-Object { "$_\BraveSoftware\Brave-Browser\Application\brave.exe" }); Profile="$local\BraveSoftware\Brave-Browser\User Data"},
 @{Name='vivaldi'; Family='chromium'; App='vivaldi.exe'; Paths=@("$local\Vivaldi\Application\vivaldi.exe") + @($programs | ForEach-Object { "$_\Vivaldi\Application\vivaldi.exe" }); Profile="$local\Vivaldi\User Data"},
 @{Name='opera'; Family='chromium'; App='opera.exe'; Paths=@("$local\Programs\Opera\launcher.exe") + @($programs | ForEach-Object { "$_\Opera\launcher.exe" }); Profile="$roaming\Opera Software\Opera Stable"},
 @{Name='opera-gx'; Family='chromium'; App='opera.exe'; Paths=@("$local\Programs\Opera GX\launcher.exe") + @($programs | ForEach-Object { "$_\Opera GX\launcher.exe" }); Profile="$roaming\Opera Software\Opera GX Stable"},
 @{Name='firefox'; Family='firefox'; App='firefox.exe'; Paths=@($programs | ForEach-Object { "$_\Mozilla Firefox\firefox.exe" }); Profile="$roaming\Mozilla\Firefox"},
 @{Name='zen'; Family='firefox'; App='zen.exe'; Paths=@($programs | ForEach-Object { "$_\Zen Browser\zen.exe" }); Profile="$roaming\zen"}
)
$found = @()
foreach ($definition in $definitions) {
 if ('all' -notin $Browsers -and $definition.Name -notin $Browsers) { continue }
 $candidates = @($definition.Paths)
 if ($BrowserPaths.ContainsKey($definition.Name)) { $candidates = @($BrowserPaths[$definition.Name]) + $candidates }
 foreach ($hive in @('HKCU:','HKLM:')) {
  $key = "$hive\Software\Microsoft\Windows\CurrentVersion\App Paths\$($definition.App)"
  if (Test-Path -LiteralPath $key) { $candidates += (Get-Item -LiteralPath $key).GetValue('') }
 }
 $exe = $candidates | Where-Object {
  $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) -and
  ($definition.Name -ne 'chrome' -or $_ -notmatch '(?i)Helium') -and
  ($definition.Name -ne 'helium' -or $_ -match '(?i)Helium' -or $BrowserPaths.ContainsKey('helium')) -and
  ($definition.Name -ne 'opera-gx' -or $_ -match '(?i)Opera GX' -or $BrowserPaths.ContainsKey('opera-gx'))
 } | Select-Object -First 1
 if ($exe -or (Test-Path -LiteralPath $definition.Profile)) {
  $found += [pscustomobject]@{Browser=$definition.Name; Family=$definition.Family; Executable=[string]$exe; DetectedBy=$(if ($exe) { 'executable' } else { 'existing-profile' }); Profile=$definition.Profile; Directory=(Join-Path $root "Extensions\$($definition.Family)")}
 }
}
if ($DryRun) {
 [pscustomobject]@{Source="https://github.com/xtufa7/$Repository";InstallRoot=$root;DetectedBrowsers=$found;RegistryChanges=0} | ConvertTo-Json -Depth 5
 return
}
if ($found.Count -eq 0) { throw 'No supported browser found. Supply -BrowserPaths for portable browsers. No software was installed.' }
[IO.Directory]::CreateDirectory($root) | Out-Null
$stamp = [Guid]::NewGuid().ToString('N')
$cache = Join-Path $root "Downloads\$stamp"
[IO.Directory]::CreateDirectory($cache) | Out-Null
$zip = Join-Path $cache 'repository.zip'
if ($ArchivePath) { Copy-Item -LiteralPath $ArchivePath -Destination $zip }
else {
 [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
 $sourceRef = [Uri]::EscapeDataString($Branch)
 Invoke-WebRequest -UseBasicParsing -Uri "https://api.github.com/repos/xtufa7/$Repository/zipball/$sourceRef" -Headers @{'User-Agent'='NOVA-Official-Setup'} -OutFile $zip
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$extracted = Join-Path $cache 'repository'
$archive = [IO.Compression.ZipFile]::OpenRead($zip)
try {
 $total = 0L
 foreach ($entry in $archive.Entries) {
  $target = [IO.Path]::GetFullPath((Join-Path $extracted $entry.FullName))
  if (-not $target.StartsWith($extracted + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe archive path.' }
  $total += $entry.Length
  if ($total -gt 209715200) { throw 'Repository archive exceeds 200 MB.' }
 }
} finally { $archive.Dispose() }
[IO.Compression.ZipFile]::ExtractToDirectory($zip,$extracted)
$source = @($extracted) + @(Get-ChildItem -LiteralPath $extracted -Directory | ForEach-Object FullName) | Where-Object { Test-Path -LiteralPath (Join-Path $_ 'manifest.json') } | Select-Object -First 1
if (-not $source) { throw 'The repository does not contain a release manifest.' }
$manifest = Get-Content -LiteralPath (Join-Path $source 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest.name -ne 'NØVA — New Tab' -or $manifest.author -notmatch 'github.com/xtufa7' -or $manifest.version -notmatch '^\d+\.\d+\.\d+$') { throw 'Unexpected repository identity.' }
foreach ($family in @($found.Family | Select-Object -Unique)) {
 $build = Join-Path $source $(if ($family -eq 'firefox') { 'dist-firefox' } else { 'dist' })
 $built = Get-Content -LiteralPath (Join-Path $build 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 if ($built.version -ne $manifest.version -or $built.author -ne $manifest.author) { throw 'Built package does not match this release.' }
 if ($family -eq 'firefox' -and -not $built.background.scripts) { throw 'Firefox build is missing.' }
 if ($family -eq 'chromium' -and -not $built.background.service_worker) { throw 'Chromium build is missing.' }
 $destination = Join-Path $root "Extensions\$family"
 $existing = Join-Path $destination 'manifest.json'
 if (Test-Path -LiteralPath $existing) {
  $old = Get-Content -LiteralPath $existing -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($old.author -ne $manifest.author -or $old.name -ne $manifest.name) { throw 'Another extension owns the destination. Choose a new install root.' }
 }
 [IO.Directory]::CreateDirectory($destination) | Out-Null
 foreach ($item in Get-ChildItem -LiteralPath $build -Force) { Copy-Item -LiteralPath $item.FullName -Destination $destination -Recurse -Force }
}
$bootstrap = Join-Path $source 'native\bootstrap.ps1'
if (-not (Test-Path -LiteralPath $bootstrap)) { throw 'Official PowerShell bootstrap is missing.' }
$native = Join-Path $root 'Native'
[IO.Directory]::CreateDirectory($native) | Out-Null
Copy-Item -LiteralPath $bootstrap -Destination (Join-Path $native 'bootstrap.ps1') -Force
$finish = "@echo off`r`n`"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe`" -NoProfile -ExecutionPolicy Bypass -File `"%~dp0Native\bootstrap.ps1`" -Browser all`r`nif errorlevel 1 pause`r`n"
[IO.File]::WriteAllText((Join-Path $root 'Finish-Spotify-Setup.cmd'),$finish,[Text.UTF8Encoding]::new($false))
$report = @{Version=$manifest.version;Repository="xtufa7/$Repository";Browsers=$found;ExtensionStatus='Prepared; browser approval required';BridgeStatus='Not run'}
$instructions = @('NOVA ' + $manifest.version, '', 'Browser packages are prepared. Browser approval is required.', '')
foreach ($browser in $found) {
 $page = if ($browser.Family -eq 'firefox') { 'about:debugging#/runtime/this-firefox' } elseif ($browser.Browser -eq 'edge') { 'edge://extensions' } elseif ($browser.Browser -match '^opera') { 'opera://extensions' } else { 'chrome://extensions' }
 $instructions += "$($browser.Browser): $($browser.Directory)"
 $instructions += $(if ($browser.Family -eq 'firefox') { "Open $page, Load Temporary Add-on, select manifest.json. Permanent installation needs a Mozilla-signed release." } else { "Open $page, enable Developer mode, Load unpacked, select the directory above. For updates, reload the same existing folder to preserve settings." })
 if (-not $PrepareOnly -and -not $NoOpenBrowser -and $browser.Executable) { Start-Process -FilePath $browser.Executable -ArgumentList $page }
}
$instructions += @('', 'Spotify Web + lyrics work automatically after installation.', 'After loading Chromium NOVA, run Finish-Spotify-Setup.cmd to register its discovered ID.', 'Desktop bridge is optional and runs outside the extension. Enable it in Music after registration.', 'No browser preferences, enterprise policies or signature checks were changed.')
[IO.File]::WriteAllLines((Join-Path $root 'INSTALL.txt'),$instructions,[Text.UTF8Encoding]::new($false))
$instructions | Write-Output
if (-not $PrepareOnly -and -not $SkipBridge) {
 if ([Environment]::OSVersion.Version.Build -lt 17763) { Write-Warning 'Spotify Desktop requires Windows 10 1809+. Spotify Web is available.' }
 else {
  $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $arguments = @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $native 'bootstrap.ps1'),'-Browser','all')
  if ($ExtensionId) { $arguments += @('-ExtensionId',$ExtensionId) }
  & $powershell @arguments
  if ($LASTEXITCODE -ne 0) { throw 'Native registration failed. Read INSTALL.txt; prepared extension files were preserved.' }
  $report.BridgeStatus = 'Registration command completed; missing Chromium IDs require Finish-Spotify-Setup after browser approval'
 }
}
[IO.File]::WriteAllText((Join-Path $root 'setup-report.json'),($report | ConvertTo-Json -Depth 6),[Text.UTF8Encoding]::new($false))
Write-Output "Setup preparation complete: $root"
