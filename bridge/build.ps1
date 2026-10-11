#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$novaPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $novaPython)) { & (Join-Path $PSScriptRoot 'setup.ps1') }
& $novaPython -m pip install 'pyinstaller==6.22.3'
if ($LASTEXITCODE -ne 0) { throw 'Could not install the executable builder.' }
& $novaPython -m PyInstaller --noconfirm --onefile --windowed --name NOVA-Bridge --distpath (Join-Path $PSScriptRoot 'app') --workpath (Join-Path $PSScriptRoot '.build') --specpath (Join-Path $PSScriptRoot '.build') --paths $PSScriptRoot --collect-submodules winrt.windows.media.control --collect-submodules winrt.windows.foundation --collect-submodules winrt.windows.media --collect-all winrt (Join-Path $PSScriptRoot 'launcher.py')
if ($LASTEXITCODE -ne 0) { throw 'Executable build failed.' }
