param([string]$chain)
$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
$gs="$dir\_gs.ps1"
# NOTE: do not name this 'Kill' - that collides with PowerShell's built-in alias for Stop-Process
function KillProc($n){ Get-Process -Name $n -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep 3 }
function Job($exe,$desk,$btn,$mode,$tag,$job,$ink,$csv,$extra){
  $a=@('-NoProfile','-ExecutionPolicy','Bypass','-File',$gs,'-exe',$exe,'-deskName',$desk,'-launchBtn',$btn,'-modeLabel',$mode,'-tag',$tag,'-job',$job,'-inkMode',$ink,'-outCsv',$csv) + $extra
  Write-Output ("[{0}] START {1} {2}" -f (Get-Date -Format HH:mm:ss),$tag,$job)
  & powershell.exe @a 2>&1 | Out-String -Width 250 | Write-Output
  Write-Output ("[{0}] END   {1}" -f (Get-Date -Format HH:mm:ss),$tag)
}
$e223="$dir\2.2.3.exe"; $e216="$dir\2.1.6.exe"
$baseArgs=@('-dMin','0','-dMax','45','-hMin','-15','-hMax','15')
$windArgs=@('-wMin','1','-wMax','26','-wDist','20','-wDrop','0')

if($chain -eq 'A'){
  KillProc '2.2.3'
  Job $e223 'CA1' 3 '223L' 'b223L' 'base' 2 "$dir\_d_base_223L.csv" $baseArgs
  KillProc '2.2.3'
  Job $e223 'CA2' 2 '223R' 'w223R' 'wind' 0 "$dir\_d_wind_223R.csv" $windArgs
  KillProc '2.2.3'
  Job $e223 'CA3' 3 '223L' 'w223L' 'wind' 2 "$dir\_d_wind_223L.csv" $windArgs
  KillProc '2.2.3'
}
if($chain -eq 'B'){
  KillProc '2.1.6'
  Job $e216 'CB1' 3 '216L' 'b216L' 'base' 2 "$dir\_d_base_216L.csv" $baseArgs
  KillProc '2.1.6'
  Job $e216 'CB2' 3 '216L' 'w216L' 'wind' 2 "$dir\_d_wind_216L.csv" $windArgs
  KillProc '2.1.6'
}
Write-Output ("[{0}] CHAIN {1} COMPLETE" -f (Get-Date -Format HH:mm:ss),$chain)
