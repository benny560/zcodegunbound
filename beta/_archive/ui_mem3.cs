using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
class M3 {
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a, bool b, int pid);
  [DllImport("kernel32.dll")] public static extern int VirtualQueryEx(IntPtr p, IntPtr addr, byte[] buffer, int length);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool ReadProcessMemory(IntPtr p, IntPtr addr, byte[] buf, int size, out int read);
  static void Main(){
    var pr=Process.Start(new ProcessStartInfo("2.2.3.exe"){WorkingDirectory=Environment.CurrentDirectory});
    System.Threading.Thread.Sleep(3000);
    int pid=pr.Id;
    // 试不同权限: 0x1F0FFF=ALL, 0x10=VM_READ, 0x20=VM_QUERY
    IntPtr h1=OpenProcess(0x1F0FFF, false, pid);
    Console.WriteLine("OpenProcess(ALL)="+h1+" err="+Marshal.GetLastWin32Error());
    if(h1==IntPtr.Zero) h1=OpenProcess(0x10|0x20|0x0400, false, pid); // +QUERY_INFORMATION
    Console.WriteLine("OpenProcess(VR|VQ|QI)="+h1);
    if(h1==IntPtr.Zero){Console.WriteLine("无法打开(需管理员). 退出");pr.Kill();return;}
    // 单独测VirtualQueryEx
    byte[] mbi=new byte[48];
    int r=VirtualQueryEx(h1, (IntPtr)0x00400000, mbi, 48); // 从imagebase开始
    Console.WriteLine("VirtualQueryEx(0x400000) ret="+r+" (48=成功)");
    if(r>0){
      long ba=BitConverter.ToInt64(mbi,0);
      long rs=BitConverter.ToInt64(mbi,8+4+4); // 跳过AllocationProtect? 64位对齐
      Console.WriteLine("  BaseAddr="+ba.ToString("X"));
    }
    // 试试直接ReadProcessMemory一个已知地址(0x400000即PE头)
    byte[] pe=new byte[2];
    int rd;
    bool ok=ReadProcessMemory(h1,(IntPtr)0x00400000,pe,2,out rd);
    Console.WriteLine("ReadMem(0x400000)="+ok+" got="+rd+" bytes=["+pe[0]+","+pe[1]+"] (应为77,90即MZ)");
    CloseHandle(h1); pr.Kill();
  }
}
