using System;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Generic;
class KB {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern IntPtr PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetFocus(IntPtr h);
  [DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, IntPtr i);
  [DllImport("user32.dll")] public static extern ushort VkKeyScan(char c);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  static uint tpid;
  static IntPtr FindWin(){ IntPtr hw=IntPtr.Zero; EnumWindows(new EnumProc((h,l)=>{uint p;GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>200&&hw==IntPtr.Zero) hw=h;} return true;}), IntPtr.Zero); return hw; }
  static List<IntPtr> Childs(IntPtr p){ var a=new List<IntPtr>(); EnumChildWindows(p,new EnumProc((h,l)=>{a.Add(h);return true;}),IntPtr.Zero); return a; }
  static string Txt(IntPtr h){ StringBuilder s=new StringBuilder(200); GetWindowText(h,s,200); return s.ToString(); }
  static string Cls(IntPtr h){ StringBuilder s=new StringBuilder(80); GetClassName(h,s,80); return s.ToString(); }
  static IntPtr FindBox(IntPtr sub, int rx, int ry){ RECT sr; GetWindowRect(sub,out sr); foreach(var c in Childs(sub)){ if(Cls(c)!="ThunderRT6TextBox") continue; RECT cr; GetWindowRect(c,out cr); int cx=cr.L-sr.L, cy=cr.T-sr.T; if(Math.Abs(cx-rx)<20 && Math.Abs(cy-ry)<20) return c; } return IntPtr.Zero; }
  // 用键盘输入文本到控件(模拟真实输入触发Change)
  static void TypeInto(IntPtr sub, IntPtr box, string text){
    SetFocus(box); Thread.Sleep(100);
    // 全选删除
    keybd_event(0x11,0,0,IntPtr.Zero); // Ctrl down
    keybd_event(0x41,0,0,IntPtr.Zero); // A
    keybd_event(0x41,0,0x2,IntPtr.Zero); keybd_event(0x11,0,0x2,IntPtr.Zero); // up
    keybd_event(0x2E,0,0,IntPtr.Zero); keybd_event(0x2E,0,2,IntPtr.Zero); // Del
    Thread.Sleep(50);
    foreach(char ch in text){
      ushort ks=VkKeyScan(ch);
      byte vk=(byte)(ks&0xff); byte sh=(byte)((ks>>8)&1);
      if(sh==1) keybd_event(0x10,0,0,IntPtr.Zero); // shift
      keybd_event(vk,0,0,IntPtr.Zero); keybd_event(vk,0,2,IntPtr.Zero);
      if(sh==1) keybd_event(0x10,0,2,IntPtr.Zero);
      Thread.Sleep(15);
    }
    keybd_event(0x0D,0,0,IntPtr.Zero); keybd_event(0x0D,0,2,IntPtr.Zero); // Enter触发
    Thread.Sleep(200);
  }
  static void Main(string[] a){
    double dist=double.Parse(a[0]), elev=a.Length>1?double.Parse(a[1]):0, wind=a.Length>2?double.Parse(a[2]):0;
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    Thread.Sleep(2500); tpid=(uint)pr.Id;
    IntPtr main=FindWin();
    foreach(var c in Childs(main)){ if(Txt(c).Contains("右攻左")){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0x50005); Thread.Sleep(80); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0x50005); break; } }
    Thread.Sleep(3000);
    IntPtr sub=FindWin();
    SetForegroundWindow(sub); Thread.Sleep(500);
    IntPtr boxDist=FindBox(sub,58,67), boxElev=FindBox(sub,173,67), boxWind=FindBox(sub,285,67);
    TypeInto(sub,boxDist,dist.ToString());
    TypeInto(sub,boxElev,elev.ToString());
    TypeInto(sub,boxWind,wind.ToString());
    Thread.Sleep(1000);
    Console.WriteLine("=== dist="+dist+" elev="+elev+" wind="+wind+" 结果(全量,含Label) ===");
    foreach(var c in Childs(sub)){
      string t=Txt(c); string cl=Cls(c);
      if(string.IsNullOrEmpty(t)) continue;
      if(cl.Contains("Option")||cl.Contains("Frame")||cl.Contains("Command")) continue;
      RECT cr; GetWindowRect(c,out cr); RECT sr; GetWindowRect(sub,out sr);
      int rx=cr.L-sr.L, ry=cr.T-sr.T;
      Console.WriteLine("  ["+cl.Replace("ThunderRT6","")+"] rel("+rx+","+ry+") "+(cr.R-cr.L)+"x"+(cr.B-cr.T)+" = "+t);
    }
    pr.Kill();
  }
}
