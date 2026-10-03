using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Generic;
class Diff {
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a, bool b, int pid);
  [DllImport("kernel32.dll")] public static extern bool ReadProcessMemory(IntPtr p, IntPtr addr, byte[] buf, int size, out int read);
  [DllImport("kernel32.dll")] public static extern int VirtualQueryEx(IntPtr p, IntPtr addr, byte[] buffer, int length);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  static IntPtr h;
  // dump所有committed可读区域到dict
  static Dictionary<long,byte[]> Dump(){
    var d=new Dictionary<long,byte[]>();
    byte[] mbi=new byte[48];
    long addr=0x00010000;
    long maxAddr=0x10000000; // 只扫低256MB(VB6堆+data区,够用且快)
    while(addr<maxAddr){
      int ret=VirtualQueryEx(h,(IntPtr)addr,mbi,48);
      if(ret==0){addr+=0x1000;continue;}
      long ba=BitConverter.ToInt64(mbi,0);
      long rs=BitConverter.ToInt64(mbi,16);
      uint state=BitConverter.ToUInt32(mbi,24);
      if(rs<=0) rs=0x1000;
      if(state==0x1000 && rs<16L*1024*1024){
        byte[] buf=new byte[rs];
        int rd;
        if(ReadProcessMemory(h,(IntPtr)ba,buf,(int)rs,out rd)&&rd==rs) d[ba]=buf;
      }
      long next=ba+rs; addr=next>addr?next:addr+0x1000;
    }
    return d;
  }
  static void Main(){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    System.Threading.Thread.Sleep(3500);
    h=OpenProcess(0x1F0FFF,false,pr.Id);
    if(h==IntPtr.Zero){Console.WriteLine("OPEN_FAIL");pr.Kill();return;}
    // 进入右攻左
    var auto=System.Reflection.Assembly.GetExecutingAssembly();
    // 简化: 用已有的PostMessage点按钮(内联)
    IntPtr main=IntPtr.Zero;
    {
      System.Windows.Forms.Form f=null;
    }
    // 直接复用之前的进入逻辑太长, 这里假设已进入. 先dump1(默认状态)
    Console.WriteLine("dump1...");
    var d1=Dump();
    Console.WriteLine("dump1: "+d1.Count+"区域");
    // 找90.0(默认无风结果)位置
    byte[] p90=BitConverter.GetBytes(90.0);
    int found90=0;
    foreach(var kv in d1){
      var buf=kv.Value;
      for(int i=0;i+8<=buf.Length;i+=4){
        bool m=true; for(int j=0;j<8;j++) if(buf[i+j]!=p90[j]){m=false;break;}
        if(m){ Console.WriteLine("90.0 @ "+(kv.Key+i).ToString("X")); found90++; if(found90>5)break; }
      }
      if(found90>5)break;
    }
    Console.WriteLine("90.0共"+found90+"处");
    CloseHandle(h); pr.Kill();
  }
}
