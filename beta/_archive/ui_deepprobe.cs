using System;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Generic;
class DP {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Auto, EntryPoint="SendMessage")] public static extern IntPtr SendStr(IntPtr h, uint m, IntPtr w, string l);
  [DllImport("user32.dll", EntryPoint="SendMessage")] public static extern IntPtr SendPtr(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern IntPtr PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern IntPtr SetFocus(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  static uint tpid;
  static IntPtr FindWin(){ IntPtr hw=IntPtr.Zero; EnumWindows(new EnumProc((h,l)=>{uint p;GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>200&&hw==IntPtr.Zero) hw=h;} return true;}), IntPtr.Zero); return hw; }
  static List<IntPtr> Childs(IntPtr p){ var a=new List<IntPtr>(); EnumChildWindows(p,new EnumProc((h,l)=>{a.Add(h);return true;}),IntPtr.Zero); return a; }
  static string Txt(IntPtr h){ StringBuilder s=new StringBuilder(300); GetWindowText(h,s,300); return s.ToString(); }
  static string Cl(IntPtr h){ StringBuilder s=new StringBuilder(80); GetClassName(h,s,80); return s.ToString(); }
  static IntPtr FindBox(IntPtr sub, int rx, int ry){ RECT sr; GetWindowRect(sub,out sr); foreach(var c in Childs(sub)){ if(Cl(c)!="ThunderRT6TextBox") continue; RECT cr; GetWindowRect(c,out cr); int cx=cr.L-sr.L, cy=cr.T-sr.T; if(Math.Abs(cx-rx)<20 && Math.Abs(cy-ry)<20) return c; } return IntPtr.Zero; }
  static void SetText(IntPtr parent, IntPtr box, string text){ SetFocus(box); SendStr(box,0x000C,IntPtr.Zero,text); int id=GetDlgCtrlID(box); SendPtr(parent,0x111,(IntPtr)(((0x300&0xffff)<<16)|(id&0xffff)),box); Thread.Sleep(100); }
  static void Main(){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    IntPtr main=FindWin();
    foreach(var c in Childs(main)){ if(Txt(c).Contains("右攻左")){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0x50005); Thread.Sleep(80); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0x50005); break; } }
    Thread.Sleep(3000);
    IntPtr sub=FindWin();
    SetForegroundWindow(sub); Thread.Sleep(500);
    IntPtr bd=FindBox(sub,58,67), be=FindBox(sub,173,67), bw=FindBox(sub,285,67);
    SetText(sub,bd,"20"); SetText(sub,be,"0"); SetText(sub,bw,"10");
    foreach(var c in Childs(sub)){ if(Txt(c)=="Option9"){ SetFocus(c); PostMessage(c,0x201,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(40); PostMessage(c,0x202,IntPtr.Zero,IntPtr.Zero); break; } }
    Thread.Sleep(2000);
    // 列出"攻击方式"Frame(354,111)的所有子控件
    RECT sr; GetWindowRect(sub,out sr);
    Console.WriteLine("=== 攻击方式Frame区域内的所有控件 ===");
    foreach(var c in Childs(sub)){
      RECT cr; GetWindowRect(c,out cr); int rx=cr.L-sr.L, ry=cr.T-sr.T;
      if(rx>=350 && rx<480){ // 攻击方式区
        StringBuilder cls=new StringBuilder(80); GetClassName(c,cls,80);
        Console.WriteLine("  cls="+cls+" ["+Txt(c)+"] rel("+rx+","+ry+") "+(cr.R-cr.L)+"x"+(cr.B-cr.T));
      }
    }
    pr.Kill();
  }
}
