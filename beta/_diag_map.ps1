Add-Type -AssemblyName System.Drawing
$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
$out=New-Object System.Collections.ArrayList
$b=New-Object System.Drawing.Bitmap "$dir\_gs_c216L2.png"
# band0 of 216L: y=129..141, x=412..432 ; widen a bit to see context
$y0=129;$y1=141;$x0=406;$x1=440
$null=$out.Add("ASCII ink map (rule: B-R>40 && B-G>25), y=$y0..$y1  x=$x0..$x1")
$null=$out.Add("      " + (($x0..$x1) | ForEach-Object { [string]([math]::Floor($_/10) % 10) }) -join '')
$null=$out.Add("      " + (($x0..$x1) | ForEach-Object { [string]($_ % 10) }) -join '')
for($y=$y0;$y -le $y1;$y++){
  $line=""
  for($x=$x0;$x -le $x1;$x++){
    $c=$b.GetPixel($x,$y)
    if((($c.B-$c.R) -gt 40) -and (($c.B-$c.G) -gt 25)){ $line+="#" } else { $line+="." }
  }
  $null=$out.Add(("y=" + $y.ToString().PadLeft(3) + " " + $line))
}
$null=$out.Add("")
$null=$out.Add("raw colours across row y=135:")
$s=""
for($x=$x0;$x -le $x1;$x++){ $c=$b.GetPixel($x,135); $s += "$x=($($c.R),$($c.G),$($c.B)) " }
$null=$out.Add($s)
$b.Dispose()
$out | Out-File "$dir\_diag_map.txt" -Encoding utf8
Write-Output 'ok'
