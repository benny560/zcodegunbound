using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
class M2 {
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a, bool b, int pid);
  [DllImport("kernel32.dll")] public static extern bool ReadProcessMemory(IntPtr p, IntPtr addr, byte[] buf, int size, out int read);
  [DllImport("kernel32.dll")] public static extern int VirtualQueryEx(IntPtr p, IntPtr addr, byte[] buffer, int length);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  // MEMORY_BASIC_INFORMATION 用byte[]方式读取避免struct对齐问题
  static void Main(){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    System.Threading.Thread.Sleep(3000);
    IntPtr h=OpenProcess(0x10|0x20, false, pr.Id);
    if(h==IntPtr.Zero){Console.WriteLine("OpenProcess失败 err="+Marshal.GetLastWin32Error());pr.Kill();return;}
    Console.WriteLine("进程已开");
    // 扫描找 90.0 (默认无风结果). double LE = 40 56 00 00 00 00 00 00
    double tv=90.0;
    byte[] pat=BitConverter.GetBytes(tv);
    long hits=0, totalMB=0, regions=0;
    long addr=0x10000; // 从低地址开始
    byte[] mbiBuf=new byte[48]; // MBI大小(32位28, 64位48)
    while(addr < 0x7FFFFFFFFFFF){
      int ret=VirtualQueryEx(h, (IntPtr)addr, mbiBuf, mbiBuf.Length);
      if(ret==0) break;
      long baseAddr=Marshal.ReadIntPtr(mbiBuf, 0).ToInt64();
      long regionSize=Marshal.ReadIntPtr(mbiBuf, IntPtr.Size).ToInt64();
      if(regionSize<=0) break;
      uint state=BitConverter.ToUInt32(mbiBuf, IntPtr.Size*2+4); // AllocationProtect, BaseAddress, RegionSize, State...
      // MBI 64位: BaseAddress(8) AllocationBase(8) AllocationProtect(4) padding(4) RegionSize(8) State(4) Protect(4) Type(4)
      uint prot=BitConverter.ToUInt32(mbiBuf, IntPtr.Size*2+8+4+4); // State后是Protect
      state=BitConverter.ToUInt32(mbiBuf, IntPtr.Size*2+8+4);
      if(baseAddr==0) break;
      regions++;
      if(state==0x1000 && (prot&0xFF)!=0 && (prot&0x100)==0 && (prot&0x06)!=0){ // committed, readable
        int sz=(int)Math.Min(regionSize, 32L*1024*1024);
        byte[] buf=new byte[sz];
        for(long off=0; off<regionSize; off+=sz){
          int toRead=(int)Math.Min(sz, regionSize-off);
          int read;
          if(ReadProcessMemory(h, (IntPtr)(baseAddr+off), buf, toRead, out read) && read>0){
            totalMB+=read;
            for(int i=0;i+8<=read;i+=4){ // 4字节对齐扫描
              bool m=true;
              for(int j=0;j<8;j++) if(buf[i+j]!=pat[j]){m=false;break;}
              if(m){ hits++; if(hits<=3) Console.WriteLine("  90.0 @ "+(baseAddr+off+i).ToString("X")); }
            }
          }
        }
      }
      addr=baseAddr+regionSize;
      if(addr<=baseAddr) break;
    }
    Console.WriteLine("90.0: "+hits+"处, 扫描"+(totalMB/1024/1024)+"MB, "+regions+"区域");
    CloseHandle(h); pr.Kill();
  }
}
