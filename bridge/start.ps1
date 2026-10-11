param([Parameter(Mandatory=$true)][ValidatePattern('^[a-p]{32}$')][string]$ExtensionId,[string]$CavaFile)
$ErrorActionPreference='Stop'
$runtime=Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if(!(Test-Path -LiteralPath $runtime)){throw 'Run setup.ps1 once before starting the bridge.'}
$bridgeArgs=@((Join-Path $PSScriptRoot 'nova_bridge.py'),'--extension-id',$ExtensionId)
if($CavaFile){$bridgeArgs+=@('--cava-file',$CavaFile)}
& $runtime @bridgeArgs
