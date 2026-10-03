$log='c:\Users\fanli\Documents\zcodegunbound\beta\_verify.txt'
$out=New-Object System.Collections.ArrayList
$root='c:\Users\fanli\Documents\zcodegunbound'
$null=$out.Add("=== xlsx files (Trico*) ===")
Get-ChildItem "$root\*.xlsx" | Where-Object { $_.Name -like 'Trico*' } | ForEach-Object { $null=$out.Add(("{0}  bytes={1}" -f $_.Name,$_.Length)) }
$expected="$root\Trico老计算器_无头采样数据.xlsx"
$null=$out.Add("expected-name exists: " + (Test-Path -LiteralPath $expected))
# verify workbook contents
$f = Get-ChildItem "$root\*.xlsx" | Where-Object { $_.Name -like 'Trico*' } | Select-Object -First 1
if($f){
  $xl=New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
  $wb=$xl.Workbooks.Open($f.FullName)
  foreach($ws in $wb.Worksheets){
    $ur=$ws.UsedRange
    $null=$out.Add(("sheet='{0}' usedRows={1} usedCols={2}" -f $ws.Name,$ur.Rows.Count,$ur.Columns.Count))
    $null=$out.Add(("  A1..L1: " + (1..12 | ForEach-Object { $ws.Cells(1,$_).Text }) -join ' | '))
    $null=$out.Add(("  row2  : " + (1..12 | ForEach-Object { $ws.Cells(2,$_).Text }) -join ' | '))
    $null=$out.Add(("  row700: " + (1..12 | ForEach-Object { $ws.Cells(700,$_).Text }) -join ' | '))
  }
  $wb.Close($false); $xl.Quit()
}
$null=$out.Add("=== wind sampling progress ===")
$wc='c:\Users\fanli\Documents\zcodegunbound\beta\_data_wind_R.csv'
if(Test-Path $wc){ $c=Get-Content $wc; $null=$out.Add("wind rows: $($c.Count) / 1249 expected"); $null=$out.Add("head: "+$c[1]); $null=$out.Add("last: "+$c[-1]) } else { $null=$out.Add("wind csv not yet created") }
$wl='c:\Users\fanli\Documents\zcodegunbound\beta\_wind_R.log'
if(Test-Path $wl){ $null=$out.Add("windlog: "+((Get-Content $wl) -join ' ')) }
$out | Out-File -FilePath $log -Encoding utf8
Write-Output "written $log"
