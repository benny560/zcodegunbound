using System;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Generic;
class Calc {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern IntPtr PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, StringBuilder l);
  [DllImport("user32.dll")] public static extern bool ScreenToClient(IntPtr h, ref POINT p);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; }
  static uint tpid;
  const uint WM_SETTEXT=0x000C, WM_GETTEXT=0x000D;
  static IntPtr FindWin(){ IntPtr hw=IntPtr.Zero; EnumWindows(new EnumProc((h,l)=>{uint p;GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>200&&hw==IntPtr.Zero) hw=h;} return true;}), IntPtr.Zero); return hw; }
  static List<IntPtr> Childs(IntPtr p){ var a=new List<IntPtr>(); EnumChildWindows(p,new EnumProc((h,l)=>{a.Add(h);return true;}),IntPtr.Zero); return a; }
  static string Txt(IntPtr h){ StringBuilder s=new StringBuilder(200); GetWindowText(h,s,200); return s.ToString(); }
  static string Cls(IntPtr h){ StringBuilder s=new StringBuilder(80); GetClassName(h,s,80); return s.ToString(); }
  // 找rel坐标最接近(rx,ry)的TextBox
  static IntPtr FindBox(IntPtr sub, int rx, int ry){
    RECT sr; GetWindowRect(sub,out sr);
    foreach(var c in Childs(sub)){
      if(Cls(c)!="ThunderRT6TextBox") continue;
      RECT cr; GetWindowRect(c,out cr);
      int cx=cr.L-sr.L, cy=cr.T-sr.T;
      if(Math.Abs(cx-rx)<20 && Math.Abs(cy-ry)<20) return c;
    }
    return IntPtr.Zero;
  }
  static void Main(string[] a){
    // 参数: dist elev wind  (如: 20 0 0)
    double dist=double.Parse(a[0]), elev=a.Length>1?double.Parse(a[1]):0, wind=a.Length>2?double.Parse(a[2]):0;
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    IntPtr main=FindWin();
    // 点"右攻左"进入
    foreach(var c in Childs(main)){ if(Txt(c).Contains("右攻左")){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0x50005); Thread.Sleep(80); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0x50005); break; } }
    Thread.Sleep(3000);
    IntPtr sub=FindWin();
    // 距离框 rel(58,67), 落差框 rel(173,67), 风力框 rel(285,67)
    IntPtr boxDist=FindBox(sub,58,67), boxElev=FindBox(sub,173,67), boxWind=FindBox(sub,285,67);
    Console.WriteLine("距离框="+boxDist+" 落差框="+boxElev+" 风力框="+boxWind);
    // 设值
    if(boxDist!=IntPtr.Zero) SendMessage(boxDist,WM_SETTEXT,IntPtr.Zero,new StringBuilder(dist.ToString()));
    if(boxElev!=IntPtr.Zero) SendMessage(boxElev,WM_SETTEXT,IntPtr.Zero,new StringBuilder(elev.ToString()));
    if(boxWind!=IntPtr.Zero) SendMessage(boxWind,WM_SETTEXT,IntPtr.Zero,new StringBuilder(wind.ToString()));
    // 触发change事件: 发EN_CHANGE. VB6 TextBox设值后需要焦点离开或回车才触发change
    // 用PostMessage WM_KEYDOWN VK_RETURN
    Thread.Sleep(1500);
    // 读取所有控件文本(找结果显示)
    Console.WriteLine("=== 输入 dist="+dist+" elev="+elev+" wind="+wind+" 后所有非空控件 ===");
    foreach(var c in Childs(sub)){
      string t=Txt(c); string cl=Cls(c);
      if(string.IsNullOrEmpty(t)) continue;
      RECT cr; GetWindowRect(c,out cr); RECT sr; GetWindowRect(sub,out sr);
      int rx=cr.L-sr.L, ry=cr.T-sr.T;
      if(cl.Contains("Option")||cl.Contains("Frame")) continue; // 跳过风向选项
      Console.WriteLine("  ["+cl.Replace("ThunderRT6","")+"] rel("+rx+","+ry+") = "+t);
    }
    pr.Kill();
  }
}
