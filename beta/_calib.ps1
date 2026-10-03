Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WC {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll", CharSet=CharSet.Ansi)] public static extern IntPtr SendMessageA(IntPtr h, uint msg, IntPtr wp, string lp);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint msg, IntPtr wp, IntPtr lp);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
  [DllImport("user32.dll")] public static extern void mouse_event(uint fl, uint dx, uint dy, uint dw, UIntPtr ex);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; }
}
"@
$exe='c:\Users\fanli\Documents\zcodegunbound\beta\2.2.3.exe'
$p=Get-Process -Name '2.2.3' -ErrorAction SilentlyContinue
if(-not $p){ Start-Process -FilePath $exe | Out-Null; Start-Sleep -Seconds 3; $p=Get-Process -Name '2.2.3' -ErrorAction SilentlyContinue }
$target=$p.Id
function AllForms { $script:ff=New-Object System.Collections.ArrayList; $cb=[WC+EnumProc]{ param($h,$l); $pp=0;[WC]::GetWindowThreadProcessId($h,[ref]$pp)|Out-Null; if($pp -eq $target){ $cn=New-Object System.Text.StringBuilder 256;[WC]::GetClassName($h,$cn,256)|Out-Null; if($cn.ToString() -eq 'ThunderRT6FormDC'){ $rc=New-Object WC+RECT;[WC]::GetWindowRect($h,[ref]$rc)|Out-Null; $null=$script:ff.Add([PSCustomObject]@{h=$h;L=$rc.L;T=$rc.T;w=($rc.R-$rc.L);ht=($rc.B-$rc.T)}) } }; return $true }; [WC]::EnumWindows($cb,[IntPtr]::Zero)|Out-Null; return $script:ff }
$calc=(AllForms)|Where-Object{$_.w -gt 400}|Select-Object -First 1
if(-not $calc){ $lz=(AllForms)|Where-Object{$_.w -le 400}|Select-Object -First 1; $b=[IntPtr]::Zero; $bcb=[WC+EnumProc]{ param($h,$l); if([WC]::GetDlgCtrlID($h) -eq 2){ $script:b=$h }; return $true }; [WC]::EnumChildWindows($lz.h,$bcb,[IntPtr]::Zero)|Out-Null; [WC]::SendMessage($b,0xF5,[IntPtr]::Zero,[IntPtr]::Zero)|Out-Null; Start-Sleep -Milliseconds 900; $calc=(AllForms)|Where-Object{$_.w -gt 400}|Select-Object -First 1 }
Write-Output ("calc hwnd=$($calc.h) at ($($calc.L),$($calc.T)) $($calc.w)x$($calc.ht)")
# map controls: id -> hwnd and screen-center
$ctrl=@{}; $cen=@{}
$ccb=[WC+EnumProc]{ param($h,$l); $id=[WC]::GetDlgCtrlID($h); $rc=New-Object WC+RECT;[WC]::GetWindowRect($h,[ref]$rc)|Out-Null; $script:ctrl[$id]=$h; $script:cen[$id]=@{x=[int](($rc.L+$rc.R)/2);y=[int](($rc.T+$rc.B)/2)}; return $true }
[WC]::EnumChildWindows($calc.h,$ccb,[IntPtr]::Zero)|Out-Null
# option ids present (18..65)
$optIds=$ctrl.Keys | Where-Object { $_ -ge 18 -and $_ -le 65 } | Sort-Object
$optA=$optIds[0]; $optB=$optIds[10]
# set inputs
[WC]::SendMessageA($ctrl[14],0xC,[IntPtr]::Zero,'20')|Out-Null
[WC]::SendMessageA($ctrl[15],0xC,[IntPtr]::Zero,'10')|Out-Null
[WC]::SendMessageA($ctrl[13],0xC,[IntPtr]::Zero,'0')|Out-Null
Start-Sleep -Milliseconds 120
# foreground + attach
$calcT=[WC]::GetWindowThreadProcessId($calc.h,[ref]([uint32]0)); $prev=[WC]::GetForegroundWindow(); $prevT=[WC]::GetWindowThreadProcessId($prev,[ref]([uint32]0)); $me=[WC]::GetCurrentThreadId()
[WC]::AttachThreadInput($me,$prevT,$true)|Out-Null; [WC]::AttachThreadInput($me,$calcT,$true)|Out-Null
[WC]::SetForegroundWindow($calc.h)|Out-Null; [WC]::BringWindowToTop($calc.h)|Out-Null; Start-Sleep -Milliseconds 200
$sv=New-Object WC+POINT;[WC]::GetCursorPos([ref]$sv)|Out-Null
function ClickId($id){ $c=$cen[$id]; [WC]::SetCursorPos($c.x,$c.y)|Out-Null; Start-Sleep -Milliseconds 45; [WC]::mouse_event(2,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 40; [WC]::mouse_event(4,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 90 }
ClickId 12; ClickId 11   # dist +1 / -1 -> fire Change
ClickId 10; ClickId 9    # drop +1 / -1
ClickId $optA; ClickId $optB   # change wind dir -> Option_Click compute
Start-Sleep -Milliseconds 500
[WC]::SetCursorPos($sv.X,$sv.Y)|Out-Null; [WC]::SetForegroundWindow($prev)|Out-Null
[WC]::AttachThreadInput($me,$calcT,$false)|Out-Null; [WC]::AttachThreadInput($me,$prevT,$false)|Out-Null
# PrintWindow
Add-Type -AssemblyName System.Drawing
$fw=$calc.w;$fh=$calc.ht
$bmp=New-Object System.Drawing.Bitmap $fw,$fh
$g=[System.Drawing.Graphics]::FromImage($bmp);$hdc=$g.GetHdc();[WC]::PrintWindow($calc.h,$hdc,2)|Out-Null;$g.ReleaseHdc($hdc);$g.Dispose()
$bmp.Save('c:\Users\fanli\Documents\zcodegunbound\beta\_calib_form.png',[System.Drawing.Imaging.ImageFormat]::Png)
# detect tan pixels (peach output boxes) across whole form
$minX=99999;$maxX=0
$rowHas=New-Object 'bool[]' $fh
for($y=0;$y -lt $fh;$y++){ for($x=[int]($fw*0.6);$x -lt $fw;$x++){ $c=$bmp.GetPixel($x,$y); if($c.R -gt 200 -and $c.G -gt 160 -and $c.G -lt 235 -and $c.B -gt 120 -and $c.B -lt 205 -and ($c.R-$c.B) -gt 35){ $rowHas[$y]=$true; if($x -lt $minX){$minX=$x}; if($x -gt $maxX){$maxX=$x} } } }
# cluster rows into bands
$bands=New-Object System.Collections.ArrayList; $s=-1
for($y=0;$y -lt $fh;$y++){ if($rowHas[$y] -and $s -lt 0){ $s=$y }; if((-not $rowHas[$y]) -and $s -ge 0){ if(($y-$s) -ge 4){ $null=$bands.Add(@{t=$s;b=$y-1}) }; $s=-1 } }
Write-Output ("tan X range: $minX..$maxX ; bands: $($bands.Count)")
$i=0
foreach($bd in $bands){ Write-Output ("  band[$i] y=$($bd.t)..$($bd.b) h=$($bd.b-$bd.t+1)"); $i++ }
# save per-box crops (x range fixed, each band), upscale 5x
$bx=$minX-2; $bw=($maxX-$minX)+5
$i=0
foreach($bd in $bands){ $bh=($bd.b-$bd.t)+3; $cr=New-Object System.Drawing.Bitmap $bw,$bh; $gg=[System.Drawing.Graphics]::FromImage($cr); $gg.DrawImage($bmp,(New-Object System.Drawing.Rectangle 0,0,$bw,$bh),(New-Object System.Drawing.Rectangle $bx,($bd.t-1),$bw,$bh),[System.Drawing.GraphicsUnit]::Pixel); $gg.Dispose(); $up=New-Object System.Drawing.Bitmap ($bw*5),($bh*5); $g5=[System.Drawing.Graphics]::FromImage($up); $g5.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor; $g5.DrawImage($cr,0,0,($bw*5),($bh*5)); $g5.Dispose(); $up.Save("c:\Users\fanli\Documents\zcodegunbound\beta\_box_$i.png",[System.Drawing.Imaging.ImageFormat]::Png); $cr.Dispose(); $up.Dispose(); $i++ }
$bmp.Dispose()
Write-Output ("saved $i box crops; bx=$bx bw=$bw")
