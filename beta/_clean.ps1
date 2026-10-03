$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
function cv($s){
  if($s -eq '/' -or [string]::IsNullOrWhiteSpace($s)){ return '' }
  $t = $s -replace '[^0-9.]',''
  $p = $t.Split('.')
  if($p.Count -gt 2){ $last=$p[$p.Count-1]; $head=($p[0..($p.Count-2)] -join ''); $t="$head.$last" }
  if($t.StartsWith('.')){ $t=$t.Substring(1) }
  return $t
}
$rows = Import-Csv "$dir\_data_base_R.csv"
$cols='a1','p1','a2','p2','a3','p3','a4','p4'
foreach($r in $rows){ foreach($c in $cols){ $r.$c = cv $r.$c } }
$rows | Export-Csv "$dir\_data_base_R_clean.csv" -NoTypeInformation -Encoding UTF8
$valid = ($rows | Where-Object { $_.a1 -ne '' -or $_.a2 -ne '' -or $_.a3 -ne '' -or $_.a4 -ne '' }).Count
Write-Output ("total=$($rows.Count) rows_with_any_solution=$valid")
Write-Output '--- spot check dist=1 (was leading-dot) ---'
$rows | Where-Object { $_.dist -eq '1' } | Select-Object -First 3 | ForEach-Object { "$($_.dist),$($_.drop): a1=$($_.a1) p1=$($_.p1) a2=$($_.a2) a3=$($_.a3)" }
Write-Output '--- spot check dist=20 drop=10 (expect 56.3/3.23/73.3/3.73) ---'
$rows | Where-Object { $_.dist -eq '20' -and $_.drop -eq '10' } | ForEach-Object { "a2=$($_.a2) p2=$($_.p2) a3=$($_.a3) p3=$($_.p3)" }
Write-Output '--- range of a1 (angles) to detect any bad OCR ---'
$a1v = $rows | Where-Object { $_.a1 -ne '' } | ForEach-Object { [double]$_.a1 }
Write-Output ("a1 count=$($a1v.Count) min=$([math]::Round(($a1v|Measure-Object -Minimum).Minimum,1)) max=$([math]::Round(($a1v|Measure-Object -Maximum).Maximum,1))")
$p3v = $rows | Where-Object { $_.p3 -ne '' } | ForEach-Object { [double]$_.p3 }
Write-Output ("p3 count=$($p3v.Count) min=$(($p3v|Measure-Object -Minimum).Minimum) max=$(($p3v|Measure-Object -Maximum).Maximum)")
