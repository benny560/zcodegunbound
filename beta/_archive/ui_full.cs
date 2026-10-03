using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
class Full {
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
  static string Txt(IntPtr h){ StringBuilder s=new StringBuilder(200); GetWindowText(h,s,200); return s.ToString(); }
  static void Type(string text){
    keybd_event(0x11,0,0,IntPtr.Zero); keybd_event(0x41,0,0,IntPtr.Zero); keybd_event(0x41,0,2,IntPtr.Zero); keybd_event(0x11,0,2,IntPtr.Zero); // Ctrl+A
    keybd_event(0x2E,0,0,IntPtr.Zero); keybd_event(0x2E,0,2,IntPtr.Zero); Thread.Sleep(50); // Del
    foreach(char ch in text){ ushort ks=VkKeyScan(ch); byte vk=(byte)(ks&0xff); byte sh=(byte)((ks>>8)&1); if(sh==1) keybd_event(0x10,0,0,IntPtr.Zero); keybd_event(vk,0,0,IntPtr.Zero); keybd_event(vk,0,2,IntPtr.Zero); if(sh==1) keybd_event(0x10,0,2,IntPtr.Zero); Thread.Sleep(20); }
    keybd_event(0x09,0,0,IntPtr.Zero); keybd_event(0x09,0,2,IntPtr.Zero); Thread.Sleep(300); // Tab触发change
  }
  static void Main(string[] a){
    // 参数: dist elev wind  全部必填
    string dist=a[0], elev=a.Length>1?a[1]:"0", wind=a.Length>2?a[2]:"0";
    string outp=a.Length>3?a[3]:"res";
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    IntPtr main=FindWin();
    foreach(var c in Childs(main)){ if(Txt(c).Contains("右攻左")){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0x50005); Thread.Sleep(80); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0x50005); break; } }
    Thread.Sleep(3000);
    IntPtr sub=FindWin();
    SetForegroundWindow(sub); Thread.Sleep(800);
    // 点击第一个TextBox(距离), 然后依次输入, Tab会自动跳到下一个
    RECT sr; GetWindowRect(sub,out sr);
    foreach(var c in Childs(sub)){ StringBuilder cl=new StringBuilder(80); GetClassName(c,cl,80); if(cl.ToString()=="ThunderRT6TextBox"){ RECT cr; GetWindowRect(c,out cr); if(cr.L-sr.L<100){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0xA000A); Thread.Sleep(50); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0xA000A); break; } } }
    Thread.Sleep(200); SetForegroundWindow(sub); Thread.Sleep(300);
    Type(dist);    // 距离 + Tab
    Type(elev);    // 落差 + Tab
    Type(wind);    // 风力 + Tab
    Thread.Sleep(1500);
    // 截图
    RECT r; GetWindowRect(sub,out r); int w=r.R-r.L,h=r.B-r.T;
    Bitmap b=new Bitmap(w,h); Graphics g=Graphics.FromImage(b); IntPtr hd=g.GetHdc(); PrintWindow(sub,hd,0x2); g.ReleaseHdc(hd);
    Bitmap big=new Bitmap(w*2,h*2); Graphics gb=Graphics.FromImage(big); gb.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor; gb.DrawImage(b,0,0,w*2,h*2);
    big.Save(outp+".png",ImageFormat.Png);
    Console.WriteLine("已截图 "+outp+".png (dist="+dist+" elev="+elev+" wind="+wind+")");
    pr.Kill();
  }
}
