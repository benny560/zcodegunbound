using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
class KBT {
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
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, IntPtr i);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; }
  static uint tpid;
  static IntPtr FindWin(){ IntPtr hw=IntPtr.Zero; EnumWindows(new EnumProc((h,l)=>{uint p;GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>200&&hw==IntPtr.Zero) hw=h;} return true;}), IntPtr.Zero); return hw; }
  static List<IntPtr> Childs(IntPtr p){ var a=new List<IntPtr>(); EnumChildWindows(p,new EnumProc((h,l)=>{a.Add(h);return true;}),IntPtr.Zero); return a; }
  static string Txt(IntPtr h){ StringBuilder s=new StringBuilder(300); GetWindowText(h,s,300); return s.ToString(); }
  // 真实鼠标点击输入框中心(确保焦点), 然后键盘输入
  static void ClickAndType(IntPtr box, string text){
    RECT r; GetWindowRect(box,out r);
    int cx=(r.L+r.R)/2, cy=(r.T+r.B)/2;
    SetCursorPos(cx,cy); Thread.Sleep(150);
    mouse_event(0x2,0,0,0,IntPtr.Zero); Thread.Sleep(50); mouse_event(0x4,0,0,0,IntPtr.Zero); Thread.Sleep(200);
    // 全选删除
    keybd_event(0x11,0,0,IntPtr.Zero); keybd_event(0x41,0,0,IntPtr.Zero); keybd_event(0x41,0,2,IntPtr.Zero); keybd_event(0x11,0,2,IntPtr.Zero);
    keybd_event(0x2E,0,0,IntPtr.Zero); keybd_event(0x2E,0,2,IntPtr.Zero); Thread.Sleep(100);
    foreach(char ch in text){ ushort ks=VkKeyScan(ch); byte vk=(byte)(ks&0xff); byte sh=(byte)((ks>>8)&1); if(sh==1) keybd_event(0x10,0,0,IntPtr.Zero); keybd_event(vk,0,0,IntPtr.Zero); keybd_event(vk,0,2,IntPtr.Zero); if(sh==1) keybd_event(0x10,0,2,IntPtr.Zero); Thread.Sleep(30); }
    Thread.Sleep(300);
  }
  static void Main(){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(3000); tpid=(uint)pr.Id;
    IntPtr main=FindWin();
    foreach(var c in Childs(main)){ if(Txt(c).Contains("右攻左")){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0x50005); Thread.Sleep(80); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0x50005); break; } }
    Thread.Sleep(2500);
    IntPtr sub=FindWin();
    SetForegroundWindow(sub); Thread.Sleep(800);
    RECT sr; GetWindowRect(sub,out sr);
    // 找3个输入框
    IntPtr boxDist=IntPtr.Zero, boxElev=IntPtr.Zero, boxWind=IntPtr.Zero;
    foreach(var c in Childs(sub)){ StringBuilder cl=new StringBuilder(80); GetClassName(c,cl,80); if(cl.ToString()!="ThunderRT6TextBox")continue; RECT cr; GetWindowRect(c,out cr); int rx=cr.L-sr.L; if(rx<100)boxDist=c; else if(rx<250)boxElev=c; else boxWind=c; }
    Console.WriteLine("框: dist="+boxDist+" elev="+boxElev+" wind="+boxWind);
    // 真实点击+键盘
    ClickAndType(boxDist,"20"); ClickAndType(boxElev,"0"); ClickAndType(boxWind,"10");
    // 点Option9
    foreach(var c in Childs(sub)){ if(Txt(c)=="Option9"){ RECT cr;GetWindowRect(c,out cr); SetCursorPos((cr.L+cr.R)/2,(cr.T+cr.B)/2); Thread.Sleep(100); mouse_event(0x2,0,0,0,IntPtr.Zero); Thread.Sleep(50); mouse_event(0x4,0,0,0,IntPtr.Zero); Thread.Sleep(200); break; } }
    Thread.Sleep(2500);
    SetForegroundWindow(sub); Thread.Sleep(300);
    // 验证输入框值
    Console.WriteLine("输入后框值: dist=["+Txt(boxDist)+"] elev=["+Txt(boxElev)+"] wind=["+Txt(boxWind)+"]");
    // 截图结果
    RECT r; GetWindowRect(sub,out r); int w=r.R-r.L,h=r.B-r.T;
    Bitmap b=new Bitmap(w,h); Graphics g=Graphics.FromImage(b); IntPtr hd=g.GetHdc(); PrintWindow(sub,hd,0x2); g.ReleaseHdc(hd);
    Bitmap right=b.Clone(new Rectangle(w/2-10,0,w-w/2+10,h), b.PixelFormat);
    Bitmap big=new Bitmap(right.Width*3,right.Height*3); Graphics gb=Graphics.FromImage(big); gb.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor; gb.DrawImage(right,0,0,big.Width,big.Height);
    big.Save("kb_result.png",ImageFormat.Png);
    Console.WriteLine("截图: kb_result.png");
    pr.Kill();
  }
}
