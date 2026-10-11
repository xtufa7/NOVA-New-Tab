# NØVA / xtufa7 — Windows PowerShell 5.1 native messaging host. Metadata only.
# Runs OUTSIDE the extension. Obtain only from https://github.com/xtufa7
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$inputStream = [Console]::OpenStandardInput()
$outputStream = [Console]::OpenStandardOutput()
function Send-NovaMessage($message) {
    $json = ConvertTo-Json -InputObject $message -Compress -Depth 5
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $length = [BitConverter]::GetBytes([uint32]$bytes.Length)
    $outputStream.Write($length, 0, 4)
    $outputStream.Write($bytes, 0, $bytes.Length)
    $outputStream.Flush()
}
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
    $propertiesType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType=WindowsRuntime]
    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
    function Await-WinRT($operation, [Type]$resultType) {
        $task = $asTask.MakeGenericMethod($resultType).Invoke($null, @($operation))
        if (-not $task.Wait(5000)) { throw 'Windows media session timed out.' }
        return $task.Result
    }
    $manager = Await-WinRT ($managerType::RequestAsync()) $managerType
    $buffer = New-Object byte[] 4
    # No inbound commands are accepted. EOF means the browser disconnected: exit promptly.
    $closed = $inputStream.ReadAsync($buffer, 0, 4)
    while (-not $closed.IsCompleted) {
        $state = @{ title = ''; artist = ''; current = 0; duration = 0; playing = $false }
        try {
            $sessions = @($manager.GetSessions() | Where-Object { $_.SourceAppUserModelId -match '(?i)spotify' })
            $session = $sessions | Sort-Object { $_.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing' } -Descending | Select-Object -First 1
            if ($null -ne $session) {
                $properties = Await-WinRT ($session.TryGetMediaPropertiesAsync()) $propertiesType
                $timeline = $session.GetTimelineProperties()
                $state.title = [string]$properties.Title; $state.artist = [string]$properties.Artist
                $state.current = [Math]::Max(0, ($timeline.Position - $timeline.StartTime).TotalSeconds)
                $state.duration = [Math]::Max(0, ($timeline.EndTime - $timeline.StartTime).TotalSeconds)
                $state.playing = $session.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing'
                if ($state.playing) {
                    $elapsed = ([DateTimeOffset]::Now - $timeline.LastUpdatedTime).TotalSeconds
                    if ($elapsed -ge 0 -and $elapsed -lt 30) { $state.current += $elapsed }
                    if ($state.duration -gt 0) { $state.current = [Math]::Min($state.current, $state.duration) }
                }
            }
            Send-NovaMessage @{ type = 'spotify-state'; state = $state }
        } catch { Send-NovaMessage @{ type = 'error'; error = $_.Exception.Message } }
        [Threading.Thread]::Sleep(900)
    }
} catch {
    try { Send-NovaMessage @{ type = 'error'; error = $_.Exception.Message } } catch {}
} finally { $inputStream.Dispose(); $outputStream.Dispose() }
