Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll", CharSet=CharSet.Ansi)] public static extern int GetWindowTextA(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
}
"@
$target = (Get-Process -Name '2.2.3' -ErrorAction SilentlyContinue | Select-Object -First 1).Id
# find the ThunderRT6FormDC form window
$form=[IntPtr]::Zero
$fcb=[W+EnumProc]{ param($h,$l)
  $pid2=0; [W]::GetWindowThreadProcessId($h,[ref]$pid2)|Out-Null
  if($pid2 -eq $target){ $cn=New-Object System.Text.StringBuilder 256; [W]::GetClassName($h,$cn,256)|Out-Null; if($cn.ToString() -eq 'ThunderRT6FormDC'){ $script:form=$h } }
  return $true }
[W]::EnumWindows($fcb,[IntPtr]::Zero)|Out-Null
Write-Output ("FORM hwnd=$form")
$fr=New-Object W+RECT; [W]::GetWindowRect($form,[ref]$fr)|Out-Null
Write-Output ("FORM rect=($($fr.L),$($fr.T))-($($fr.R),$($fr.B)) size=$(($fr.R-$fr.L))x$(($fr.B-$fr.T))")
# enumerate child controls
$rows=New-Object System.Collections.ArrayList
$ccb=[W+EnumProc]{ param($h,$l)
  $cn=New-Object System.Text.StringBuilder 256; [W]::GetClassName($h,$cn,256)|Out-Null
  $tb=New-Object System.Text.StringBuilder 512; [W]::GetWindowTextA($h,$tb,512)|Out-Null
  $r=New-Object W+RECT; [W]::GetWindowRect($h,[ref]$r)|Out-Null
  $id=[W]::GetDlgCtrlID($h)
  $null=$rows.Add([PSCustomObject]@{h=$h;id=$id;cls=$cn.ToString();txt=$tb.ToString();vis=[W]::IsWindowVisible($h);L=$r.L;T=$r.T;R=$r.R;B=$r.B})
  return $true }
[W]::EnumChildWindows($form,$ccb,[IntPtr]::Zero)|Out-Null
Write-Output ("CHILD COUNT=$($rows.Count)")
$rows | Sort-Object T,L | ForEach-Object {
  Write-Output ("id={0,-5} {1,-24} vis={2} rect=({3},{4})-({5},{6}) txt='{7}' hwnd={8}" -f $_.id,$_.cls,$_.vis,$_.L,$_.T,$_.R,$_.B,$_.txt,$_.h)
}
# PrintWindow capture of the form (works even if occluded)
Add-Type -AssemblyName System.Drawing
$w=$fr.R-$fr.L; $hh=$fr.B-$fr.T
$bmp=New-Object System.Drawing.Bitmap $w,$hh
$g=[System.Drawing.Graphics]::FromImage($bmp)
$hdc=$g.GetHdc()
[W]::PrintWindow($form,$hdc,2)|Out-Null
$g.ReleaseHdc($hdc); $g.Dispose()
$out='c:\Users\fanli\Documents\zcodegunbound\beta\_form_pw.png'
$bmp.Save($out,[System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
Write-Output ("SAVED $out ${w}x${hh}")
