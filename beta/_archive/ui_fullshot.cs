using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
class FS {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern IntPtr PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, int f);
  [DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, IntPtr i);
  [DllImport("user32.dll")] public static extern ushort VkKeyScan(char c);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  static uint tpid;
  static IntPtr FindWin(){ IntPtr hw=IntPtr.Zero; EnumWindows(new EnumProc((h,l)=>{uint p;GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>200&&hw==IntPtr.Zero) hw=h;} return true;}), IntPtr.Zero); return hw; }
  static List<IntPtr> Childs(IntPtr p){ var a=new List<IntPtr>(); EnumChildWindows(p,new EnumProc((h,l)=>{a.Add(h);return true;}),IntPtr.Zero); return a; }
  static string Txt(IntPtr h){ StringBuilder s=new StringBuilder(300); GetWindowText(h,s,300); return s.ToString(); }
  static string Cl(IntPtr h){ StringBuilder s=new StringBuilder(80); GetClassName(h,s,80); return s.ToString(); }
  static void Type(string text){ keybd_event(0x11,0,0,IntPtr.Zero); keybd_event(0x41,0,0,IntPtr.Zero); keybd_event(0x41,0,2,IntPtr.Zero); keybd_event(0x11,0,2,IntPtr.Zero); keybd_event(0x2E,0,0,IntPtr.Zero); keybd_event(0x2E,0,2,IntPtr.Zero); Thread.Sleep(50); foreach(char ch in text){ ushort ks=VkKeyScan(ch); byte vk=(byte)(ks&0xff); byte sh=(byte)((ks>>8)&1); if(sh==1) keybd_event(0x10,0,0,IntPtr.Zero); keybd_event(vk,0,0,IntPtr.Zero); keybd_event(vk,0,2,IntPtr.Zero); if(sh==1) keybd_event(0x10,0,2,IntPtr.Zero); Thread.Sleep(25); } keybd_event(0x09,0,0,IntPtr.Zero); keybd_event(0x09,0,2,IntPtr.Zero); Thread.Sleep(400); }
  static void Main(string[] a){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    IntPtr main=FindWin();
    foreach(var c in Childs(main)){ if(Txt(c).Contains("右攻左")){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0x50005); Thread.Sleep(80); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0x50005); break; } }
    Thread.Sleep(3000);
    IntPtr sub=FindWin();
    SetForegroundWindow(sub); Thread.Sleep(800);
    RECT sr; GetWindowRect(sub,out sr);
    foreach(var c in Childs(sub)){ if(Cl(c)=="ThunderRT6TextBox"){ RECT cr; GetWindowRect(c,out cr); if(cr.L-sr.L<100){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0xA000A); Thread.Sleep(50); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0xA000A); break; } } }
    Thread.Sleep(200); SetForegroundWindow(sub); Thread.Sleep(300);
    Type("20"); Type("0"); Type("10");
    foreach(var c in Childs(sub)){ if(Txt(c)=="Option9"){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0); Thread.Sleep(50); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0); break; } }
    Thread.Sleep(2500);
    SetForegroundWindow(sub); Thread.Sleep(300);
    RECT r; GetWindowRect(sub,out r); int w=r.R-r.L,h=r.B-r.T;
    Bitmap b=new Bitmap(w,h); Graphics g=Graphics.FromImage(b); IntPtr hd=g.GetHdc(); PrintWindow(sub,hd,0x2); g.ReleaseHdc(hd);
    b.Save("full_state.png",ImageFormat.Png);
    Console.WriteLine("完整界面截图: full_state.png");
    // 同时读取输入框当前值确认
    foreach(var c in Childs(sub)){ if(Cl(c)=="ThunderRT6TextBox"){ RECT cr; GetWindowRect(c,out cr); Console.WriteLine("  输入框 rel("+(cr.L-sr.L)+","+(cr.T-sr.T)+") = ["+Txt(c)+"]"); } }
    pr.Kill();
  }
}
