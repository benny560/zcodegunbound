param([string]$outXlsx='c:\Users\fanli\Documents\zcodegunbound\Trico老计算器_无头采样数据.xlsx')
$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
$sets=@()
if(Test-Path "$dir\_data_base_R_clean.csv"){ $sets += ,@("$dir\_data_base_R_clean.csv",'无风基准_R') }
if(Test-Path "$dir\_data_wind_R_clean.csv"){ $sets += ,@("$dir\_data_wind_R_clean.csv",'风修正_R') }
if($sets.Count -eq 0){ Write-Output 'no data csv found'; exit }

$xl=New-Object -ComObject Excel.Application
$xl.Visible=$false; $xl.DisplayAlerts=$false
$wb=$xl.Workbooks.Add()
# remove default extra sheets later; use first sheet for first set
$si=0
foreach($s in $sets){
  $csv=$s[0]; $name=$s[1]
  $rows=@(Import-Csv $csv)
  if($rows.Count -eq 0){ continue }
  $cols=$rows[0].PSObject.Properties.Name
  $nR=$rows.Count+1; $nC=$cols.Count
  $arr=New-Object 'object[,]' $nR,$nC
  for($c=0;$c -lt $nC;$c++){ $arr[0,$c]=$cols[$c] }
  for($r=0;$r -lt $rows.Count;$r++){
    $ri=$r+1
    for($c=0;$c -lt $nC;$c++){
      $v=$rows[$r].($cols[$c])
      if([string]::IsNullOrWhiteSpace($v)){ $arr[$ri,$c]=$null }
      else{ $d=0.0; if([double]::TryParse($v,[ref]$d)){ $arr[$ri,$c]=$d } else { $arr[$ri,$c]=$v } }
    }
  }
  if($si -eq 0){ $ws=$wb.Worksheets.Item(1) } else { $ws=$wb.Worksheets.Add() }
  $ws.Name=$name
  $ws.Range($ws.Cells(1,1),$ws.Cells($nR,$nC)).Value2=$arr
  $ws.Rows.Item(1).Font.Bold=$true
  $ws.Range($ws.Cells(1,1),$ws.Cells(1,$nC)).Interior.Color=15773696
  $ws.Application.ActiveWindow.SplitRow=1
  $ws.Application.ActiveWindow.FreezePanes=$true
  $ws.Columns.AutoFit() | Out-Null
  Write-Output ("sheet '$name' <- $([System.IO.Path]::GetFileName($csv))  rows=$($rows.Count) cols=$nC")
  $si++
}
if(Test-Path $outXlsx){ Remove-Item $outXlsx -Force }
$wb.SaveAs($outXlsx,51)
$wb.Close($false); $xl.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ws)|Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb)|Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)|Out-Null
[GC]::Collect()
Write-Output ("SAVED: $outXlsx")
