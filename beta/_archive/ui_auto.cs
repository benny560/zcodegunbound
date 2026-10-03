using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Threading;
using System.Diagnostics;

class P {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, int f);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, IntPtr i);
  [DllImport("user32.dll")] public static extern short VkKeyScan(char c);
  [DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, IntPtr i);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }

  static IntPtr foundHwnd = IntPtr.Zero;
  public static bool Cb(IntPtr h, IntPtr l) {
    uint pid; GetWindowThreadProcessId(h, out pid);
    if (pid == targetPid && IsWindowVisible(h)) {
      RECT r; GetWindowRect(h, out r);
      if (r.R - r.L > 100) { foundHwnd = h; }
    }
    return true;
  }
  static uint targetPid;

  static void Shot(IntPtr hwnd, string path) {
    RECT r; GetWindowRect(hwnd, out r);
    int w = r.R-r.L, h = r.B-r.T;
    Bitmap bmp = new Bitmap(w, h);
    Graphics g = Graphics.FromImage(bmp);
    IntPtr hdc = g.GetHdc();
    PrintWindow(hwnd, hdc, 0x2);
    g.ReleaseHdc(hdc);
    bmp.Save(path, ImageFormat.Png);
    Console.WriteLine("SHOT "+w+"x"+h+" -> "+path);
  }

  static void Click(int x, int y) {
    SetCursorPos(x, y);
    Thread.Sleep(100);
    mouse_event(0x2, 0,0,0, IntPtr.Zero); // down
    mouse_event(0x4, 0,0,0, IntPtr.Zero); // up
    Thread.Sleep(200);
  }

  public static int Main(string[] a) {
    // 启动
    var psi = new ProcessStartInfo("2.2.3.exe");
    psi.WorkingDirectory = System.IO.Path.GetDirectoryName(System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName);
    var proc = Process.Start(psi);
    Thread.Sleep(3000);
    targetPid = (uint)proc.Id;
    Console.WriteLine("PID="+targetPid);
    // 找主窗口
    EnumWindows(new EnumProc(Cb), IntPtr.Zero);
    if (foundHwnd == IntPtr.Zero) { Console.WriteLine("NO_WINDOW"); return 1; }
    ShowWindow(foundHwnd, 1); // restore
    Thread.Sleep(500);
    SetForegroundWindow(foundHwnd);
    Thread.Sleep(800);
    RECT r0; GetWindowRect(foundHwnd, out r0);
    Console.WriteLine("MAIN "+(r0.R-r0.L)+"x"+(r0.B-r0.T));
    Shot(foundHwnd, "step1_main.png");
    // 主窗口3按钮: 关于和说明(1) 右攻左(2) 左攻右(3). 窗口554x534.
    // 右攻左按钮位置: 第2个,大致在窗口中下偏左
    // 先截图看布局, 点击第2个按钮(右攻左)
    int cx = r0.L + (r0.R-r0.L)/2;
    // 3按钮通常纵向排列在中间, 第2个按钮约在 55%高度处
    Click(r0.L + 180, r0.T + 290);
    Thread.Sleep(1500);
    // 找新出现的子窗口
    foundHwnd = IntPtr.Zero;
    EnumWindows(new EnumProc(Cb), IntPtr.Zero);
    // 可能子窗口和主窗口都算, 取最大的
    Console.WriteLine("点击后 hwnd="+foundHwnd);
    Shot(foundHwnd, "step2_afterclick.png");
    return 0;
  }
}
