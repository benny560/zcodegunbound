using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
class PM {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Auto, EntryPoint="SendMessage")]
  public static extern IntPtr SendStr(IntPtr h, uint m, IntPtr w, string l);
  [DllImport("user32.dll")] public static extern IntPtr PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll", EntryPoint="SendMessage")] public static extern IntPtr SendPtr(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern IntPtr SetFocus(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, int f);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  static uint tpid;
  const uint WM_SETTEXT=0x000C, WM_GETTEXT=0x000D, EN_CHANGE=0x300, WM_COMMAND=0x111;
  static IntPtr FindWin(){ IntPtr hw=IntPtr.Zero; EnumWindows(new EnumProc((h,l)=>{uint p;GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>200&&hw==IntPtr.Zero) hw=h;} return true;}), IntPtr.Zero); return hw; }
  static List<IntPtr> Childs(IntPtr p){ var a=new List<IntPtr>(); EnumChildWindows(p,new EnumProc((h,l)=>{a.Add(h);return true;}),IntPtr.Zero); return a; }
  static string Txt(IntPtr h){ StringBuilder s=new StringBuilder(300); GetWindowText(h,s,300); return s.ToString(); }
  static string Cl(IntPtr h){ StringBuilder s=new StringBuilder(80); GetClassName(h,s,80); return s.ToString(); }
  static IntPtr FindBox(IntPtr sub, int rx, int ry){ RECT sr; GetWindowRect(sub,out sr); foreach(var c in Childs(sub)){ if(Cl(c)!="ThunderRT6TextBox") continue; RECT cr; GetWindowRect(c,out cr); int cx=cr.L-sr.L, cy=cr.T-sr.T; if(Math.Abs(cx-rx)<20 && Math.Abs(cy-ry)<20) return c; } return IntPtr.Zero; }
  // 设TextBox文本并触发VB6 Change事件
  static void SetText(IntPtr parent, IntPtr box, string text){
    SetFocus(box);
    SendStr(box, WM_SETTEXT, IntPtr.Zero, text);
    // 触发EN_CHANGE: 父窗口收到WM_COMMAND, wParam=HiWord(EN_CHANGE)|LoWord(控件ID)
    // VB6的TextBox ID需要从GetDlgCtrlID获取
    int ctrlId=GetDlgCtrlID(box);
    IntPtr wparam=(IntPtr)(((EN_CHANGE & 0xffff)<<16)|(ctrlId & 0xffff));
    SendPtr(parent, WM_COMMAND, wparam, box);
    Thread.Sleep(150);
  }
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
  static void Main(string[] a){
    string dist=a[0], elev=a[1], wind=a[2], opt=a[3], outp=a[4];
    bool left = a.Length>5 && a[5]=="left";
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    IntPtr main=FindWin();
    string btn = left ? "左攻右" : "右攻左";
    foreach(var c in Childs(main)){ if(Txt(c).Contains(btn)){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0x50005); Thread.Sleep(80); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0x50005); break; } }
    Thread.Sleep(3000);
    IntPtr sub=FindWin();
    SetForegroundWindow(sub); Thread.Sleep(500);
    IntPtr boxDist=FindBox(sub,58,67), boxElev=FindBox(sub,173,67), boxWind=FindBox(sub,285,67);
    Console.WriteLine("框: dist="+boxDist+" elev="+boxElev+" wind="+boxWind);
    SetText(sub, boxDist, dist);
    SetText(sub, boxElev, elev);
    SetText(sub, boxWind, wind);
    // 确认输入框值
    Console.WriteLine("设值后: dist=["+Txt(boxDist)+"] elev=["+Txt(boxElev)+"] wind=["+Txt(boxWind)+"]");
    // 选风向Option
    foreach(var c in Childs(sub)){ if(Txt(c)==opt){ 
      // OptionButton用BM_CLICK或发WM_LBUTTONDOWN. VB6 OptionButton用空格键选中
      SetFocus(c); Thread.Sleep(100);
      PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0); Thread.Sleep(50); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0);
      Thread.Sleep(200);
      // 也发空格键
      PostMessage(c,0x100,(IntPtr)0x20,IntPtr.Zero); Thread.Sleep(50); PostMessage(c,0x101,(IntPtr)0x20,IntPtr.Zero);
      break; 
    } }
    Thread.Sleep(2500);
    SetForegroundWindow(sub); Thread.Sleep(300);
    RECT r; GetWindowRect(sub,out r); int w=r.R-r.L,h=r.B-r.T;
    Bitmap b=new Bitmap(w,h); Graphics g=Graphics.FromImage(b); IntPtr hd=g.GetHdc(); PrintWindow(sub,hd,0x2); g.ReleaseHdc(hd);
    Bitmap right=b.Clone(new Rectangle(w/2-10,0,w-w/2+10,h), b.PixelFormat);
    Bitmap big=new Bitmap(right.Width*3,right.Height*3); Graphics gb=Graphics.FromImage(big); gb.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor; gb.DrawImage(right,0,0,big.Width,big.Height);
    big.Save(outp+".png",ImageFormat.Png);
    Console.WriteLine("截图: "+outp+".png");
    pr.Kill();
  }
}
