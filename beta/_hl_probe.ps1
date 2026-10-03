$code = @'
using System;
using System.Text;
using System.Threading;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class HP {
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
  static IntPtr calc; static Dictionary<int,IntPtr> ctrl; static Dictionary<int,int[]> cen; static IntPtr deskH; static List<int> optIds;
  static string log="";
  static void Find(){ calc=IntPtr.Zero; EnumDesktopWindows(deskH,(h,l)=>{ var sb=new StringBuilder(256); GetClassName(h,sb,256); if(sb.ToString()=="ThunderRT6FormDC"){ RECT r; GetWindowRect(h,out r); if((r.R-r.L)>400) calc=h; } return true; }, IntPtr.Zero); }
  static IntPtr FindL(){ IntPtr res=IntPtr.Zero; EnumDesktopWindows(deskH,(h,l)=>{ var sb=new StringBuilder(256); GetClassName(h,sb,256); if(sb.ToString()=="ThunderRT6FormDC"){ RECT r; GetWindowRect(h,out r); if((r.R-r.L)<=400) res=h; } return true; }, IntPtr.Zero); return res; }
  static void Map(){ ctrl=new Dictionary<int,IntPtr>(); cen=new Dictionary<int,int[]>(); RECT fr; GetWindowRect(calc,out fr); EnumChildWindows(calc,(h,l)=>{ int id=GetDlgCtrlID(h); RECT r; GetWindowRect(h,out r); ctrl[id]=h; cen[id]=new int[]{(r.L+r.R)/2-fr.L,(r.T+r.B)/2-fr.T}; return true; }, IntPtr.Zero); optIds=new List<int>(); foreach(int k in ctrl.Keys){ if(k>=18&&k<=65) optIds.Add(k);} optIds.Sort(); }
  static void Clk(int id){ SendMessage(ctrl[id],0x00F5,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(40); }
  static void Sample(int d,int hh,int w,int oi){ SendMessageA(ctrl[14],0xC,IntPtr.Zero,d.ToString()); SendMessageA(ctrl[15],0xC,IntPtr.Zero,hh.ToString()); SendMessageA(ctrl[13],0xC,IntPtr.Zero,w.ToString()); Thread.Sleep(70); Clk(12);Clk(11);Clk(10);Clk(9); Clk(optIds[oi%optIds.Count]); Clk(optIds[(oi+12)%optIds.Count]); Thread.Sleep(250); }
  static void Shot(string p){ RECT fr; GetWindowRect(calc,out fr); int w=fr.R-fr.L,h=fr.B-fr.T; Bitmap b=new Bitmap(w,h); Graphics g=Graphics.FromImage(b); IntPtr dc=g.GetHdc(); PrintWindow(calc,dc,2); g.ReleaseHdc(dc); g.Dispose(); b.Save(p,ImageFormat.Png); b.Dispose(); }
  public static string Run(string exe,string dir){
    Thread t=new Thread(()=>{
      deskH=CreateDesktop("TricoHP",IntPtr.Zero,IntPtr.Zero,0,0x10000000,IntPtr.Zero);
      var si=new STARTUPINFO(); si.cb=Marshal.SizeOf(typeof(STARTUPINFO)); si.desktop="WinSta0\\TricoHP";
      PROCESS_INFORMATION pi; CreateProcess(exe,null,IntPtr.Zero,IntPtr.Zero,false,0,IntPtr.Zero,null,ref si,out pi);
      SetThreadDesktop(deskH); Thread.Sleep(3500);
      Find(); if(calc==IntPtr.Zero){ var lz=FindL(); IntPtr btn=IntPtr.Zero; EnumChildWindows(lz,(h,l)=>{ if(GetDlgCtrlID(h)==2) btn=h; return true;},IntPtr.Zero); SendMessage(btn,0xF5,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(1200); Find(); }
      if(calc==IntPtr.Zero){ log+="NO CALC"; return; }
      Map();
      // dial center = avg of option centers
      double cxs=0,cys=0; foreach(int id in optIds){ cxs+=cen[id][0]; cys+=cen[id][1]; } cxs/=optIds.Count; cys/=optIds.Count;
      log+="DIALCEN="+((int)cxs)+","+((int)cys)+";MAP:";
      foreach(int id in optIds){ double ang=Math.Atan2(cen[id][1]-cys, cen[id][0]-cxs)*180.0/Math.PI; log+=id+"="+((int)Math.Round(ang))+" "; }
      log+=";";
      Sample(5,0,0,0); Shot(dir+"\\_probeR.png"); log+="R done;";
      Clk(16); Thread.Sleep(400); Find(); Map();  // toggle attack direction
      Sample(5,0,0,0); Shot(dir+"\\_probeL.png"); log+="L done;";
    });
    t.SetApartmentState(ApartmentState.STA); t.Start(); t.Join();
    if(deskH!=IntPtr.Zero) CloseDesktop(deskH);
    return log;
  }
}
'@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
$r=[HP]::Run("$dir\2.2.3.exe",$dir)
Write-Output $r
