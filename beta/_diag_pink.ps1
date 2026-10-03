Add-Type -AssemblyName System.Drawing
$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
$out=New-Object System.Collections.ArrayList
foreach($f in @(@("$dir\_gs_c223L.png",'223L',357,111), @("$dir\_gs_c216L.png",'216L',356,95))){
  $path=$f[0]; $tag=$f[1]; $fx=[int]$f[2]; $fy=[int]$f[3]
  if(-not (Test-Path $path)){ $null=$out.Add("MISSING $path"); continue }
  $b=New-Object System.Drawing.Bitmap $path
  $null=$out.Add("=== $tag  image $($b.Width)x$($b.Height)  outFrame origin=($fx,$fy) ===")
  # scan the whole output-frame column strip for 'blueish' pixels, report rows and x-extent
  $rows=@{}
  for($y=$fy+2;$y -lt ($b.Height-2);$y++){
    $cnt=0; $mnx=9999; $mxx=0
    for($x=$fx+2;$x -lt ($b.Width-2);$x++){
      $c=$b.GetPixel($x,$y)
      if((($c.B - $c.R) -gt 30) -and (($c.B - $c.G) -gt 20)){ $cnt++; if($x -lt $mnx){$mnx=$x}; if($x -gt $mxx){$mxx=$x} }
    }
    if($cnt -gt 0){ $rows[$y]=@($cnt,$mnx,$mxx) }
  }
  # cluster consecutive rows into bands
  $ys=$rows.Keys | Sort-Object
  $bandStart=-1; $prev=-999; $bands=New-Object System.Collections.ArrayList
  foreach($y in $ys){
    if($y -ne ($prev+1)){ if($bandStart -ge 0){ $null=$bands.Add(@($bandStart,$prev)) }; $bandStart=$y }
    $prev=$y
  }
  if($bandStart -ge 0){ $null=$bands.Add(@($bandStart,$prev)) }
  $null=$out.Add("blue-ish row bands: $($bands.Count)")
  foreach($bd in $bands){
    $y0=$bd[0]; $y1=$bd[1]
    $mn=9999; $mx=0
    for($y=$y0;$y -le $y1;$y++){ if($rows[$y][1] -lt $mn){$mn=$rows[$y][1]}; if($rows[$y][2] -gt $mx){$mx=$rows[$y][2]} }
    $null=$out.Add("  band y=$y0..$y1 (h=$($y1-$y0+1))  x=$mn..$mx")
  }
  # sample actual digit colours from the first band
  if($bands.Count -gt 0){
    $y0=$bands[0][0]; $y1=$bands[0][1]
    $cols=@{}
    for($y=$y0;$y -le $y1;$y++){ for($x=$fx+2;$x -lt ($b.Width-2);$x++){ $c=$b.GetPixel($x,$y)
      if((($c.B-$c.R) -gt 30) -and (($c.B-$c.G) -gt 20)){ $k="$($c.R),$($c.G),$($c.B)"; $cols[$k]=1+($cols[$k]) } } }
    $top=$cols.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 6
    $null=$out.Add("  digit colours (top): " + (($top | ForEach-Object { "$($_.Key)x$($_.Value)" }) -join '  '))
    # background colour just left of digits
    $bg=$b.GetPixel($fx+10,$y0); $null=$out.Add("  bg near digits = $($bg.R),$($bg.G),$($bg.B)")
  }
  $b.Dispose()
}
$out | Out-File "$dir\_diag_pink.txt" -Encoding utf8
Write-Output "written $dir\_diag_pink.txt"
