Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WU {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
}
"@
$target=(Get-Process -Name '2.2.3' -ErrorAction SilentlyContinue|Select-Object -First 1).Id
$calc=[IntPtr]::Zero
$fcb=[WU+EnumProc]{ param($h,$l); $p=0;[WU]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null; if($p -eq $target){ $cn=New-Object System.Text.StringBuilder 256;[WU]::GetClassName($h,$cn,256)|Out-Null; if($cn.ToString() -eq 'ThunderRT6FormDC'){ $r=New-Object WU+RECT;[WU]::GetWindowRect($h,[ref]$r)|Out-Null; if(($r.R-$r.L) -gt 400){ $script:calc=$h } } }; return $true }
[WU]::EnumWindows($fcb,[IntPtr]::Zero)|Out-Null
Write-Output ("CALC hwnd=$calc")
if($calc -eq [IntPtr]::Zero){ Write-Output 'NO CALC'; exit }
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$ae=[System.Windows.Automation.AutomationElement]::FromHandle($calc)
$walker=[System.Windows.Automation.TreeWalker]::RawViewWalker
$script:cnt=0
function Walk($el,$depth){
  if($el -eq $null){ return }
  $script:cnt++
  try { $n=$el.Current.Name } catch { $n='<err>' }
  try { $ct=$el.Current.ControlType.ProgrammaticName -replace 'ControlType.','' } catch { $ct='?' }
  try { $cls=$el.Current.ClassName } catch { $cls='' }
  Write-Output ((' '*($depth*2)) + ("[{0}] cls={1} name='{2}'" -f $ct,$cls,$n))
  $c=$walker.GetFirstChild($el)
  while($c -ne $null){ Walk $c ($depth+1); $c=$walker.GetNextSibling($c) }
}
Walk $ae 0
Write-Output ("TOTAL RAW NODES: $($script:cnt)")
