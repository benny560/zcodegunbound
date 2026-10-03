using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Generic;
class Mem {
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a, bool b, int pid);
  [DllImport("kernel32.dll")] public static extern bool ReadProcessMemory(IntPtr p, IntPtr addr, byte[] buf, int size, out int read);
  [DllImport("kernel32.dll")] public static extern bool VirtualQueryEx(IntPtr p, IntPtr addr, out MEMORY_BASIC_INFORMATION info, int len);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  [StructLayout(LayoutKind.Sequential)] public struct MEMORY_BASIC_INFORMATION {
    public IntPtr BaseAddress; public IntPtr AllocationBase; public uint AllocationProtect;
    public IntPtr RegionSize; public uint State; public uint Protect; public uint Type;
  }
  static void Main(){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    System.Threading.Thread.Sleep(3000);
    int pid=pr.Id;
    IntPtr h=OpenProcess(0x10|0x20, false, pid); // VM_READ|VM_QUERY
    if(h==IntPtr.Zero){Console.WriteLine("OpenProcess失败(需管理员?)");pr.Kill();return;}
    Console.WriteLine("进程已打开, 开始扫描内存找已知结果值...");
    // 之前dist=20/wind10/Option9 结果: 47.3, 2.41, 75.7, 3.13
    // 但现在是默认状态(无输入). 先扫描所有double, 找 1.00/2.10/3.19(默认无风结果)
    double[] targets={1.00, 2.10, 3.19, 90.0};
    foreach(var tv in targets){
      byte[] pat=new byte[8];
      unsafe{ fixed(byte*p=pat){ *(double*)p=tv; } }
      int hits=0; long totalScanned=0;
      IntPtr addr=IntPtr.Zero;
      while(true){
        MEMORY_BASIC_INFORMATION mbi;
        if(!VirtualQueryEx(h, addr, out mbi, Marshal.SizeOf(typeof(MEMORY_BASIC_INFORMATION)))) break;
        long region=(long)mbi.RegionSize;
        if(region<=0) break;
        uint state=mbi.State, prot=mbi.Protect;
        // 只扫已提交且可读的
        if(state==0x1000 && (prot & 0x06)!=0 && (prot&0x100)==0){ // COMMITTED, READABLE, not GUARD
          byte[] buf=new byte[(int)Math.Min(region, 16*1024*1024)];
          for(long off=0; off<region; off+=buf.Length){
            int toRead=(int)Math.Min(buf.Length, region-off);
            int read;
            if(ReadProcessMemory(h, (IntPtr)((long)mbi.BaseAddress+off), buf, toRead, out read)){
              totalScanned+=read;
              for(int i=0;i+8<=read;i+=8){
                bool match=true;
                for(int j=0;j<8;j++) if(buf[i+j]!=pat[j]){match=false;break;}
                if(match){ hits++; if(hits<=2) Console.WriteLine("  "+tv+" 命中 @ "+((long)mbi.BaseAddress+off+i).ToString("X")); }
              }
            }
          }
        }
        addr=(IntPtr)((long)mbi.BaseAddress+region);
        if((long)addr<=0) break;
      }
      Console.WriteLine(tv+": "+hits+"处 (扫描"+(totalScanned/1024/1024)+"MB)");
    }
    CloseHandle(h);
    pr.Kill();
  }
  unsafe static void dummy(){} // 强制unsafe
}
