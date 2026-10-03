$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
function cv($s){
  if($s -eq '/' -or [string]::IsNullOrWhiteSpace($s)){ return '' }
  $t = $s -replace '[^0-9.]',''
  $p = $t.Split('.')
  if($p.Count -gt 2){ $last=$p[$p.Count-1]; $head=($p[0..($p.Count-2)] -join ''); $t="$head.$last" }
  if($t.StartsWith('.')){ $t=$t.Substring(1) }
  return $t
}
$rows = Import-Csv "$dir\_data_wind_R.csv"
$cols='a1','p1','a2','p2','a3','p3','a4','p4'
foreach($r in $rows){ foreach($c in $cols){ $r.$c = cv $r.$c } }
$rows | Export-Csv "$dir\_data_wind_R_clean.csv" -NoTypeInformation -Encoding UTF8
Write-Output ("wind rows cleaned: $($rows.Count)")
$w = $rows | Group-Object wind | Measure-Object | Select-Object -ExpandProperty Count
$o = $rows | Group-Object opt  | Measure-Object | Select-Object -ExpandProperty Count
Write-Output ("distinct wind levels=$w  distinct directions=$o")
Write-Output '--- effect of wind at fixed direction (opt=18, angle=131) ---'
$rows | Where-Object { $_.opt -eq '18' } | Sort-Object { [int]$_.wind } | Select-Object -First 8 | ForEach-Object { "wind=$($_.wind): a2=$($_.a2) p2=$($_.p2)  a3=$($_.a3) p3=$($_.p3)" }
Write-Output '--- effect of direction at fixed wind=20 ---'
$rows | Where-Object { $_.wind -eq '20' } | Sort-Object { [int]$_.angle } | Select-Object -First 8 | ForEach-Object { "angle=$($_.angle): a2=$($_.a2) p2=$($_.p2)  a3=$($_.a3) p3=$($_.p3)" }
