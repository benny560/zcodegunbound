$code = @'
using System;
using System.Text;
using System.Threading;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class HL {
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
  [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] static extern void mouse_event(uint f, uint dx, uint dy, uint dw, UIntPtr e);
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] struct RECT { public int L,T,R,B; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct STARTUPINFO { public int cb; public string res; public string desktop; public string title; public int x,y,xs,ys,xc,yc,fill,flags; public short sw,cb2; public IntPtr rv,si,so,se; }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr p,t; public int pid,tid; }
  static IntPtr calc; static Dictionary<int,IntPtr> ctrl; static Dictionary<int,int[]> cen; static IntPtr deskH; static int tgtpid;
  static string log="";
  static void Find(){ calc=IntPtr.Zero; EnumDesktopWindows(deskH,(h,l)=>{ var sb=new StringBuilder(256); GetClassName(h,sb,256); if(sb.ToString()=="ThunderRT6FormDC"){ RECT r; GetWindowRect(h,out r); if((r.R-r.L)>400) calc=h; } return true; }, IntPtr.Zero); }
  static IntPtr FindLauncher(){ IntPtr res=IntPtr.Zero; EnumDesktopWindows(deskH,(h,l)=>{ var sb=new StringBuilder(256); GetClassName(h,sb,256); if(sb.ToString()=="ThunderRT6FormDC"){ RECT r; GetWindowRect(h,out r); if((r.R-r.L)<=400) res=h; } return true; }, IntPtr.Zero); return res; }
  static void MapCtrl(){ ctrl=new Dictionary<int,IntPtr>(); cen=new Dictionary<int,int[]>(); EnumChildWindows(calc,(h,l)=>{ int id=GetDlgCtrlID(h); RECT r; GetWindowRect(h,out r); ctrl[id]=h; cen[id]=new int[]{(r.L+r.R)/2,(r.T+r.B)/2}; return true; }, IntPtr.Zero); }
  static void Click(int id){ SendMessage(ctrl[id],0x00F5,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(60); }
  public static string Run(string exe, string outPng){
    Thread t=new Thread(()=>{
      deskH=CreateDesktop("TricoHeadless", IntPtr.Zero, IntPtr.Zero, 0, 0x10000000, IntPtr.Zero);
      if(deskH==IntPtr.Zero){ log+="CreateDesktop FAIL "+Marshal.GetLastWin32Error()+";"; return; }
      var si=new STARTUPINFO(); si.cb=Marshal.SizeOf(typeof(STARTUPINFO)); si.desktop="WinSta0\\TricoHeadless";
      PROCESS_INFORMATION pi;
      bool ok=CreateProcess(exe,null,IntPtr.Zero,IntPtr.Zero,false,0,IntPtr.Zero,null,ref si,out pi);
      if(!ok){ log+="CreateProcess FAIL "+Marshal.GetLastWin32Error()+";"; return; }
      tgtpid=pi.pid; log+="pid="+pi.pid+";";
      if(!SetThreadDesktop(deskH)){ log+="SetThreadDesktop FAIL "+Marshal.GetLastWin32Error()+";"; }
      Thread.Sleep(3500);
      Find();
      if(calc==IntPtr.Zero){ var lz=FindLauncher(); if(lz!=IntPtr.Zero){ IntPtr btn=IntPtr.Zero; EnumChildWindows(lz,(h,l)=>{ if(GetDlgCtrlID(h)==2) btn=h; return true;}, IntPtr.Zero); SendMessage(btn,0xF5,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(1000); Find(); } }
      if(calc==IntPtr.Zero){ log+="NO CALC;"; return; }
      log+="calc found;"; MapCtrl();
      var optIds=new List<int>(); foreach(int k in ctrl.Keys){ if(k>=18&&k<=65) optIds.Add(k);} optIds.Sort();
      SendMessageA(ctrl[14],0xC,IntPtr.Zero,"20"); SendMessageA(ctrl[15],0xC,IntPtr.Zero,"10"); SendMessageA(ctrl[13],0xC,IntPtr.Zero,"0");
      Thread.Sleep(120);
      Click(12); Click(11); Click(10); Click(9); Click(optIds[0]); Click(optIds[24]);
      Thread.Sleep(500);
      RECT fr; GetWindowRect(calc,out fr); int w=fr.R-fr.L,hh=fr.B-fr.T;
      Bitmap bmp=new Bitmap(w,hh); Graphics g=Graphics.FromImage(bmp); IntPtr hdc=g.GetHdc(); PrintWindow(calc,hdc,2); g.ReleaseHdc(hdc); g.Dispose();
      bmp.Save(outPng, ImageFormat.Png); bmp.Dispose();
      log+="saved "+w+"x"+hh+";";
    });
    t.SetApartmentState(ApartmentState.STA); t.Start(); t.Join();
    if(deskH!=IntPtr.Zero) CloseDesktop(deskH);
    return log;
  }
}
'@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
$r=[HL]::Run('c:\Users\fanli\Documents\zcodegunbound\beta\2.2.3.exe','c:\Users\fanli\Documents\zcodegunbound\beta\_hl_test.png')
Write-Output ("LOG: $r")
