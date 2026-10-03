using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Generic;
class FindRes {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, System.Text.StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Auto, EntryPoint="SendMessage")] public static extern IntPtr SendStr(IntPtr h, uint m, IntPtr w, string l);
  [DllImport("user32.dll", EntryPoint="SendMessage")] public static extern IntPtr SendPtr(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern IntPtr PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern IntPtr SetFocus(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a, bool b, int pid);
  [DllImport("kernel32.dll")] public static extern bool ReadProcessMemory(IntPtr p, IntPtr addr, byte[] buf, int size, out int read);
  [DllImport("kernel32.dll")] public static extern int VirtualQueryEx(IntPtr p, IntPtr addr, byte[] buffer, int length);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  static uint tpid;
  static IntPtr FindWin(){ IntPtr hw=IntPtr.Zero; EnumWindows(new EnumProc((h,l)=>{uint p;GetWindowThreadProcessId(h,out p); if(p==tpid&&IsWindowVisible(h)){RECT r;GetWindowRect(h,out r); if(r.R-r.L>200&&hw==IntPtr.Zero) hw=h;} return true;}), IntPtr.Zero); return hw; }
  static List<IntPtr> Childs(IntPtr p){ var a=new List<IntPtr>(); EnumChildWindows(p,new EnumProc((h,l)=>{a.Add(h);return true;}),IntPtr.Zero); return a; }
  static string Txt(IntPtr h){ var s=new System.Text.StringBuilder(300); GetWindowText(h,s,300); return s.ToString(); }
  static string Cl(IntPtr h){ var s=new System.Text.StringBuilder(80); GetClassName(h,s,80); return s.ToString(); }
  static IntPtr FindBox(IntPtr sub, int rx, int ry){ RECT sr; GetWindowRect(sub,out sr); foreach(var c in Childs(sub)){ if(Cl(c)!="ThunderRT6TextBox") continue; RECT cr; GetWindowRect(c,out cr); if(Math.Abs(cr.L-sr.L-rx)<20&&Math.Abs(cr.T-sr.T-ry)<20) return c; } return IntPtr.Zero; }
  static void SetText(IntPtr parent, IntPtr box, string text){ SetFocus(box); SendStr(box,0x000C,IntPtr.Zero,text); int id=GetDlgCtrlID(box); SendPtr(parent,0x111,(IntPtr)(((0x300&0xffff)<<16)|(id&0xffff)),box); System.Threading.Thread.Sleep(100); }

  static void Main(){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    System.Threading.Thread.Sleep(3000); tpid=(uint)pr.Id;
    IntPtr main=FindWin();
    foreach(var c in Childs(main)){ if(Txt(c).Contains("右攻左")){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0x50005); System.Threading.Thread.Sleep(80); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0x50005); break; } }
    System.Threading.Thread.Sleep(2500);
    IntPtr sub=FindWin();
    SetForegroundWindow(sub); System.Threading.Thread.Sleep(400);
    SetText(sub,FindBox(sub,58,67),"20"); SetText(sub,FindBox(sub,173,67),"0"); SetText(sub,FindBox(sub,285,67),"10");
    foreach(var c in Childs(sub)){ if(Txt(c)=="Option9"){ SetFocus(c); PostMessage(c,0x201,IntPtr.Zero,IntPtr.Zero); System.Threading.Thread.Sleep(40); PostMessage(c,0x202,IntPtr.Zero,IntPtr.Zero); break; } }
    System.Threading.Thread.Sleep(2500); // 等结果生成
    Console.WriteLine("输入完成, 开始扫内存找结果...");
    IntPtr h=OpenProcess(0x1F0FFF,false,pr.Id);
    if(h==IntPtr.Zero){Console.WriteLine("OPEN_FAIL");pr.Kill();return;}
    // 已知结果(OCR读过): 二旋47.3/2.41, 三旋75.7/3.13
    double[] targets={47.3, 2.41, 75.7, 3.13};
    byte[] mbi=new byte[48];
    foreach(var tv in targets){
      byte[] pat=BitConverter.GetBytes(tv);
      var addrs=new List<long>();
      long addr=0x00010000; long maxAddr=0x80000000;
      while(addr<maxAddr){
        int ret=VirtualQueryEx(h,(IntPtr)addr,mbi,48);
        if(ret==0){addr+=0x1000;continue;}
        long ba=BitConverter.ToInt64(mbi,0);
        long rs=BitConverter.ToInt64(mbi,16);
        uint state=BitConverter.ToUInt32(mbi,24);
        if(rs<=0) rs=0x1000;
        if(state==0x1000 && rs<32L*1024*1024){
          byte[] buf=new byte[rs];
          int rd;
          if(ReadProcessMemory(h,(IntPtr)ba,buf,(int)rs,out rd)&&rd>0){
            for(int i=0;i+8<=rd;i+=4){
              bool m=true; for(int j=0;j<8;j++) if(buf[i+j]!=pat[j]){m=false;break;}
              if(m) addrs.Add(ba+i);
            }
          }
        }
        long next=ba+rs; addr=next>addr?next:addr+0x1000;
      }
      Console.WriteLine(tv+": "+addrs.Count+"处 "+(addrs.Count>0?"@"+addrs[0].ToString("X"):""));
    }
    CloseHandle(h); pr.Kill();
  }
}
