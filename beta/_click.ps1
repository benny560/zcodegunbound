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
  [DllImport("user32.dll", CharSet=CharSet.Ansi)] public static extern IntPtr SendMessageA(IntPtr h, uint msg, IntPtr wp, byte[] lp);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint msg, IntPtr wp, IntPtr lp);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
}
"@
$enc=[System.Text.Encoding]::GetEncoding(936)
function Get-Txt($h){ $buf=New-Object byte[] 512; $n=[W]::SendMessageA($h,0xD,[IntPtr]512,$buf); if($n -gt 0){ return $enc.GetString($buf,0,[int]$n) } return '' }
$target=(Get-Process -Name '2.2.3' -ErrorAction SilentlyContinue | Select-Object -First 1).Id
# find launcher form + button id=2 (right attack)
$launcher=[IntPtr]::Zero
$fcb=[W+EnumProc]{ param($h,$l); $p=0;[W]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null; if($p -eq $target){ $cn=New-Object System.Text.StringBuilder 256;[W]::GetClassName($h,$cn,256)|Out-Null; if($cn.ToString() -eq 'ThunderRT6FormDC'){ $script:launcher=$h } }; return $true }
[W]::EnumWindows($fcb,[IntPtr]::Zero)|Out-Null
$btn=[IntPtr]::Zero
$bcb=[W+EnumProc]{ param($h,$l); if([W]::GetDlgCtrlID($h) -eq 2){ $script:btn=$h }; return $true }
[W]::EnumChildWindows($launcher,$bcb,[IntPtr]::Zero)|Out-Null
Write-Output ("launcher=$launcher rightBtn=$btn")
[W]::SendMessage($btn,0xF5,[IntPtr]::Zero,[IntPtr]::Zero)|Out-Null   # BM_CLICK
Start-Sleep -Milliseconds 900
# enumerate ALL top forms now
$forms=New-Object System.Collections.ArrayList
$acb=[W+EnumProc]{ param($h,$l); $p=0;[W]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null; if($p -eq $target){ $cn=New-Object System.Text.StringBuilder 256;[W]::GetClassName($h,$cn,256)|Out-Null; if([W]::IsWindowVisible($h) -and $cn.ToString() -like 'ThunderRT6*'){ $null=$script:forms.Add($h) } }; return $true }
[W]::EnumWindows($acb,[IntPtr]::Zero)|Out-Null
Write-Output ("VISIBLE ThunderRT6 top windows: $($forms.Count)")
Add-Type -AssemblyName System.Drawing
$i=0
foreach($f in $forms){
  $fr=New-Object W+RECT;[W]::GetWindowRect($f,[ref]$fr)|Out-Null
  $cn=New-Object System.Text.StringBuilder 256;[W]::GetClassName($f,$cn,256)|Out-Null
  Write-Output ("=== FORM[$i] hwnd=$f cls=$($cn.ToString()) rect=($($fr.L),$($fr.T))-($($fr.R),$($fr.B)) size=$(($fr.R-$fr.L))x$(($fr.B-$fr.T)) ===")
  $rows=New-Object System.Collections.ArrayList
  $ccb=[W+EnumProc]{ param($h,$l); $c=New-Object System.Text.StringBuilder 256;[W]::GetClassName($h,$c,256)|Out-Null; $r=New-Object W+RECT;[W]::GetWindowRect($h,[ref]$r)|Out-Null; $null=$script:rows.Add([PSCustomObject]@{h=$h;id=[W]::GetDlgCtrlID($h);cls=$c.ToString();txt=(Get-Txt $h);L=$r.L;T=$r.T;R=$r.R;B=$r.B;vis=[W]::IsWindowVisible($h)}); return $true }
  [W]::EnumChildWindows($f,$ccb,[IntPtr]::Zero)|Out-Null
  $rows | Sort-Object T,L | ForEach-Object { Write-Output ("  id={0,-4} {1,-24} vis={2} ({3},{4})-({5},{6}) '{7}' hwnd={8}" -f $_.id,$_.cls,$_.vis,$_.L,$_.T,$_.R,$_.B,$_.txt,$_.h) }
  if(($fr.R-$fr.L) -gt 20){ $bmp=New-Object System.Drawing.Bitmap ($fr.R-$fr.L),($fr.B-$fr.T); $g=[System.Drawing.Graphics]::FromImage($bmp); $hdc=$g.GetHdc(); [W]::PrintWindow($f,$hdc,2)|Out-Null; $g.ReleaseHdc($hdc); $g.Dispose(); $o="c:\Users\fanli\Documents\zcodegunbound\beta\_form_$i.png"; $bmp.Save($o,[System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); Write-Output ("  SAVED $o") }
  $i++
}
