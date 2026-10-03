using System;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Generic;
class Probe {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern IntPtr PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  static uint tpid;
  static void Main(string[] a){
    string btn = a.Length>0?a[0]:"右攻左";
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    IntPtr mw=FindWin(); 
    // 点击主窗口的按钮进入子界面
    var mainChilds=new List<IntPtr>();
    EnumChildWindows(mw, new EnumProc((h,l)=>{mainChilds.Add(h);return true;}), IntPtr.Zero);
    foreach(var c in mainChilds){ StringBuilder sb=new StringBuilder(100); GetWindowText(c,sb,100); if(sb.ToString().Contains(btn)){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0x50005); Thread.Sleep(80); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0x50005); break; } }
    Thread.Sleep(3000);
    // 找子界面窗口(现在标题是btn)
    IntPtr sub=FindWin();
    RECT sr; GetWindowRect(sub,out sr);
    Console.WriteLine("子界面 "+(sr.R-sr.L)+"x"+(sr.B-sr.T)+" at ("+sr.L+","+sr.T+")");
    // 枚举子界面所有子控件
    var all=new List<IntPtr>();
    EnumChildWindows(sub, new EnumProc((h,l)=>{all.Add(h);return true;}), IntPtr.Zero);
    Console.WriteLine("子控件数: "+all.Count);
    foreach(var c in all){
      StringBuilder cls=new StringBuilder(80); GetClassName(c,cls,80);
      StringBuilder txt=new StringBuilder(100); GetWindowText(c,txt,100);
      RECT r; GetWindowRect(c,out r);
      // 客户区相对坐标(相对子界面左上角)
      int rx=r.L-sr.L, ry=r.T-sr.T;
      int w=r.R-r.L, h=r.B-r.T;
      bool vis=IsWindowVisible(c);
      Console.WriteLine("  cls="+cls+" text=["+txt+"] "+w+"x"+h+" rel("+rx+","+ry+") vis="+vis);
    }
    pr.Kill();
  }
  static IntPtr FindWin(){ IntPtr hw=IntPtr.Zero; EnumWindows(new EnumProc((h,l)=>{uint p;GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>200&&hw==IntPtr.Zero) hw=h;} return true;}), IntPtr.Zero); return hw; }
}
