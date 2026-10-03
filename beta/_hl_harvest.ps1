$code = @'
using System;
using System.Text;
using System.Threading;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class HH {
  [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateDesktop(string n, IntPtr d, IntPtr dm, int f, uint a, IntPtr sa);
  [DllImport("user32.dll", SetLastError=true)] static extern bool SetThreadDesktop(IntPtr h);
  [DllImport("user32.dll", SetLastError=true)] static extern bool CloseDesktop(IntPtr h);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string app, string cmd, IntPtr pa, IntPtr ta, bool inh, uint fl, IntPtr env, string cd, ref STARTUPINFO si, out PROCESS_INFORMATION pi);
  [DllImport("user32.dll")] static extern bool EnumDesktopWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint fl);
  [DllImport("user32.dll", CharSet=CharSet.Ansi)] static extern IntPtr SendMessageA(IntPtr h, uint m, IntPtr w, string l);
  [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] struct RECT { public int L,T,R,B; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct STARTUPINFO { public int cb; public string res; public string desktop; public string title; public int x,y,xs,ys,xc,yc,fill,flags; public short sw,cb2; public IntPtr rv,si,so,se; }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr p,t; public int pid,tid; }
  static IntPtr calc; static Dictionary<int,IntPtr> ctrl; static IntPtr deskH; static List<int> optIds;
  static string log="";
  static void Find(){ calc=IntPtr.Zero; EnumDesktopWindows(deskH,(h,l)=>{ var sb=new StringBuilder(256); GetClassName(h,sb,256); if(sb.ToString()=="ThunderRT6FormDC"){ RECT r; GetWindowRect(h,out r); if((r.R-r.L)>400) calc=h; } return true; }, IntPtr.Zero); }
  static IntPtr FindLauncher(){ IntPtr res=IntPtr.Zero; EnumDesktopWindows(deskH,(h,l)=>{ var sb=new StringBuilder(256); GetClassName(h,sb,256); if(sb.ToString()=="ThunderRT6FormDC"){ RECT r; GetWindowRect(h,out r); if((r.R-r.L)<=400) res=h; } return true; }, IntPtr.Zero); return res; }
  static void MapCtrl(){ ctrl=new Dictionary<int,IntPtr>(); EnumChildWindows(calc,(h,l)=>{ ctrl[GetDlgCtrlID(h)]=h; return true; }, IntPtr.Zero); optIds=new List<int>(); foreach(int k in ctrl.Keys){ if(k>=18&&k<=65) optIds.Add(k);} optIds.Sort(); }
  static void Clk(int id){ SendMessage(ctrl[id],0x00F5,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(45); }
  static void Sample(int d,int hh,int w,int oi){
    SendMessageA(ctrl[14],0xC,IntPtr.Zero,d.ToString()); SendMessageA(ctrl[15],0xC,IntPtr.Zero,hh.ToString()); SendMessageA(ctrl[13],0xC,IntPtr.Zero,w.ToString());
    Thread.Sleep(70);
    Clk(12);Clk(11);Clk(10);Clk(9);
    Clk(optIds[oi%optIds.Count]); Clk(optIds[(oi+12)%optIds.Count]);
    Thread.Sleep(250);
  }
  static void Shot(string path){ RECT fr; GetWindowRect(calc,out fr); int w=fr.R-fr.L,h=fr.B-fr.T; Bitmap b=new Bitmap(w,h); Graphics g=Graphics.FromImage(b); IntPtr dc=g.GetHdc(); PrintWindow(calc,dc,2); g.ReleaseHdc(dc); g.Dispose(); b.Save(path,ImageFormat.Png); b.Dispose(); }
  static void Composite(string full,string comp){ Bitmap b=new Bitmap(full); int cx=350,cy=135,cw=130,ch=250; Bitmap cr=new Bitmap(cw,ch); Graphics g=Graphics.FromImage(cr); g.DrawImage(b,new Rectangle(0,0,cw,ch),new Rectangle(cx,cy,cw,ch),GraphicsUnit.Pixel); g.Dispose(); Bitmap up=new Bitmap(cw*4,ch*4); Graphics g2=Graphics.FromImage(up); g2.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor; g2.DrawImage(cr,0,0,cw*4,ch*4); g2.Dispose(); up.Save(comp,ImageFormat.Png); up.Dispose(); cr.Dispose(); b.Dispose(); }
  public static string Run(string exe, string dir, int[] ds, int[] hs){
    Thread t=new Thread(()=>{
      deskH=CreateDesktop("TricoHL", IntPtr.Zero, IntPtr.Zero, 0, 0x10000000, IntPtr.Zero);
      var si=new STARTUPINFO(); si.cb=Marshal.SizeOf(typeof(STARTUPINFO)); si.desktop="WinSta0\\TricoHL";
      PROCESS_INFORMATION pi; CreateProcess(exe,null,IntPtr.Zero,IntPtr.Zero,false,0,IntPtr.Zero,null,ref si,out pi);
      SetThreadDesktop(deskH); Thread.Sleep(3500);
      Find(); if(calc==IntPtr.Zero){ var lz=FindLauncher(); IntPtr btn=IntPtr.Zero; EnumChildWindows(lz,(h,l)=>{ if(GetDlgCtrlID(h)==2) btn=h; return true;}, IntPtr.Zero); SendMessage(btn,0xF5,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(1000); Find(); }
      if(calc==IntPtr.Zero){ log+="NO CALC;"; return; }
      MapCtrl();
      for(int i=0;i<ds.Length;i++){
        Sample(ds[i],hs[i],0,i);
        string full=dir+"\\_f_"+i+".png"; Shot(full); Composite(full,dir+"\\_cal_"+i+".png");
        log+=i+":("+ds[i]+","+hs[i]+") ";
      }
      log+="DONE "+ds.Length;
    });
    t.SetApartmentState(ApartmentState.STA); t.Start(); t.Join();
    if(deskH!=IntPtr.Zero) CloseDesktop(deskH);
    return log;
  }
}
'@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
$ds=@(5,10,15,20,25,30,35,40,45,20,20,20,20,20,8,42)
$hs=@(0,0,0,0,0,0,0,0,0,-15,-10,-5,5,10,8,-12)
$r=[HH]::Run('c:\Users\fanli\Documents\zcodegunbound\beta\2.2.3.exe','c:\Users\fanli\Documents\zcodegunbound\beta',$ds,$hs)
Write-Output ("LOG: $r")
