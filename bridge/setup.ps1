$ErrorActionPreference='Stop'
$venv=Join-Path $PSScriptRoot '.venv'
python -m venv $venv
if($LASTEXITCODE -ne 0){throw 'Python 3.9+ for Windows is required.'}
& (Join-Path $venv 'Scripts/python.exe') -m pip install --requirement (Join-Path $PSScriptRoot 'requirements.txt')
if($LASTEXITCODE -ne 0){throw 'Bridge dependency installation failed.'}
