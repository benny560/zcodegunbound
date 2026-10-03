using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Generic;
class Loc {
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
  // dump整个堆找double, 返回{addr:val}
  static Dictionary<long,double> DumpDoubles(IntPtr h){
    var d=new Dictionary<long,double>(); byte[] mbi=new byte[48];
    long addr=0x00010000, maxA=0x10000000;
    while(addr<maxA){
      int ret=VirtualQueryEx(h,(IntPtr)addr,mbi,48);
      if(ret==0){addr+=0x1000;continue;}
      long ba=BitConverter.ToInt64(mbi,0); long rs=BitConverter.ToInt64(mbi,24); uint state=BitConverter.ToUInt32(mbi,32);
      if(rs<=0||rs>100L*1024*1024){addr+=0x1000;continue;}
      if(state==0x1000){ byte[] buf=new byte[rs]; int rd;
        if(ReadProcessMemory(h,(IntPtr)ba,buf,(int)rs,out rd)&&rd>0){
          for(int i=0;i+8<=rd;i+=4){ double v=BitConverter.ToDouble(buf,i); if(!double.IsNaN(v)&&!double.IsInfinity(v)&&Math.Abs(v)>0.01&&Math.Abs(v)<10000) d[ba+i]=v; }
        }
      }
      addr=ba+rs;
    }
    return d;
  }
  static void Main(){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    System.Threading.Thread.Sleep(3000); tpid=(uint)pr.Id;
    IntPtr main=FindWin();
    foreach(var c in Childs(main)){ if(Txt(c).Contains("右攻左")){ PostMessage(c,0x201,IntPtr.Zero,(IntPtr)0x50005); System.Threading.Thread.Sleep(80); PostMessage(c,0x202,IntPtr.Zero,(IntPtr)0x50005); break; } }
    System.Threading.Thread.Sleep(2500);
    IntPtr sub=FindWin(); SetForegroundWindow(sub); System.Threading.Thread.Sleep(400);
    // 状态A: dist=20 wind=10 Option9 (已知结果 N2=47.3/2.41 N3=75.7/3.13)
    SetText(sub,FindBox(sub,58,67),"20"); SetText(sub,FindBox(sub,173,67),"0"); SetText(sub,FindBox(sub,285,67),"10");
    foreach(var c in Childs(sub)){ if(Txt(c)=="Option9"){ SetFocus(c); PostMessage(c,0x201,IntPtr.Zero,IntPtr.Zero); System.Threading.Thread.Sleep(40); PostMessage(c,0x202,IntPtr.Zero,IntPtr.Zero); break; } }
    System.Threading.Thread.Sleep(2500);
    IntPtr h=OpenProcess(0x1F0FFF,false,pr.Id);
    Console.WriteLine("dump状态A(dist20/wind10/Opt9)...");
    var dA=DumpDoubles(h);
    Console.WriteLine("A: "+dA.Count+"个double");
    // 状态B: 改成dist=30 (结果会变), dump, 找差异地址 = 结果变量
    SetText(sub,FindBox(sub,58,67),"30");
    System.Threading.Thread.Sleep(2500);
    Console.WriteLine("dump状态B(dist30/wind10/Opt9)...");
    var dB=DumpDoubles(h);
    Console.WriteLine("B: "+dB.Count+"个double");
    // diff: A有B没有, 或值变化的
    var changed=new List<KeyValuePair<long,double[]>>(); // addr:[valA,valB]
    foreach(var kv in dA){
      if(dB.ContainsKey(kv.Key)){
        if(Math.Abs(dB[kv.Key]-kv.Value)>0.001) changed.Add(new KeyValuePair<long,double[]>(kv.Key,new[]{kv.Value,dB[kv.Key]}));
      }
    }
    Console.WriteLine("值变化地址: "+changed.Count+"个");
    // 显示变化的(优先40-90范围的, 像角度)
    Console.WriteLine("=== 变化的double(过滤40-90度或1-5力度范围) ===");
    foreach(var c in changed){
      double va=c.Value[0], vb=c.Value[1];
      bool angleLike=(va>=30&&va<=90)||(vb>=30&&vb<=90);
      bool powerLike=(va>=0.5&&va<=5)||(vb>=0.5&&vb<=5);
      if(angleLike||powerLike) Console.WriteLine("  @"+c.Key.ToString("X")+" A="+va.ToString("0.####")+" → B="+vb.ToString("0.####"));
    }
    CloseHandle(h); pr.Kill();
  }
}
