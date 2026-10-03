using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
class S {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, int f);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  static uint tpid; static IntPtr hwnd;
  static bool Cb(IntPtr h, IntPtr l){ uint p; GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>50) hwnd=h;} return true; }
  static void Main(){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    EnumWindows(new EnumProc(Cb), IntPtr.Zero);
    ShowWindow(hwnd,1); Thread.Sleep(300); SetForegroundWindow(hwnd); Thread.Sleep(800);
    RECT r; GetWindowRect(hwnd,out r);
    Console.WriteLine("窗口 ("+r.L+","+r.T+") "+(r.R-r.L)+"x"+(r.B-r.T));
    // 放大2倍截图便于看清按钮
    int w=r.R-r.L, h=r.B-r.T;
    Bitmap b=new Bitmap(w,h); Graphics g=Graphics.FromImage(b); IntPtr hd=g.GetHdc(); PrintWindow(hwnd,hd,0x2); g.ReleaseHdc(hd);
    Bitmap big=new Bitmap(w*3,h*3);
    Graphics gb=Graphics.FromImage(big); gb.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
    gb.DrawImage(b,0,0,w*3,h*3);
    // 在图上画网格线辅助定位(每10%)
    Pen pen=new Pen(Color.Red,1);
    for(int i=1;i<10;i++){ gb.DrawLine(pen, w*3*i/10, 0, w*3*i/10, h*3); gb.DrawLine(pen, 0, h*3*i/10, w*3, h*3*i/10); }
    big.Save("main_big.png",ImageFormat.Png);
    Console.WriteLine("放大3倍+网格 已保存 main_big.png");
    pr.Kill();
  }
}
