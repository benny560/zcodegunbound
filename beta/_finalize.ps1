$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
$root='c:\Users\fanli\Documents\zcodegunbound'
$out="$root\Trico老计算器_全量采样数据.xlsx"

function cv($s){
  if($s -eq '/' -or [string]::IsNullOrWhiteSpace($s)){ return '' }
  $t = $s -replace '[^0-9.]',''
  $p = $t.Split('.')
  if($p.Count -gt 2){ $last=$p[$p.Count-1]; $head=($p[0..($p.Count-2)] -join ''); $t="$head.$last" }
  if($t.StartsWith('.')){ $t=$t.Substring(1) }
  return $t
}
$cols='a1','p1','a2','p2','a3','p3','a4','p4'
$sets=@(
  @('_d_base_223R','无风基准_223_右攻左'),
  @('_d_base_223L','无风基准_223_左攻右'),
  @('_d_base_216L','无风基准_216_左攻右'),
  @('_d_wind_223R','风修正_223_右攻左'),
  @('_d_wind_223L','风修正_223_左攻右'),
  @('_d_wind_216L','风修正_216_左攻右')
)
$ready=@()
foreach($s in $sets){
  $src="$dir\$($s[0]).csv"
  if(-not (Test-Path $src)){ Write-Output "MISSING $src"; continue }
  $rows=@(Import-Csv $src)
  foreach($r in $rows){ foreach($c in $cols){ $r.$c = cv $r.$c } }
  $dst="$dir\$($s[0])_clean.csv"
  $rows | Export-Csv $dst -NoTypeInformation -Encoding UTF8
  $solved=($rows | Where-Object { $_.a1 -ne '' -or $_.a2 -ne '' -or $_.a3 -ne '' -or $_.a4 -ne '' }).Count
  Write-Output ("{0,-34} rows={1,5}  with-solution={2,5}" -f $s[1],$rows.Count,$solved)
  $ready += ,@($dst,$s[1])
}

$xl=New-Object -ComObject Excel.Application
$xl.Visible=$false; $xl.DisplayAlerts=$false
$wb=$xl.Workbooks.Add()
$si=0
foreach($s in $ready){
  $rows=@(Import-Csv $s[0]); if($rows.Count -eq 0){ continue }
  $hdr=$rows[0].PSObject.Properties.Name
  $nR=$rows.Count+1; $nC=$hdr.Count
  $arr=New-Object 'object[,]' $nR,$nC
  for($c=0;$c -lt $nC;$c++){ $arr[0,$c]=$hdr[$c] }
  for($r=0;$r -lt $rows.Count;$r++){
    $ri=$r+1
    for($c=0;$c -lt $nC;$c++){
      $v=$rows[$r].($hdr[$c])
      if([string]::IsNullOrWhiteSpace($v)){ $arr[$ri,$c]=$null }
      else{ $d=0.0; if([double]::TryParse($v,[ref]$d)){ $arr[$ri,$c]=$d } else { $arr[$ri,$c]=$v } }
    }
  }
  if($si -eq 0){ $ws=$wb.Worksheets.Item(1) } else { $ws=$wb.Worksheets.Add() }
  $ws.Name=$s[1]
  $ws.Range($ws.Cells(1,1),$ws.Cells($nR,$nC)).Value2=$arr
  $ws.Rows.Item(1).Font.Bold=$true
  $ws.Range($ws.Cells(1,1),$ws.Cells(1,$nC)).Interior.Color=15773696
  $ws.Application.ActiveWindow.SplitRow=1
  $ws.Application.ActiveWindow.FreezePanes=$true
  $ws.Columns.AutoFit() | Out-Null
  $si++
}
if(Test-Path $out){ Remove-Item $out -Force }
$wb.SaveAs($out,51)
$wb.Close($false); $xl.Quit()
[GC]::Collect()
Write-Output ("SAVED sheets=$si")
