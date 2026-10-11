import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const files = ['install.ps1', 'spotify-bridge.ps1', 'launch.cmd', 'setup.cmd'];
const payload = files.map(name => `    '${name}' = '${gzipSync(readFileSync('native/' + name)).toString('base64')}'`).join('\n');
const source = `# NØVA official standalone installer. Review before running. No administrator required.
# Downloaded from https://github.com/xtufa7/NOVA-New-Tab
param(
 [string]$ExtensionId = $env:NOVA_EXTENSION_ID,
 [string]$Browser = $(if ($env:NOVA_BROWSER) { $env:NOVA_BROWSER } else { 'all' }),
 [string]$InstallDirectory = $(Join-Path $env:LOCALAPPDATA 'NOVA\\SpotifyBridge\\native'),
 [switch]$Uninstall, [switch]$DryRun, [switch]$ExtractOnly
)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT' -or [Environment]::OSVersion.Version.Build -lt 17763) { throw 'Spotify Desktop requires Windows 10 version 1809 or newer. Use Spotify Web on other systems.' }
if ($Browser -notin @('all','chrome','chromium','helium','edge','brave','vivaldi','opera','firefox','zen')) { throw 'Unsupported browser selection.' }
if ($ExtensionId -and $ExtensionId -ne 'nova@xtufa7' -and $ExtensionId -notmatch '^[a-p]{32}$') { throw 'Invalid extension ID. Copy it from NOVA Music settings.' }
$powershell = Join-Path $env:SystemRoot 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'
if (-not (Test-Path -LiteralPath $powershell)) { throw 'Windows PowerShell 5.1 is required.' }
$payload = @{
${payload}
}
$target = [IO.Path]::GetFullPath($InstallDirectory)
if ($target -eq [IO.Path]::GetPathRoot($target)) { throw 'Choose a dedicated installation folder.' }
if ($DryRun) { Write-Output ('Install directory: ' + $target) }
else {
 [IO.Directory]::CreateDirectory($target) | Out-Null
 foreach ($name in $payload.Keys) {
  $inputBytes = [Convert]::FromBase64String($payload[$name])
  $memory = New-Object IO.MemoryStream(,$inputBytes)
  $gzip = New-Object IO.Compression.GZipStream($memory, [IO.Compression.CompressionMode]::Decompress)
  $output = New-Object IO.MemoryStream
  try { $gzip.CopyTo($output); [IO.File]::WriteAllBytes((Join-Path $target $name), $output.ToArray()) }
  finally { $gzip.Dispose(); $memory.Dispose(); $output.Dispose() }
 }
}
if ($ExtractOnly -or $DryRun) { Write-Output 'Payload verified / extraction only. Browser registration was not changed.'; return }
$arguments = @('-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $target 'install.ps1'),'-Browser',$Browser)
if ($ExtensionId) { $arguments += @('-ExtensionId',$ExtensionId) }
if ($Uninstall) { $arguments += '-Uninstall' }
& $powershell @arguments
if ($LASTEXITCODE -ne 0) { throw 'Browser registration failed. Read the error above; do not enable the bridge until setup succeeds.' }
`;
writeFileSync('native/bootstrap.ps1', '\ufeff' + source);
console.log('Generated standalone bootstrap from current native scripts.');
