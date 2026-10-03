param([string]$dist='200',[string]$drop='0',[string]$wind='0',[int]$optX=447,[int]$optY=329,[string]$tag='r1')
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll", CharSet=CharSet.Ansi)] public static extern IntPtr SendMessageA(IntPtr h, uint msg, IntPtr wp, string lp);
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
$target=(Get-Process -Name '2.2.3' -ErrorAction SilentlyContinue|Select-Object -First 1).Id
$calc=[IntPtr]::Zero
$fcb=[W+EnumProc]{ param($h,$l); $p=0;[W]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null; if($p -eq $target){ $cn=New-Object System.Text.StringBuilder 256;[W]::GetClassName($h,$cn,256)|Out-Null; if($cn.ToString() -eq 'ThunderRT6FormDC'){ $r=New-Object W+RECT;[W]::GetWindowRect($h,[ref]$r)|Out-Null; if(($r.R-$r.L) -gt 400){ $script:calc=$h } } }; return $true }
[W]::EnumWindows($fcb,[IntPtr]::Zero)|Out-Null
if($calc -eq [IntPtr]::Zero){ Write-Output 'NO CALC FORM'; exit }
$ctrl=@{}
$ccb=[W+EnumProc]{ param($h,$l); $script:ctrl[[W]::GetDlgCtrlID($h)]=$h; return $true }
[W]::EnumChildWindows($calc,$ccb,[IntPtr]::Zero)|Out-Null
# 1) set the three inputs exactly (WM_SETTEXT=0x000C)
[W]::SendMessageA($ctrl[14],0xC,[IntPtr]::Zero,$dist)|Out-Null
[W]::SendMessageA($ctrl[15],0xC,[IntPtr]::Zero,$drop)|Out-Null
[W]::SendMessageA($ctrl[13],0xC,[IntPtr]::Zero,$wind)|Out-Null
Start-Sleep -Milliseconds 120
# 2) raise calc above other windows, then real-click the wind option to trigger Option_Click compute
$calcThread=[W]::GetWindowThreadProcessId($calc,[ref]([uint32]0))
$prevFg=[W]::GetForegroundWindow()
$fgThread=[W]::GetWindowThreadProcessId($prevFg,[ref]([uint32]0))
$me=[W]::GetCurrentThreadId()
[W]::AttachThreadInput($me,$fgThread,$true)|Out-Null
[W]::AttachThreadInput($me,$calcThread,$true)|Out-Null
[W]::SetForegroundWindow($calc)|Out-Null; [W]::BringWindowToTop($calc)|Out-Null
Start-Sleep -Milliseconds 200
$save=New-Object W+POINT;[W]::GetCursorPos([ref]$save)|Out-Null
function ClickAt($x,$y){ [W]::SetCursorPos($x,$y)|Out-Null; Start-Sleep -Milliseconds 60; [W]::mouse_event(2,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 50; [W]::mouse_event(4,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 120 }
# Option_Click only fires when the SELECTED option changes. Click a reset dot first, then the target dot,
# so the target's Click event (which computes) always fires even if it was already selected.
$rstX=447; $rstY=329   # top dot = reset
if($optX -eq $rstX -and $optY -eq $rstY){ $rstX=587; $rstY=417 }  # avoid reset==target
# First fire TextBox_Change via real +1/-1 nudges so the module variables get the entered values
# (WM_SETTEXT alone does NOT fire VB Change). Net change is zero, so displayed value stays exact.
ClickAt 397 265; ClickAt 397 277   # 距离 +1 then -1
ClickAt 511 265; ClickAt 511 277   # 落差 +1 then -1
ClickAt $rstX $rstY
ClickAt $optX $optY
Start-Sleep -Milliseconds 500
[W]::SetCursorPos($save.X,$save.Y)|Out-Null
[W]::SetForegroundWindow($prevFg)|Out-Null
[W]::AttachThreadInput($me,$calcThread,$false)|Out-Null
[W]::AttachThreadInput($me,$fgThread,$false)|Out-Null
# 3) capture form + crop the output frame
$fr=New-Object W+RECT;[W]::GetWindowRect($calc,[ref]$fr)|Out-Null
$fw=$fr.R-$fr.L;$fh=$fr.B-$fr.T
Add-Type -AssemblyName System.Drawing
$bmp=New-Object System.Drawing.Bitmap $fw,$fh
$g=[System.Drawing.Graphics]::FromImage($bmp);$hdc=$g.GetHdc();[W]::PrintWindow($calc,$hdc,2)|Out-Null;$g.ReleaseHdc($hdc);$g.Dispose()
$bmp.Save("c:\Users\fanli\Documents\zcodegunbound\beta\_s_$tag.png",[System.Drawing.Imaging.ImageFormat]::Png)
$cx=350;$cy=108;$cw=135;$ch=345
$crop=New-Object System.Drawing.Bitmap $cw,$ch
$g2=[System.Drawing.Graphics]::FromImage($crop)
$g2.DrawImage($bmp,(New-Object System.Drawing.Rectangle 0,0,$cw,$ch),(New-Object System.Drawing.Rectangle $cx,$cy,$cw,$ch),[System.Drawing.GraphicsUnit]::Pixel);$g2.Dispose()
$big=New-Object System.Drawing.Bitmap ($cw*3),($ch*3)
$g3=[System.Drawing.Graphics]::FromImage($big);$g3.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$g3.DrawImage($crop,0,0,($cw*3),($ch*3));$g3.Dispose()
$big.Save("c:\Users\fanli\Documents\zcodegunbound\beta\_out_$tag.png",[System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose();$crop.Dispose();$big.Dispose()
Write-Output ("DONE tag=$tag dist=$dist drop=$drop wind=$wind opt=($optX,$optY)")
