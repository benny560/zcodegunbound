$code = @'
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Drawing;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class HB {
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
  static int[][] BANDS = new int[][]{ new int[]{143,155}, new int[]{167,179}, new int[]{207,219}, new int[]{232,244}, new int[]{271,283}, new int[]{303,315}, new int[]{335,347}, new int[]{368,380} };
  static int X0=406, X1=434, GW=10, GH=12;
  static Dictionary<char,List<bool[]>> tpl = new Dictionary<char,List<bool[]>>();
  static bool Ink(Bitmap b,int x,int y){ if(x<0||y<0||x>=b.Width||y>=b.Height) return false; Color c=b.GetPixel(x,y); return (c.R<110&&c.G<110&&c.B<110); }
  static List<int[]> Seg(Bitmap b,int y0,int y1){ var runs=new List<int[]>(); int s=-1; for(int x=X0;x<=X1;x++){ bool a=false; for(int y=y0;y<=y1;y++){ if(Ink(b,x,y)){a=true;break;} } if(a&&s<0)s=x; if(!a&&s>=0){runs.Add(new int[]{s,x-1});s=-1;} } if(s>=0)runs.Add(new int[]{s,X1}); return runs; }
  static bool[] Norm(Bitmap b,int c0,int c1,int y0,int y1){ bool[] g=new bool[GW*GH]; int w=c1-c0+1,h=y1-y0+1; for(int r=0;r<GH;r++)for(int c=0;c<GW;c++){ int sx0=c0+(int)((double)c*w/GW),sx1=c0+(int)((double)(c+1)*w/GW)-1; if(sx1<sx0)sx1=sx0; int sy0=y0+(int)((double)r*h/GH),sy1=y0+(int)((double)(r+1)*h/GH)-1; if(sy1<sy0)sy1=sy0; bool a=false; for(int x=sx0;x<=sx1&&!a;x++)for(int y=sy0;y<=sy1;y++)if(Ink(b,x,y)){a=true;break;} g[r*GW+c]=a; } return g; }
  static int Diff(bool[] a,bool[] b){ int d=0; for(int i=0;i<a.Length;i++) if(a[i]!=b[i]) d++; return d; }
  static char Match(bool[] g){ char best='?'; int bd=999; foreach(var kv in tpl) foreach(var t in kv.Value){ int d=Diff(g,t); if(d<bd){bd=d;best=kv.Key;} } return best; }
  static void AddTpl(char ch,bool[] g){ if(!tpl.ContainsKey(ch)) tpl[ch]=new List<bool[]>(); tpl[ch].Add(g); }
  public static void BuildTpl(string png,string[] labels){ Bitmap b=new Bitmap(png); for(int i=0;i<8;i++){ string lab=labels[i]; if(lab=="")continue; var runs=Seg(b,BANDS[i][0],BANDS[i][1]); if(runs.Count!=lab.Length)continue; for(int j=0;j<runs.Count;j++) AddTpl(lab[j],Norm(b,runs[j][0],runs[j][1],BANDS[i][0],BANDS[i][1])); } b.Dispose(); }
  static string ReadBox(Bitmap b,int i){ var runs=Seg(b,BANDS[i][0],BANDS[i][1]); if(runs.Count==0)return ""; var sb=new StringBuilder(); foreach(var r in runs) sb.Append(Match(Norm(b,r[0],r[1],BANDS[i][0],BANDS[i][1]))); return sb.ToString(); }
  static void Find(){ calc=IntPtr.Zero; EnumDesktopWindows(deskH,(h,l)=>{ var sb=new StringBuilder(256); GetClassName(h,sb,256); if(sb.ToString()=="ThunderRT6FormDC"){ RECT r; GetWindowRect(h,out r); if((r.R-r.L)>400) calc=h; } return true; }, IntPtr.Zero); }
  static IntPtr FindL(){ IntPtr res=IntPtr.Zero; EnumDesktopWindows(deskH,(h,l)=>{ var sb=new StringBuilder(256); GetClassName(h,sb,256); if(sb.ToString()=="ThunderRT6FormDC"){ RECT r; GetWindowRect(h,out r); if((r.R-r.L)<=400) res=h; } return true; }, IntPtr.Zero); return res; }
  static void Map(){ ctrl=new Dictionary<int,IntPtr>(); EnumChildWindows(calc,(h,l)=>{ ctrl[GetDlgCtrlID(h)]=h; return true; }, IntPtr.Zero); optIds=new List<int>(); foreach(int k in ctrl.Keys){ if(k>=18&&k<=65) optIds.Add(k);} optIds.Sort(); }
  static void Clk(int id){ SendMessage(ctrl[id],0x00F5,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(30); }
  static string[] Sample(int d,int hh,int w,int oi){
    SendMessageA(ctrl[14],0xC,IntPtr.Zero,d.ToString()); SendMessageA(ctrl[15],0xC,IntPtr.Zero,hh.ToString()); SendMessageA(ctrl[13],0xC,IntPtr.Zero,w.ToString());
    Thread.Sleep(50); Clk(12);Clk(11);Clk(10);Clk(9); Clk(optIds[oi%optIds.Count]); Clk(optIds[(oi+12)%optIds.Count]); Thread.Sleep(170);
    RECT fr; GetWindowRect(calc,out fr); int cw=fr.R-fr.L,ch=fr.B-fr.T; Bitmap b=new Bitmap(cw,ch); Graphics g=Graphics.FromImage(b); IntPtr dc=g.GetHdc(); PrintWindow(calc,dc,2); g.ReleaseHdc(dc); g.Dispose();
    string[] outp=new string[8]; for(int i=0;i<8;i++) outp[i]=ReadBox(b,i); b.Dispose(); return outp;
  }
  public static string RunBase(string exe,string dir,string csv,int dMin,int dMax,int hMin,int hMax){
    string log="";
    Thread t=new Thread(()=>{
      deskH=CreateDesktop("TricoHB",IntPtr.Zero,IntPtr.Zero,0,0x10000000,IntPtr.Zero);
      var si=new STARTUPINFO(); si.cb=Marshal.SizeOf(typeof(STARTUPINFO)); si.desktop="WinSta0\\TricoHB";
      PROCESS_INFORMATION pi; CreateProcess(exe,null,IntPtr.Zero,IntPtr.Zero,false,0,IntPtr.Zero,null,ref si,out pi);
      SetThreadDesktop(deskH); Thread.Sleep(3500);
      Find(); if(calc==IntPtr.Zero){ var lz=FindL(); IntPtr btn=IntPtr.Zero; EnumChildWindows(lz,(h,l)=>{ if(GetDlgCtrlID(h)==2) btn=h; return true;},IntPtr.Zero); SendMessage(btn,0xF5,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(1200); Find(); }
      if(calc==IntPtr.Zero){ log+="NO CALC"; return; }
      Map();
      var selftest=Sample(5,0,0,0); string st=string.Join("|",selftest);
      if(st!="34.9|1.28|79.7|2.09|85.5|3.16|/|/"){ log+="SELFTEST FAIL: "+st; return; }
      log+="selftest OK; ";
      StreamWriter sw=new StreamWriter(csv,false,Encoding.UTF8); sw.AutoFlush=true;
      sw.WriteLine("dir_mode,dist,drop,wind,a1,p1,a2,p2,a3,p3,a4,p4");
      int n=0,oi=0;
      for(int d=dMin;d<=dMax;d++){ for(int h=hMin;h<=hMax;h++){ var o=Sample(d,h,0,oi); oi++; sw.WriteLine("R,"+d+","+h+",0,"+string.Join(",",o)); n++; } }
      sw.Close(); log+="rows="+n;
    });
    t.SetApartmentState(ApartmentState.STA); t.Start(); t.Join();
    if(deskH!=IntPtr.Zero) CloseDesktop(deskH);
    return log;
  }
}
'@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
[HB]::BuildTpl("$dir\_f_0.png", @('34.9','1.28','79.7','2.09','85.5','3.16','/','/'))
$r=[HB]::RunBase("$dir\2.2.3.exe",$dir,"$dir\_data_base_R.csv",1,45,-15,15)
Write-Output ("RESULT: $r")
