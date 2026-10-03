using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
class P {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, int f);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern IntPtr PostMessage(IntPtr h, uint msg, IntPtr wp, IntPtr lp);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint msg, IntPtr wp, IntPtr lp);
  [DllImport("user32.dll")] public static extern ushort MakeLParam(int x, int y); // 不存在,自己算
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  static uint tpid;
  const uint WM_LBUTTONDOWN=0x201, WM_LBUTTONUP=0x202, BM_CLICK=0xF5;
  static void Main(string[] a){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    IntPtr mw=FindWin(); ShowWindow(mw,1); Thread.Sleep(400); SetForegroundWindow(mw); Thread.Sleep(800);
    RECT r; GetWindowRect(mw,out r); int W=r.R-r.L,H=r.B-r.T;
    // 尝试方法1: 在窗口客户区(50%,50%)位置发mouse消息
    // 客户区坐标(相对窗口左上角,去掉标题栏约30px)
    int cx=W/2, cy=H/2;
    IntPtr lp=(IntPtr)((cy<<16)|cx);
    Console.WriteLine("发WM_LBUTTONDOWN/UP到 ("+cx+","+cy+")");
    PostMessage(mw, WM_LBUTTONDOWN, IntPtr.Zero, lp);
    Thread.Sleep(100);
    PostMessage(mw, WM_LBUTTONUP, IntPtr.Zero, lp);
    Thread.Sleep(2000);
    Shot(FindWin(),"post_center.png");
    // 方法2: 枚举子窗口(VB6按钮可能是子window),直接给按钮发BM_CLICK
    var childs=new System.Collections.Generic.List<IntPtr>();
    EnumChildWindows(mw, new EnumProc((h,l)=>{childs.Add(h); return true;}), IntPtr.Zero);
    Console.WriteLine("子窗口数: "+childs.Count);
    foreach(var c in childs){ StringBuilder sb=new StringBuilder(100); GetWindowText(c,sb,100); GetClassName(c,new StringBuilder(100),100); RECT cr; GetWindowRect(c,out cr); Console.WriteLine("  child cls="+GetCls(c)+" ["+sb+"] "+(cr.R-cr.L)+"x"+(cr.B-cr.T)); }
    pr.Kill();
  }
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  static string GetCls(IntPtr h){ StringBuilder s=new StringBuilder(100); GetClassName(h,s,100); return s.ToString(); }
  static IntPtr FindWin(){ IntPtr hw=IntPtr.Zero; EnumWindows(new EnumProc((h,l)=>{uint p;GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>50&&hw==IntPtr.Zero) hw=h;} return true;}), IntPtr.Zero); return hw; }
  static void Shot(IntPtr h,string p){ RECT r; GetWindowRect(h,out r); int w=r.R-r.L,hh=r.B-r.T; if(w<10)return; Bitmap b=new Bitmap(w,hh); Graphics g=Graphics.FromImage(b); IntPtr hd=g.GetHdc(); PrintWindow(h,hd,0x2); g.ReleaseHdc(hd); b.Save(p,ImageFormat.Png); }
}
