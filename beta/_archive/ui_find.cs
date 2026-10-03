using System;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
class Q {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  static uint tpid; static IntPtr hwnd;
  static bool Cb(IntPtr h, IntPtr l){ uint p; GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>50) hwnd=h;} return true; }
  static void Main(){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    EnumWindows(new EnumProc(Cb), IntPtr.Zero);
    ShowWindow(hwnd,1); Thread.Sleep(300); SetForegroundWindow(hwnd); Thread.Sleep(500);
    RECT r; GetWindowRect(hwnd, out r);
    int W=r.R-r.L, H=r.B-r.T;
    Console.WriteLine("WIN "+W+"x"+H+" at ("+r.L+","+r.T+")");
    // 3按钮纵向排列在中央, 按VB6标准布局:
    // "左攻" 约在 40% 高度, "右攻" 约 55%, "关于和说" 约 85%
    // 输出多个候选点击点的绝对坐标(供选择)
    for(double py=0.35; py<=0.9; py+=0.1){
      Console.WriteLine("  y="+py.ToString("0.00")+" -> ("+(r.L+(int)(W*0.5))+","+(r.T+(int)(H*py))+")");
    }
  }
}
