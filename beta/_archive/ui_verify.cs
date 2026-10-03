using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
class Ver {
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
    string dist=a[0], elev=a[1], wind=a[2], opt=a[3], outp=a[4];
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    IntPtr main=FindWin();
    string btn = a.Length>5&&a[5]=="left" ? "左攻右" : "右攻左";
    foreach(var c in Childs(main)){ if(Txt(c).Contains(btn)){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0x50005); Thread.Sleep(80); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0x50005); break; } }
    Thread.Sleep(3000);
    IntPtr sub=FindWin();
    SetForegroundWindow(sub); Thread.Sleep(800);
    RECT sr; GetWindowRect(sub,out sr);
    foreach(var c in Childs(sub)){ if(Cl(c)=="ThunderRT6TextBox"){ RECT cr; GetWindowRect(c,out cr); if(cr.L-sr.L<100){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0xA000A); Thread.Sleep(50); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0xA000A); break; } } }
    Thread.Sleep(200); SetForegroundWindow(sub); Thread.Sleep(300);
    Type(dist); Type(elev); Type(wind);
    foreach(var c in Childs(sub)){ if(Txt(c)==opt){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0); Thread.Sleep(50); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0); break; } }
    Thread.Sleep(2000);
    SetForegroundWindow(sub); Thread.Sleep(300);
    RECT r; GetWindowRect(sub,out r); int w=r.R-r.L,h=r.B-r.T;
    Bitmap b=new Bitmap(w,h); Graphics g=Graphics.FromImage(b); IntPtr hd=g.GetHdc(); PrintWindow(sub,hd,0x2); g.ReleaseHdc(hd);
    // 截右半(结果区)放大
    Bitmap right=b.Clone(new Rectangle(w/2-10,0,w-w/2+10,h), b.PixelFormat);
    Bitmap big=new Bitmap(right.Width*3,right.Height*3); Graphics gb=Graphics.FromImage(big); gb.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor; gb.DrawImage(right,0,0,big.Width,big.Height);
    big.Save(outp+".png",ImageFormat.Png);
    Console.WriteLine(outp+": "+btn+" dist="+dist+" elev="+elev+" wind="+wind+" "+opt);
    pr.Kill();
  }
}
