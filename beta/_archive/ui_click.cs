using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
class C {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, IntPtr i);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, int f);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  static uint tpid; static IntPtr hwnd;
  static bool Cb(IntPtr h, IntPtr l){ uint p; GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>50) hwnd=h;} return true; }
  static IntPtr FindWin(){ hwnd=IntPtr.Zero; EnumWindows(new EnumProc(Cb), IntPtr.Zero); return hwnd; }
  static void Click(int x, int y){ SetCursorPos(x,y); Thread.Sleep(150); mouse_event(0x2,0,0,0,IntPtr.Zero); mouse_event(0x4,0,0,0,IntPtr.Zero); Thread.Sleep(300); }
  static void Shot(IntPtr h, string p){ RECT r; GetWindowRect(h,out r); int w=r.R-r.L,hh=r.B-r.T; Bitmap b=new Bitmap(w,hh); Graphics g=Graphics.FromImage(b); IntPtr hd=g.GetHdc(); PrintWindow(h,hd,0x2); g.ReleaseHdc(hd); b.Save(p,ImageFormat.Png); }
  static void Main(string[] a){
    int targetY = int.Parse(a[0]); // 要点击的y百分比*100
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    IntPtr mw=FindWin(); ShowWindow(mw,1); Thread.Sleep(300); SetForegroundWindow(mw); Thread.Sleep(500);
    RECT r; GetWindowRect(mw,out r); int W=r.R-r.L,H=r.B-r.T;
    int cy=r.T+(int)(H*targetY/100.0), cx=r.L+W/2;
    Console.WriteLine("click ("+cx+","+cy+") y%="+targetY);
    Click(cx,cy); Thread.Sleep(1500);
    // 检查是否出现新窗口(更大 或 数量变多)
    IntPtr w2=FindWin();
    RECT r2; GetWindowRect(w2,out r2);
    Console.WriteLine("after win "+(r2.R-r2.L)+"x"+(r2.B-r2.T));
    Shot(w2, "click_y"+targetY+".png");
    pr.Kill();
  }
}
