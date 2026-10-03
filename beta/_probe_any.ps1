param([string]$exe,[string]$deskName,[string]$clickSeq='',[int]$toggleId=0,[int]$toggleCount=0,[string]$tag='p')
$code = @'
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class PA {
  [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateDesktop(string n, IntPtr d, IntPtr dm, int f, uint a, IntPtr sa);
  [DllImport("user32.dll", SetLastError=true)] static extern bool SetThreadDesktop(IntPtr h);
  [DllImport("user32.dll", SetLastError=true)] static extern bool CloseDesktop(IntPtr h);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string app, string cmd, IntPtr pa, IntPtr ta, bool inh, uint fl, IntPtr env, string cd, ref STARTUPINFO si, out PROCESS_INFORMATION pi);
  [DllImport("user32.dll")] static extern bool EnumDesktopWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint fl);
  [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Ansi)] static extern IntPtr SendMessageA2(IntPtr h, uint m, IntPtr w, byte[] l);
  [DllImport("user32.dll", EntryPoint="SendMessageA")] static extern IntPtr SendMsgBytes(IntPtr h, uint m, IntPtr w, byte[] l);
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] struct RECT { public int L,T,R,B; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct STARTUPINFO { public int cb; public string res; public string desktop; public string title; public int x,y,xs,ys,xc,yc,fill,flags; public short sw,cb2; public IntPtr rv,si,so,se; }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr p,t; public int pid,tid; }
  static IntPtr deskH; static StringBuilder log=new StringBuilder();
  static Encoding gb;
  static string Txt(IntPtr h){ byte[] buf=new byte[512]; IntPtr n=SendMsgBytes(h,0x000D,(IntPtr)512,buf); int len=(int)n; if(len<=0) return ""; return gb.GetString(buf,0,len); }
  static List<IntPtr> Forms(){ var l=new List<IntPtr>(); EnumDesktopWindows(deskH,(h,x)=>{ var sb=new StringBuilder(256); GetClassName(h,sb,256); if(IsWindowVisible(h) && sb.ToString().StartsWith("ThunderRT6") && sb.ToString()!="ThunderRT6Main"){ l.Add(h);} return true; }, IntPtr.Zero); return l; }
  static void Dump(IntPtr f,string pngPath,string label){
    RECT fr; GetWindowRect(f,out fr); int w=fr.R-fr.L,h=fr.B-fr.T;
    var cn=new StringBuilder(256); GetClassName(f,cn,256);
    log.AppendLine("=== FORM "+label+" cls="+cn+" size="+w+"x"+h+" at("+fr.L+","+fr.T+") title='"+Txt(f)+"' ===");
    var rows=new List<string>();
    EnumChildWindows(f,(ch,x)=>{ var c=new StringBuilder(256); GetClassName(ch,c,256); RECT r; GetWindowRect(ch,out r);
      rows.Add(string.Format("  id={0,-4} {1,-26} rel=({2},{3})-({4},{5}) vis={6} txt='{7}'", GetDlgCtrlID(ch), c.ToString(), r.L-fr.L, r.T-fr.T, r.R-fr.L, r.B-fr.T, IsWindowVisible(ch), Txt(ch)));
      return true; }, IntPtr.Zero);
    rows.Sort();
    foreach(var s in rows) log.AppendLine(s);
    if(w>20&&h>20){ Bitmap b=new Bitmap(w,h); Graphics g=Graphics.FromImage(b); IntPtr dc=g.GetHdc(); PrintWindow(f,dc,2); g.ReleaseHdc(dc); g.Dispose(); b.Save(pngPath,ImageFormat.Png); b.Dispose(); log.AppendLine("  SAVED "+pngPath); }
  }
  public static string Run(string exe,string deskName,string dir,string clickSeq,int toggleId,int toggleCount,string tag){
    gb=Encoding.GetEncoding(936);
    Thread t=new Thread(()=>{
      deskH=CreateDesktop(deskName,IntPtr.Zero,IntPtr.Zero,0,0x10000000,IntPtr.Zero);
      var si=new STARTUPINFO(); si.cb=Marshal.SizeOf(typeof(STARTUPINFO)); si.desktop="WinSta0\\"+deskName;
      PROCESS_INFORMATION pi; if(!CreateProcess(exe,null,IntPtr.Zero,IntPtr.Zero,false,0,IntPtr.Zero,null,ref si,out pi)){ log.AppendLine("CreateProcess FAIL"); return; }
      SetThreadDesktop(deskH); Thread.Sleep(4000);
      var f0=Forms();
      log.AppendLine("visible forms after launch: "+f0.Count);
      for(int i=0;i<f0.Count;i++) Dump(f0[i], dir+"\\_"+tag+"_launch"+i+".png", "launch["+i+"]");
      // click launcher buttons in sequence
      if(clickSeq!=""){
        foreach(var part in clickSeq.Split(',')){
          int id=int.Parse(part.Trim());
          foreach(var f in Forms()){
            IntPtr btn=IntPtr.Zero;
            EnumChildWindows(f,(ch,x)=>{ if(GetDlgCtrlID(ch)==id){ var c=new StringBuilder(256); GetClassName(ch,c,256); if(c.ToString().Contains("CommandButton")) btn=ch; } return true; }, IntPtr.Zero);
            if(btn!=IntPtr.Zero){ log.AppendLine("clicked launcher id="+id); SendMessage(btn,0x00F5,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(1200); break; }
          }
        }
      }
      var f1=Forms();
      log.AppendLine("visible forms after clicks: "+f1.Count);
      IntPtr big=IntPtr.Zero; int bw=0;
      foreach(var f in f1){ RECT r; GetWindowRect(f,out r); if((r.R-r.L)>bw){ bw=r.R-r.L; big=f; } }
      for(int i=0;i<f1.Count;i++) Dump(f1[i], dir+"\\_"+tag+"_form"+i+".png", "form["+i+"]");
      // toggle direction
      if(toggleId>0 && toggleCount>0 && big!=IntPtr.Zero){
        for(int k=0;k<toggleCount;k++){
          IntPtr tb=IntPtr.Zero;
          EnumChildWindows(big,(ch,x)=>{ if(GetDlgCtrlID(ch)==toggleId) tb=ch; return true; }, IntPtr.Zero);
          if(tb!=IntPtr.Zero){ SendMessage(tb,0x00F5,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(1000); log.AppendLine("toggled id="+toggleId); }
        }
        var f2=Forms();
        log.AppendLine("visible forms after toggle: "+f2.Count);
        for(int i=0;i<f2.Count;i++) Dump(f2[i], dir+"\\_"+tag+"_toggled"+i+".png", "toggled["+i+"]");
      }
    });
    t.SetApartmentState(ApartmentState.STA); t.Start(); t.Join();
    if(deskH!=IntPtr.Zero) CloseDesktop(deskH);
    return log.ToString();
  }
}
'@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
$r=[PA]::Run($exe,$deskName,$dir,$clickSeq,$toggleId,$toggleCount,$tag)
$r | Out-File -FilePath "$dir\_probe_$tag.txt" -Encoding utf8
Write-Output "written $dir\_probe_$tag.txt"
