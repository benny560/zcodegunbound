using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
class R {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, int f);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint msg, IntPtr wp, IntPtr lp);
  [DllImport("user32.dll")] public static extern IntPtr PostMessage(IntPtr h, uint msg, IntPtr wp, IntPtr lp);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  static uint tpid;
  const uint WM_LBUTTONDOWN=0x201, WM_LBUTTONUP=0x202;
  static List<IntPtr> AllVisibleWindows(){
    var list=new List<IntPtr>();
    EnumWindows(new EnumProc((h,l)=>{uint p;GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>50) list.Add(h);} return true;}), IntPtr.Zero);
    return list;
  }
  static void Main(string[] a){
    string btn = a.Length>0?a[0]:"右攻左";
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    var wins=AllVisibleWindows();
    if(wins.Count==0){Console.WriteLine("NO_WIN");pr.Kill();return;}
    IntPtr mw=wins[0];
    ShowWindow(mw,1); Thread.Sleep(400); SetForegroundWindow(mw); Thread.Sleep(800);
    // 找指定按钮的子窗口
    var childs=new List<IntPtr>();
    EnumChildWindows(mw, new EnumProc((h,l)=>{childs.Add(h); return true;}), IntPtr.Zero);
    IntPtr targetBtn=IntPtr.Zero;
    foreach(var c in childs){ StringBuilder sb=new StringBuilder(100); GetWindowText(c,sb,100); if(sb.ToString().Contains(btn)){ targetBtn=c; break; } }
    if(targetBtn==IntPtr.Zero){Console.WriteLine("BTN_NOT_FOUND, 子按钮:"); foreach(var c in childs){StringBuilder sb=new StringBuilder(100);GetWindowText(c,sb,100);Console.WriteLine("  ["+sb+"]");} pr.Kill(); return;}
    StringBuilder tnb=new StringBuilder(100); GetWindowText(targetBtn,tnb,100);
    Console.WriteLine("找到按钮: ["+tnb+"] 发送点击");
    RECT br; GetWindowRect(targetBtn,out br);
    int bx=br.L+5, by=br.T+5;
    IntPtr lp=(IntPtr)((5<<16)|5); // 按钮内坐标(5,5)
    // 必须先前台+焦点,再用PostMessage发mouse到按钮
    SetForegroundWindow(mw); Thread.Sleep(200);
    PostMessage(targetBtn, WM_LBUTTONDOWN, (IntPtr)1, lp);
    Thread.Sleep(100);
    PostMessage(targetBtn, WM_LBUTTONUP, (IntPtr)0, lp);
    Thread.Sleep(3000);
    // 检查窗口变化
    var after=AllVisibleWindows();
    Console.WriteLine("点击后可见窗口数: "+after.Count);
    foreach(var w in after){ RECT r; GetWindowRect(w,out r); StringBuilder sb=new StringBuilder(200); GetWindowText(w,sb,200); Console.WriteLine("  "+(r.R-r.L)+"x"+(r.B-r.T)+" ["+sb+"]"); Shot(w,"real_"+(r.R-r.L)+"_"+sb.ToString().Substring(0,Math.Min(10,sb.Length))+".png"); }
    pr.Kill();
  }
  static void Shot(IntPtr h,string p){ RECT r; GetWindowRect(h,out r); int w=r.R-r.L,hh=r.B-r.T; if(w<10)return; Bitmap b=new Bitmap(w,hh); Graphics g=Graphics.FromImage(b); IntPtr hd=g.GetHdc(); PrintWindow(h,hd,0x2); g.ReleaseHdc(hd); b.Save(p,ImageFormat.Png); }
}
