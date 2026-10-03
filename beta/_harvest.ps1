Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WH {
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
$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
$exe="$dir\2.2.3.exe"
$p=Get-Process -Name '2.2.3' -ErrorAction SilentlyContinue
if(-not $p){ Start-Process -FilePath $exe | Out-Null; Start-Sleep -Seconds 3; $p=Get-Process -Name '2.2.3' -ErrorAction SilentlyContinue }
$target=$p.Id
function AllForms { $script:ff=New-Object System.Collections.ArrayList; $cb=[WH+EnumProc]{ param($h,$l); $pp=0;[WH]::GetWindowThreadProcessId($h,[ref]$pp)|Out-Null; if($pp -eq $target){ $cn=New-Object System.Text.StringBuilder 256;[WH]::GetClassName($h,$cn,256)|Out-Null; if($cn.ToString() -eq 'ThunderRT6FormDC'){ $rc=New-Object WH+RECT;[WH]::GetWindowRect($h,[ref]$rc)|Out-Null; $null=$script:ff.Add([PSCustomObject]@{h=$h;L=$rc.L;T=$rc.T;w=($rc.R-$rc.L);ht=($rc.B-$rc.T)}) } }; return $true }; [WH]::EnumWindows($cb,[IntPtr]::Zero)|Out-Null; return $script:ff }
$calc=(AllForms)|Where-Object{$_.w -gt 400}|Select-Object -First 1
if(-not $calc){ $lz=(AllForms)|Where-Object{$_.w -le 400}|Select-Object -First 1; $b=[IntPtr]::Zero; $bcb=[WH+EnumProc]{ param($h,$l); if([WH]::GetDlgCtrlID($h) -eq 2){ $script:b=$h }; return $true }; [WH]::EnumChildWindows($lz.h,$bcb,[IntPtr]::Zero)|Out-Null; [WH]::SendMessage($b,0xF5,[IntPtr]::Zero,[IntPtr]::Zero)|Out-Null; Start-Sleep -Milliseconds 900; $calc=(AllForms)|Where-Object{$_.w -gt 400}|Select-Object -First 1 }
Write-Output ("calc at ($($calc.L),$($calc.T)) $($calc.w)x$($calc.ht)")
$ctrl=@{}; $cen=@{}
$ccb=[WH+EnumProc]{ param($h,$l); $id=[WH]::GetDlgCtrlID($h); $rc=New-Object WH+RECT;[WH]::GetWindowRect($h,[ref]$rc)|Out-Null; $script:ctrl[$id]=$h; $script:cen[$id]=@{x=[int](($rc.L+$rc.R)/2);y=[int](($rc.T+$rc.B)/2)}; return $true }
[WH]::EnumChildWindows($calc.h,$ccb,[IntPtr]::Zero)|Out-Null
$optIds=$ctrl.Keys | Where-Object { $_ -ge 18 -and $_ -le 65 } | Sort-Object
$optA=$optIds[0]; $optB=$optIds[24]
Add-Type -AssemblyName System.Drawing
$calcT=[WH]::GetWindowThreadProcessId($calc.h,[ref]([uint32]0)); $prev=[WH]::GetForegroundWindow(); $prevT=[WH]::GetWindowThreadProcessId($prev,[ref]([uint32]0)); $me=[WH]::GetCurrentThreadId()
[WH]::AttachThreadInput($me,$prevT,$true)|Out-Null; [WH]::AttachThreadInput($me,$calcT,$true)|Out-Null
[WH]::SetForegroundWindow($calc.h)|Out-Null; [WH]::BringWindowToTop($calc.h)|Out-Null; Start-Sleep -Milliseconds 200
$sv=New-Object WH+POINT;[WH]::GetCursorPos([ref]$sv)|Out-Null
function ClickId($id){ $c=$cen[$id]; [WH]::SetCursorPos($c.x,$c.y)|Out-Null; Start-Sleep -Milliseconds 35; [WH]::mouse_event(2,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 30; [WH]::mouse_event(4,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 70 }
function Sample($d,$h,$w){
  [WH]::SendMessageA($ctrl[14],0xC,[IntPtr]::Zero,"$d")|Out-Null
  [WH]::SendMessageA($ctrl[15],0xC,[IntPtr]::Zero,"$h")|Out-Null
  [WH]::SendMessageA($ctrl[13],0xC,[IntPtr]::Zero,"$w")|Out-Null
  Start-Sleep -Milliseconds 90
  ClickId 12; ClickId 11; ClickId 10; ClickId 9
  ClickId $optA; ClickId $optB
  Start-Sleep -Milliseconds 350
}
$list=@(@(5,0),@(10,0),@(15,0),@(25,0),@(35,0),@(45,0),@(20,-15),@(20,-8),@(20,5),@(20,15),@(40,-10),@(8,12))
$i=0
foreach($it in $list){
  Sample $it[0] $it[1] 0
  $fw=$calc.w;$fh=$calc.ht
  $bmp=New-Object System.Drawing.Bitmap $fw,$fh
  $g=[System.Drawing.Graphics]::FromImage($bmp);$hdc=$g.GetHdc();[WH]::PrintWindow($calc.h,$hdc,2)|Out-Null;$g.ReleaseHdc($hdc);$g.Dispose()
  $bmp.Save("$dir\_f_$i.png",[System.Drawing.Imaging.ImageFormat]::Png)
  # composite crop of output region, upscale 4x
  $cx=350;$cy=130;$cw=140;$ch=260
  $cr=New-Object System.Drawing.Bitmap $cw,$ch;$gg=[System.Drawing.Graphics]::FromImage($cr);$gg.DrawImage($bmp,(New-Object System.Drawing.Rectangle 0,0,$cw,$ch),(New-Object System.Drawing.Rectangle $cx,$cy,$cw,$ch),[System.Drawing.GraphicsUnit]::Pixel);$gg.Dispose()
  $up=New-Object System.Drawing.Bitmap ($cw*4),($ch*4);$g4=[System.Drawing.Graphics]::FromImage($up);$g4.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$g4.DrawImage($cr,0,0,($cw*4),($ch*4));$g4.Dispose()
  $up.Save("$dir\_cal_$i.png",[System.Drawing.Imaging.ImageFormat]::Png);$cr.Dispose();$up.Dispose();$bmp.Dispose()
  Write-Output ("sample $i : dist=$($it[0]) drop=$($it[1]) wind=0")
  $i++
}
[WH]::SetCursorPos($sv.X,$sv.Y)|Out-Null; [WH]::SetForegroundWindow($prev)|Out-Null
[WH]::AttachThreadInput($me,$calcT,$false)|Out-Null; [WH]::AttachThreadInput($me,$prevT,$false)|Out-Null
Write-Output ("HARVEST DONE: $i samples")
