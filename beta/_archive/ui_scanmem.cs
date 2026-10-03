using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
class Scan {
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a, bool b, int pid);
  [DllImport("kernel32.dll")] public static extern bool ReadProcessMemory(IntPtr p, IntPtr addr, byte[] buf, int size, out int read);
  [DllImport("kernel32.dll")] public static extern int VirtualQueryEx(IntPtr p, IntPtr addr, byte[] buffer, int length);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  static IntPtr h;
  static bool ReadMem(long addr, byte[] buf, int sz){
    int rd; return ReadProcessMemory(h,(IntPtr)addr,buf,sz,out rd)&&rd==sz;
  }
  static void Main(){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    System.Threading.Thread.Sleep(3500);
    h=OpenProcess(0x1F0FFF,false,pr.Id);
    if(h==IntPtr.Zero){Console.WriteLine("OPEN_FAIL");pr.Kill();return;}
    // 扫描找 90.0 的double (默认无风N1-N3结果)
    byte[] pat=BitConverter.GetBytes(90.0);
    long hits=0, totalMB=0;
    byte[] mbi=new byte[48];
    long addr=0x00010000;
    var hitAddrs=new System.Collections.Generic.List<long>();
    while(addr < 0x7FFFFFFFEFFF){
      int ret=VirtualQueryEx(h,(IntPtr)addr,mbi,48);
      if(ret==0){ addr+=0x1000; if(addr>0x7FFFFFFFEFFF)break; continue; }
      long baseAddr=BitConverter.ToInt64(mbi,0);
      long regionSize=BitConverter.ToInt64(mbi,16); // offset: base(8)+allocbase(8)
      // state在 offset 16+8=24, protect在 24+4=28
      uint state=BitConverter.ToUInt32(mbi,24);
      uint prot=BitConverter.ToUInt32(mbi,28);
      if(regionSize<=0) regionSize=0x1000;
      if(state==0x1000){ // MEM_COMMIT
        int sz=(int)Math.Min(regionSize,16L*1024*1024);
        byte[] buf=new byte[sz];
        for(long off=0;off<regionSize;off+=sz){
          int toRead=(int)Math.Min(sz,regionSize-off);
          if(ReadMem(baseAddr+off,buf,toRead)){
            totalMB+=toRead;
            for(int i=0;i+8<=toRead;i+=4){
              bool m=true;
              for(int j=0;j<8;j++) if(buf[i+j]!=pat[j]){m=false;break;}
              if(m){ hits++; hitAddrs.Add(baseAddr+off+i); }
            }
          }
        }
      }
      long next=baseAddr+regionSize;
      addr = next>addr ? next : addr+0x1000;
    }
    Console.WriteLine("90.0: "+hits+"处, 扫描"+(totalMB/1024/1024)+"MB");
    foreach(var a in hitAddrs) Console.WriteLine("  @"+a.ToString("X"));
    CloseHandle(h); pr.Kill();
  }
}
