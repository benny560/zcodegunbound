using System;
using System.Diagnostics;
class Time {
  static void Main(){
    var sw=Stopwatch.StartNew();
    // 复用ui_full的逻辑跑一组, 测时间
    Console.WriteLine("开始计时...");
    System.Diagnostics.Process p=new System.Diagnostics.Process();
    p.StartInfo=new ProcessStartInfo("ui_full.exe"){Arguments="20 0 5 timing_test", WorkingDirectory=Environment.CurrentDirectory, UseShellExecute=false, RedirectStandardOutput=true};
    p.Start(); p.WaitForExit();
    sw.Stop();
    Console.WriteLine("单组(含启动exe)耗时: "+sw.ElapsedMilliseconds+"ms = "+(sw.ElapsedMilliseconds/1000.0).ToString("0.0")+"秒");
  }
}
