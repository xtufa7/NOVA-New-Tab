param(
    [string]$ExtensionId = '',
    [ValidateSet('all','chrome','chromium','helium','edge','brave','vivaldi','opera','firefox','zen')][string]$Browser = 'all',
    [switch]$Uninstall,
    [switch]$DryRun,
    [string[]]$UserDataRoots = @()
)
$ErrorActionPreference = 'Stop'
if (-not $PSScriptRoot) { throw 'Use the standalone bootstrap.ps1 with irm | iex, or run install.ps1 using -File.' }
if ($env:OS -ne 'Windows_NT' -or [Environment]::OSVersion.Version.Build -lt 17763) { throw 'Spotify Desktop requires Windows 10 version 1809 or newer.' }
$hostName = 'com.xtufa7.nova.spotify'
if ($ExtensionId -and $ExtensionId -ne 'nova@xtufa7' -and $ExtensionId -notmatch '^[a-p]{32}$') { throw 'Invalid NOVA extension ID. Copy it from Music settings.' }
$browserPaths = @{
    chrome = @('Software\Google\Chrome\NativeMessagingHosts')
    chromium = @('Software\Chromium\NativeMessagingHosts','Software\Google\Chrome\NativeMessagingHosts')
    helium = @('Software\Helium\NativeMessagingHosts','Software\Chromium\NativeMessagingHosts','Software\Google\Chrome\NativeMessagingHosts')
    edge = @('Software\Microsoft\Edge\NativeMessagingHosts')
    brave = @('Software\BraveSoftware\Brave-Browser\NativeMessagingHosts','Software\Google\Chrome\NativeMessagingHosts')
    vivaldi = @('Software\Vivaldi\NativeMessagingHosts','Software\Google\Chrome\NativeMessagingHosts')
    opera = @('Software\Opera Software\Opera Stable\NativeMessagingHosts','Software\Google\Chrome\NativeMessagingHosts')
    firefox = @('Software\Mozilla\NativeMessagingHosts')
    zen = @('Software\Mozilla\NativeMessagingHosts')
}
$roots = @{
    chrome = @((Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data'))
    chromium = @((Join-Path $env:LOCALAPPDATA 'Chromium\User Data'))
    helium = @((Join-Path $env:LOCALAPPDATA 'Helium\User Data'), (Join-Path $env:LOCALAPPDATA 'imput\Helium\User Data'), (Join-Path $env:APPDATA 'Helium\User Data'))
    edge = @((Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\User Data'))
    brave = @((Join-Path $env:LOCALAPPDATA 'BraveSoftware\Brave-Browser\User Data'))
    vivaldi = @((Join-Path $env:LOCALAPPDATA 'Vivaldi\User Data'))
    opera = @((Join-Path $env:APPDATA 'Opera Software\Opera Stable'), (Join-Path $env:APPDATA 'Opera Software\Opera GX Stable'))
}
$selected = if ($Browser -eq 'all') { @('chrome','chromium','helium','edge','brave','vivaldi','opera','firefox','zen') } else { @($Browser) }
$scanRoots = @($UserDataRoots)
foreach ($name in $selected) { if ($roots.ContainsKey($name)) { $scanRoots += $roots[$name] } }
$ids = @()
if ($ExtensionId -match '^[a-p]{32}$') { $ids += $ExtensionId }
# Read extension registration only. Never write browser preferences or open history/cookies.
if (-not $Uninstall) {
 foreach ($root in ($scanRoots | Select-Object -Unique)) {
  if (-not (Test-Path -LiteralPath $root)) { continue }
  $profiles = @($root) + @(Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(Default|Profile \d+|Guest Profile)$' } | ForEach-Object FullName)
  foreach ($profile in $profiles) {
   foreach ($fileName in @('Preferences','Secure Preferences')) {
    $file = Join-Path $profile $fileName
    if (-not (Test-Path -LiteralPath $file)) { continue }
    try {
     $prefs = Get-Content -LiteralPath $file -Raw -Encoding UTF8 | ConvertFrom-Json
     foreach ($entry in $prefs.extensions.settings.PSObject.Properties) {
      if ($entry.Name -notmatch '^[a-p]{32}$') { continue }
      $installed = $entry.Value.manifest
      if (-not $installed -and $entry.Value.path) {
       $extensionPath = [string]$entry.Value.path
       if (-not [IO.Path]::IsPathRooted($extensionPath)) { $extensionPath = Join-Path (Join-Path $profile 'Extensions') $extensionPath }
       $manifestFile = Join-Path $extensionPath 'manifest.json'
       if (Test-Path -LiteralPath $manifestFile) { $installed = Get-Content -LiteralPath $manifestFile -Raw -Encoding UTF8 | ConvertFrom-Json }
      }
      if ($installed.name -eq 'NØVA — New Tab' -and $installed.author -match 'github.com/xtufa7') { $ids += $entry.Name }
     }
    } catch { Write-Warning "Could not read extension registrations in $fileName. Add the extension ID from Music settings if needed." }
   }
  }
 }
}
$ids = @($ids | Select-Object -Unique)
$families = @()
if ($selected | Where-Object { $_ -notin @('firefox','zen') }) { $families += 'chromium' }
if ($selected | Where-Object { $_ -in @('firefox','zen') }) { $families += 'firefox' }
# Preflight every key before changing any registration.
$operations = @()
foreach ($family in $families) {
 $manifestPath = Join-Path $PSScriptRoot "host-$family.json"
 $manifest = @{ name=$hostName; description='NOVA optional Spotify desktop metadata'; path=(Join-Path $PSScriptRoot 'launch.cmd'); type='stdio' }
 if ($family -eq 'firefox') { $manifest.allowed_extensions = @('nova@xtufa7') }
 else {
  $origins = @($ids | ForEach-Object { "chrome-extension://$_/" })
  if (Test-Path -LiteralPath $manifestPath) {
   $old = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
   if ($old.name -ne $hostName -or $old.path -ne $manifest.path) { throw 'Different native host manifest exists. Uninstall that copy first.' }
   $origins += @($old.allowed_origins | Where-Object { $_ -match '^chrome-extension://[a-p]{32}/$' })
  }
  $manifest.allowed_origins = @($origins | Select-Object -Unique)
  if (-not $Uninstall -and $manifest.allowed_origins.Count -eq 0) { Write-Warning 'No installed Chromium NOVA ID found. Firefox/Zen can still be registered. Run again from Chromium Music settings if its profile is in a custom location.'; continue }
 }
 $keys = @($selected | Where-Object { ($family -eq 'firefox') -eq ($_ -in @('firefox','zen')) } | ForEach-Object { $browserPaths[$_] } | Select-Object -Unique)
 foreach ($keyPath in $keys) {
  $key = "HKCU:\$keyPath\$hostName"
  if (Test-Path -LiteralPath $key) {
   $registeredPath = (Get-Item -LiteralPath $key).GetValue('')
   if ($registeredPath -ne $manifestPath) {
    try {
     $registered = Get-Content -LiteralPath $registeredPath -Raw -Encoding UTF8 | ConvertFrom-Json
     $previousFolder = Split-Path -Parent $registeredPath
     $previousBridge = Join-Path $previousFolder 'spotify-bridge.ps1'
     if ($registered.name -ne $hostName -or $registered.type -ne 'stdio' -or $registered.path -ne (Join-Path $previousFolder 'launch.cmd') -or -not (Test-Path -LiteralPath $previousBridge) -or -not ((Get-Content -LiteralPath $previousBridge -First 2 -Encoding UTF8) -match 'xtufa7')) { throw 'Unrecognized installation.' }
     if ($family -eq 'chromium') { $manifest.allowed_origins = @(@($manifest.allowed_origins) + @($registered.allowed_origins | Where-Object { $_ -match '^chrome-extension://[a-p]{32}/$' }) | Select-Object -Unique) }
    } catch { throw 'Another installation owns a native host key. Uninstall that copy first.' }
   }
  }
  $operations += @{ Key=$key; ManifestPath=$manifestPath; Manifest=$manifest }
 }
}
foreach ($op in $operations) {
 if ($DryRun) { Write-Output ($op | ConvertTo-Json -Depth 6 -Compress); continue }
 if ($Uninstall) { if (Test-Path -LiteralPath $op.Key) { Remove-Item -LiteralPath $op.Key } }
 else {
  [IO.File]::WriteAllText($op.ManifestPath, ($op.Manifest | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
  New-Item -Path $op.Key -Force | Out-Null
  Set-Item -LiteralPath $op.Key -Value $op.ManifestPath
 }
}
if (-not $DryRun) {
 if ($Uninstall) { Write-Output 'Browser registrations removed. Disable Desktop bridge in NOVA Music settings.' }
 else { Write-Output 'Setup complete. Enable Desktop bridge in each browser containing NOVA. It starts automatically with that browser while enabled. Keep this folder in place.' }
}
