using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
class E {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, IntPtr i);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, int f);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  static uint tpid;
  static void Main(string[] a){
    string mode = a.Length>0?a[0]:"right"; // right/left
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    IntPtr mw=FindWin(); ShowWindow(mw,1); Thread.Sleep(400); SetForegroundWindow(mw); Thread.Sleep(800);
    RECT r; GetWindowRect(mw,out r); int W=r.R-r.L,H=r.B-r.T;
    // 右攻(50%,50%) 或 左攻(50%,35%)
    double yp = mode=="right"?0.50:0.35;
    int cx=r.L+(int)(W*0.50), cy=r.T+(int)(H*yp);
    Console.WriteLine("点 "+mode+" at ("+cx+","+cy+") = ("+(0.50)+","+yp+")");
    // 双击确保触发
    Click(cx,cy); Thread.Sleep(500);
    Click(cx,cy); Thread.Sleep(2500);
    // 枚举所有窗口看变化
    var all=new System.Collections.Generic.List<IntPtr>();
    EnumWindows(new EnumProc((h,l)=>{uint p;GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT rr;GetWindowRect(h,out rr); if(rr.R-rr.L>50) all.Add(h);} return true;}), IntPtr.Zero);
    Console.WriteLine("可见窗口数: "+all.Count);
    foreach(var w in all){ RECT rr; GetWindowRect(w,out rr); StringBuilder sb=new StringBuilder(200); GetWindowText(w,sb,200); Console.WriteLine("  "+(rr.R-rr.L)+"x"+(rr.B-rr.T)+" ["+sb+"]"); Shot(w,"enter_"+mode+"_"+(rr.R-rr.L)+".png"); }
    pr.Kill();
  }
  static IntPtr FindWin(){ IntPtr hw=IntPtr.Zero; EnumWindows(new EnumProc((h,l)=>{uint p;GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>50&&hw==IntPtr.Zero) hw=h;} return true;}), IntPtr.Zero); return hw; }
  static void Click(int x,int y){ SetCursorPos(x,y); Thread.Sleep(200); mouse_event(0x2,0,0,0,IntPtr.Zero); Thread.Sleep(50); mouse_event(0x4,0,0,0,IntPtr.Zero); Thread.Sleep(200); }
  static void Shot(IntPtr h,string p){ RECT r; GetWindowRect(h,out r); int w=r.R-r.L,hh=r.B-r.T; if(w<10)return; Bitmap b=new Bitmap(w,hh); Graphics g=Graphics.FromImage(b); IntPtr hd=g.GetHdc(); PrintWindow(h,hd,0x2); g.ReleaseHdc(hd); b.Save(p,ImageFormat.Png); }
}
