param([string]$dist='200',[string]$drop='0',[string]$wind='0',[int]$optId=65,[string]$tag='t1')
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll", CharSet=CharSet.Ansi)] public static extern IntPtr SendMessageA(IntPtr h, uint msg, IntPtr wp, string lp);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint msg, IntPtr wp, IntPtr lp);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
}
"@
$target=(Get-Process -Name '2.2.3' -ErrorAction SilentlyContinue|Select-Object -First 1).Id
# find the 497x468 calc form (ThunderRT6FormDC that is NOT the launcher)
$calc=[IntPtr]::Zero
$fcb=[W+EnumProc]{ param($h,$l); $p=0;[W]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null; if($p -eq $target){ $cn=New-Object System.Text.StringBuilder 256;[W]::GetClassName($h,$cn,256)|Out-Null; if($cn.ToString() -eq 'ThunderRT6FormDC'){ $r=New-Object W+RECT;[W]::GetWindowRect($h,[ref]$r)|Out-Null; if(($r.R-$r.L) -gt 400){ $script:calc=$h } } }; return $true }
[W]::EnumWindows($fcb,[IntPtr]::Zero)|Out-Null
if($calc -eq [IntPtr]::Zero){ Write-Output 'NO CALC FORM'; exit }
# map control hwnds by id
$ctrl=@{}
$ccb=[W+EnumProc]{ param($h,$l); $script:ctrl[[W]::GetDlgCtrlID($h)]=$h; return $true }
[W]::EnumChildWindows($calc,$ccb,[IntPtr]::Zero)|Out-Null
# set the 3 textboxes: 14=距离 15=落差 13=风量 (WM_SETTEXT=0x000C)
[W]::SendMessageA($ctrl[14],0xC,[IntPtr]::Zero,$dist)|Out-Null
[W]::SendMessageA($ctrl[15],0xC,[IntPtr]::Zero,$drop)|Out-Null
[W]::SendMessageA($ctrl[13],0xC,[IntPtr]::Zero,$wind)|Out-Null
Start-Sleep -Milliseconds 150
# Trigger VB event handlers by posting the notifications the form normally receives.
# WM_COMMAND=0x111; EN_CHANGE=0x300 (textbox changed); BN_CLICKED=0 (button/option clicked). lParam=control hwnd.
function Notify($ctrlId,$code){ $wp=[IntPtr]((([int]$code) -shl 16) -bor ([int]$ctrlId)); [W]::SendMessage($calc,0x111,$wp,$ctrl[$ctrlId])|Out-Null }
if($ctrl.ContainsKey($optId)){ Notify $optId 0 }      # option clicked (wind dir)
Notify 13 0x300                                          # 风量 change
Notify 15 0x300                                          # 落差 change
Notify 14 0x300                                          # 距离 change (do last)
Start-Sleep -Milliseconds 500
# PrintWindow whole form
$fr=New-Object W+RECT;[W]::GetWindowRect($calc,[ref]$fr)|Out-Null
$fw=$fr.R-$fr.L;$fh=$fr.B-$fr.T
Add-Type -AssemblyName System.Drawing
$bmp=New-Object System.Drawing.Bitmap $fw,$fh
$g=[System.Drawing.Graphics]::FromImage($bmp);$hdc=$g.GetHdc();[W]::PrintWindow($calc,$hdc,2)|Out-Null;$g.ReleaseHdc($hdc);$g.Dispose()
$bmp.Save("c:\Users\fanli\Documents\zcodegunbound\beta\_s_$tag.png",[System.Drawing.Imaging.ImageFormat]::Png)
# crop the 攻击方式 output frame (form-relative ~ x354..485 y108..450) and scale 3x
$cx=350;$cy=108;$cw=135;$ch=345
$crop=New-Object System.Drawing.Bitmap $cw,$ch
$g2=[System.Drawing.Graphics]::FromImage($crop)
$g2.DrawImage($bmp,(New-Object System.Drawing.Rectangle 0,0,$cw,$ch),(New-Object System.Drawing.Rectangle $cx,$cy,$cw,$ch),[System.Drawing.GraphicsUnit]::Pixel)
$g2.Dispose()
$big=New-Object System.Drawing.Bitmap ($cw*3),($ch*3)
$g3=[System.Drawing.Graphics]::FromImage($big);$g3.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g3.DrawImage($crop,0,0,($cw*3),($ch*3));$g3.Dispose()
$big.Save("c:\Users\fanli\Documents\zcodegunbound\beta\_out_$tag.png",[System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose();$crop.Dispose();$big.Dispose()
Write-Output ("DONE tag=$tag dist=$dist drop=$drop wind=$wind opt=$optId  form=${fw}x${fh}")
