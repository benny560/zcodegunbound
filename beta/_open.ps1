Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WO {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint msg, IntPtr wp, IntPtr lp);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
}
"@
$exe='c:\Users\fanli\Documents\zcodegunbound\beta\2.2.3.exe'
$p=Get-Process -Name '2.2.3' -ErrorAction SilentlyContinue
if(-not $p){ Start-Process -FilePath $exe | Out-Null; Start-Sleep -Seconds 3; $p=Get-Process -Name '2.2.3' -ErrorAction SilentlyContinue }
$target=$p.Id
Write-Output ("pid=$target")
function Find-Forms { $r=New-Object System.Collections.ArrayList; $cb=[WO+EnumProc]{ param($h,$l); $pp=0;[WO]::GetWindowThreadProcessId($h,[ref]$pp)|Out-Null; if($pp -eq $target){ $cn=New-Object System.Text.StringBuilder 256;[WO]::GetClassName($h,$cn,256)|Out-Null; if($cn.ToString() -eq 'ThunderRT6FormDC'){ $rc=New-Object WO+RECT;[WO]::GetWindowRect($h,[ref]$rc)|Out-Null; $null=$script:ff.Add([PSCustomObject]@{h=$h;w=($rc.R-$rc.L)}) } }; return $true }; $script:ff=$r; [WO]::EnumWindows($cb,[IntPtr]::Zero)|Out-Null; return $r }
$forms=Find-Forms
$calc=$forms | Where-Object { $_.w -gt 400 } | Select-Object -First 1
if(-not $calc){
  $launcher=$forms | Where-Object { $_.w -le 400 } | Select-Object -First 1
  if($launcher){
    $btn=[IntPtr]::Zero; $bcb=[WO+EnumProc]{ param($h,$l); if([WO]::GetDlgCtrlID($h) -eq 2){ $script:btn=$h }; return $true }; [WO]::EnumChildWindows($launcher.h,$bcb,[IntPtr]::Zero)|Out-Null
    Write-Output ("clicking right-attack button=$btn")
    [WO]::SendMessage($btn,0xF5,[IntPtr]::Zero,[IntPtr]::Zero)|Out-Null
    Start-Sleep -Milliseconds 900
    $forms=Find-Forms; $calc=$forms | Where-Object { $_.w -gt 400 } | Select-Object -First 1
  }
}
if($calc){ Write-Output ("CALC OPEN hwnd=$($calc.h) w=$($calc.w)") } else { Write-Output 'CALC NOT OPEN' }
