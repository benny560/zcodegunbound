using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
class Layout {
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a, bool b, int pid);
  [DllImport("kernel32.dll")] public static extern int VirtualQueryEx(IntPtr p, IntPtr addr, byte[] buffer, int length);
  [DllImport("kernel32.dll")] public static extern bool ReadProcessMemory(IntPtr p, IntPtr addr, byte[] buf, int size, out int read);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  static void Main(){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    System.Threading.Thread.Sleep(3500);
    IntPtr h=OpenProcess(0x1F0FFF,false,pr.Id);
    if(h==IntPtr.Zero){Console.WriteLine("OPEN_FAIL");pr.Kill();return;}
    byte[] mbi=new byte[48];
    // 从imagebase 0x00400000测, 打印完整48字节的hex和各偏移解析
    int ret=VirtualQueryEx(h,(IntPtr)0x00400000,mbi,48);
    Console.WriteLine("VirtualQueryEx ret="+ret);
    Console.Write("hex: "); for(int i=0;i<48;i++)Console.Write(mbi[i].ToString("X2")+" "); Console.WriteLine();
    Console.WriteLine("解析各偏移:");
    for(int off=0;off<48;off+=8) Console.WriteLine("  off"+off+": Int64="+BitConverter.ToInt64(mbi,off).ToString("X"));
    for(int off=0;off<44;off+=4) Console.WriteLine("  off"+off+": UInt32="+BitConverter.ToUInt32(mbi,off).ToString("X"));
    // 试连续扫几个区域, 看addr推进对不对
    Console.WriteLine("\n扫前10个区域:");
    long addr=0x00010000; int cnt=0; long totalSize=0;
    while(addr<0x80000000 && cnt<10){
      int r=VirtualQueryEx(h,(IntPtr)addr,mbi,48);
      if(r==0){Console.WriteLine("  VQ=0 @"+addr.ToString("X")); break;}
      long ba=BitConverter.ToInt64(mbi,0);
      // 试不同偏移读RegionSize
      Console.WriteLine("  addr="+addr.ToString("X")+" ba="+ba.ToString("X")+" ret="+r);
      Console.Write("    "); for(int i=0;i<32;i++)Console.Write(mbi[i].ToString("X2")+" "); Console.WriteLine();
      addr+=0x1000; cnt++;
    }
    CloseHandle(h); pr.Kill();
  }
}
