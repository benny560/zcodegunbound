param(
  [string]$exe,[string]$deskName,[int]$launchBtn,[string]$modeLabel,[string]$tag,
  [string]$job='calib',            # calib | base | wind
  [int]$dMin=0,[int]$dMax=45,[int]$hMin=-15,[int]$hMax=15,
  [int]$wMin=1,[int]$wMax=26,[int]$wDist=20,[int]$wDrop=0,
  [int]$inkMode=0,
  [string]$outCsv=''
)
$code = @'
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class GS {
  [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateDesktop(string n, IntPtr d, IntPtr dm, int f, uint a, IntPtr sa);
  [DllImport("user32.dll", SetLastError=true)] static extern bool SetThreadDesktop(IntPtr h);
  [DllImport("user32.dll", SetLastError=true)] static extern bool CloseDesktop(IntPtr h);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string app,string cmd,IntPtr pa,IntPtr ta,bool inh,uint fl,IntPtr env,string cd, ref STARTUPINFO si, out PROCESS_INFORMATION pi);
  [DllImport("user32.dll")] static extern bool EnumDesktopWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint fl);
  [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll", EntryPoint="SendMessageA")] static extern IntPtr SendMsgB(IntPtr h, uint m, IntPtr w, byte[] l);
  [DllImport("user32.dll", EntryPoint="SendMessageA", CharSet=CharSet.Ansi)] static extern IntPtr SendMsgS(IntPtr h, uint m, IntPtr w, string l);
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] struct RECT { public int L,T,R,B; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct STARTUPINFO { public int cb; public string res; public string desktop; public string title; public int x,y,xs,ys,xc,yc,fill,flags; public short sw,cb2; public IntPtr rv,si,so,se; }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr p,t; public int pid,tid; }

  static IntPtr deskH, calc; static StringBuilder log=new StringBuilder(); static Encoding gb;
  static int tbDist,tbDrop,tbWind, pDist,mDist,pDrop,mDrop,pWind,mWind;
  static Dictionary<int,IntPtr> ctrl=new Dictionary<int,IntPtr>();
  static List<int> opts=new List<int>(); static Dictionary<int,int> ang=new Dictionary<int,int>();
  static int[][] bands; static int BX0,BX1;
  static int GW=10,GH=12;
  static Dictionary<char,List<bool[]>> tpl=new Dictionary<char,List<bool[]>>();

  static string Txt(IntPtr h){ byte[] b=new byte[512]; int n=(int)SendMsgB(h,0x000D,(IntPtr)512,b); return n<=0?"":gb.GetString(b,0,n); }
  static List<IntPtr> Forms(){ var l=new List<IntPtr>(); EnumDesktopWindows(deskH,(h,x)=>{ var s=new StringBuilder(256); GetClassName(h,s,256); if(IsWindowVisible(h)&&s.ToString()=="ThunderRT6FormDC") l.Add(h); return true; },IntPtr.Zero); return l; }

  // ---------- generic ink: differs from local background ----------
  // 'inkMode' selects the BAND LAYOUT only (0=teal right-attack, 2=pink left-attack).
  // Digits are black (0,0,0) in BOTH form styles; the pale-blue (192,192,255) in pink forms
  // is the value-box FILL, not the glyph — so the ink test is always 'dark pixel'.
  static int inkMode=0;
  static bool InkG(Bitmap b,int x,int y,Color bg){ if(x<0||y<0||x>=b.Width||y>=b.Height) return false; Color c=b.GetPixel(x,y);
    return c.R<110 && c.G<110 && c.B<110; }
  static Color ModalColor(Bitmap b,int x0,int y0,int x1,int y1){ var d=new Dictionary<int,int>(); for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++){ if(x<0||y<0||x>=b.Width||y>=b.Height) continue; Color c=b.GetPixel(x,y); int k=(c.R>>3<<10)|(c.G>>3<<5)|(c.B>>3); d[k]=d.ContainsKey(k)?d[k]+1:1; } int bk=0,bc=-1; foreach(var kv in d) if(kv.Value>bc){bc=kv.Value;bk=kv.Key;} return Color.FromArgb(((bk>>10)&31)<<3,((bk>>5)&31)<<3,(bk&31)<<3); }

  static List<int[]> Seg(Bitmap b,int y0,int y1,Color bg){ var r=new List<int[]>(); int s=-1; for(int x=BX0;x<=BX1;x++){ bool a=false; for(int y=y0;y<=y1;y++) if(InkG(b,x,y,bg)){a=true;break;} if(a&&s<0)s=x; if(!a&&s>=0){r.Add(new int[]{s,x-1});s=-1;} } if(s>=0) r.Add(new int[]{s,BX1}); return r; }
  static bool[] Norm(Bitmap b,int c0,int c1,int y0,int y1,Color bg){ bool[] g=new bool[GW*GH]; int w=c1-c0+1,h=y1-y0+1; for(int rr=0;rr<GH;rr++)for(int cc=0;cc<GW;cc++){ int sx0=c0+(int)((double)cc*w/GW),sx1=c0+(int)((double)(cc+1)*w/GW)-1; if(sx1<sx0)sx1=sx0; int sy0=y0+(int)((double)rr*h/GH),sy1=y0+(int)((double)(rr+1)*h/GH)-1; if(sy1<sy0)sy1=sy0; bool a=false; for(int x=sx0;x<=sx1&&!a;x++)for(int y=sy0;y<=sy1;y++) if(InkG(b,x,y,bg)){a=true;break;} g[rr*GW+cc]=a; } return g; }
  static int Diff(bool[] a,bool[] b){ int d=0; for(int i=0;i<a.Length;i++) if(a[i]!=b[i]) d++; return d; }
  static char Match(bool[] g){ char best='?'; int bd=9999; foreach(var kv in tpl) foreach(var t in kv.Value){ int d=Diff(g,t); if(d<bd){bd=d;best=kv.Key;} } return best; }
  static void AddT(char c,bool[] g){ if(!tpl.ContainsKey(c)) tpl[c]=new List<bool[]>(); tpl[c].Add(g); }

  // build shape templates from the reference 2.2.3-R capture (dark digits on tan)
  public static string BuildTpl(string png,string[] labels,int[][] bnd,int bx0,int bx1){
    gb=Encoding.GetEncoding(936);
    Bitmap b=new Bitmap(png); int sv0=BX0,sv1=BX1; BX0=bx0; BX1=bx1;
    for(int i=0;i<8;i++){ if(labels[i]=="") continue; Color bg=ModalColor(b,bx0,bnd[i][0],bx1,bnd[i][1]);
      var runs=Seg(b,bnd[i][0],bnd[i][1],bg); if(runs.Count!=labels[i].Length) continue;
      for(int j=0;j<runs.Count;j++) AddT(labels[i][j], Norm(b,runs[j][0],runs[j][1],bnd[i][0],bnd[i][1],bg)); }
    b.Dispose(); BX0=sv0; BX1=sv1;
    int n=0; foreach(var kv in tpl) n+=kv.Value.Count; return "templates="+n;
  }

  static void Shot(out Bitmap bmp){ RECT fr; GetWindowRect(calc,out fr); int w=fr.R-fr.L,h=fr.B-fr.T; bmp=new Bitmap(w,h); Graphics g=Graphics.FromImage(bmp); IntPtr dc=g.GetHdc(); PrintWindow(calc,dc,2); g.ReleaseHdc(dc); g.Dispose(); }

  // ---------- auto layout ----------
  static bool Layout(){
    ctrl.Clear(); opts.Clear();
    RECT fr; GetWindowRect(calc,out fr);
    var tbs=new List<int[]>(); var btns=new List<object[]>(); var frames=new List<int[]>();
    EnumChildWindows(calc,(h,x)=>{ var c=new StringBuilder(256); GetClassName(h,c,256); string cl=c.ToString();
      int id=GetDlgCtrlID(h); RECT r; GetWindowRect(h,out r); ctrl[id]=h;
      int cx=(r.L+r.R)/2-fr.L, cy=(r.T+r.B)/2-fr.T;
      if(cl=="ThunderRT6TextBox") tbs.Add(new int[]{cx,id});
      else if(cl=="ThunderRT6OptionButton"){ opts.Add(id); ang[id]=0; }
      else if(cl=="ThunderRT6CommandButton") btns.Add(new object[]{cx,cy,id,Txt(h)});
      else if(cl=="ThunderRT6Frame") frames.Add(new int[]{r.L-fr.L,r.T-fr.T,r.R-fr.L,r.B-fr.T});
      return true; },IntPtr.Zero);
    if(tbs.Count<3||opts.Count<40) { log.AppendLine("LAYOUT FAIL tb="+tbs.Count+" opts="+opts.Count); return false; }
    tbs.Sort((u,v)=>u[0]-v[0]); tbDist=tbs[0][1]; tbDrop=tbs[1][1]; tbWind=tbs[2][1];
    // nudge buttons: for each textbox, nearest '+'-like and '-'-like button by |dx|
    int[] tbx=new int[]{tbs[0][0],tbs[1][0],tbs[2][0]}; int[] pid=new int[3], mid=new int[3];
    for(int k=0;k<3;k++){ int bp=-1,bneg=-1,dp=99999,dm=99999;
      foreach(var o in btns){ int cx=(int)o[0]; int id=(int)o[2]; string t=((string)o[3]).Trim();
        bool isP = (t=="+"||t=="+1"); bool isM = (t=="-"||t=="-1");
        if(!isP&&!isM) continue; int d=Math.Abs(cx-tbx[k]);
        if(isP&&d<dp){dp=d;bp=id;} if(isM&&d<dm){dm=d;bneg=id;} }
      pid[k]=bp; mid[k]=bneg; }
    pDist=pid[0];mDist=mid[0];pDrop=pid[1];mDrop=mid[1];pWind=pid[2];mWind=mid[2];
    opts.Sort();
    // dial centre -> per-option angle
    double ax=0,ay=0; var oc=new Dictionary<int,int[]>();
    foreach(int id in opts){ RECT r; GetWindowRect(ctrl[id],out r); int cx=(r.L+r.R)/2,cy=(r.T+r.B)/2; oc[id]=new int[]{cx,cy}; ax+=cx; ay+=cy; }
    ax/=opts.Count; ay/=opts.Count;
    foreach(int id in opts) ang[id]=(int)Math.Round(Math.Atan2(oc[id][1]-ay,oc[id][0]-ax)*180.0/Math.PI);
    // output frame = right-most frame
    int[] of=null; foreach(var f in frames) if(of==null||f[0]>of[0]) of=f;
    if(of==null){ log.AppendLine("NO OUTPUT FRAME"); return false; }
    log.AppendLine("layout: dist="+tbDist+"(+"+pDist+"/-"+mDist+") drop="+tbDrop+"(+"+pDrop+"/-"+mDrop+") wind="+tbWind+"(+"+pWind+"/-"+mWind+") opts="+opts.Count+" outFrame=("+of[0]+","+of[1]+")-("+of[2]+","+of[3]+")");
    // value-box bands: offsets relative to the output frame. Two layouts:
    //   inkMode 0 = teal 'right-attack' forms (dark digits in tan boxes)
    //   inkMode 2 = pink 'left-attack' forms (pale-blue digits, no boxes)
    int[] byo; int bxa,bxb;
    if(inkMode==2){ byo=new int[]{34,46, 56,68, 96,108, 120,132, 168,180, 200,212, 232,244, 256,268}; bxa=56; bxb=76; }
    else          { byo=new int[]{32,44, 56,68, 96,108, 121,133, 160,172, 192,204, 224,236, 257,269}; bxa=52; bxb=80; }
    bands=new int[8][];
    for(int i=0;i<8;i++) bands[i]=new int[]{ of[1]+byo[i*2], of[1]+byo[i*2+1] };
    BX0=of[0]+bxa; BX1=of[0]+bxb;
    var sb2=new StringBuilder(); foreach(var z in bands) sb2.Append("["+z[0]+"-"+z[1]+"]");
    log.AppendLine("bands x="+BX0+".."+BX1+" y="+sb2.ToString());
    return true;
  }

  static void Clk(int id){ SendMessage(ctrl[id],0x00F5,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(26); }
  static string[] Sample(int d,int hh,int w,int optId){
    SendMsgS(ctrl[tbDist],0x000C,IntPtr.Zero,d.ToString());
    SendMsgS(ctrl[tbDrop],0x000C,IntPtr.Zero,hh.ToString());
    SendMsgS(ctrl[tbWind],0x000C,IntPtr.Zero,w.ToString());
    Thread.Sleep(40);
    Clk(pDist);Clk(mDist);Clk(pDrop);Clk(mDrop);Clk(pWind);Clk(mWind);
    Clk(optId); Thread.Sleep(140);
    Bitmap b; Shot(out b);
    string[] o=new string[8];
    for(int i=0;i<8;i++){ Color bg=ModalColor(b,BX0,bands[i][0],BX1,bands[i][1]);
      var runs=Seg(b,bands[i][0],bands[i][1],bg); var sb=new StringBuilder();
      foreach(var r in runs) sb.Append(Match(Norm(b,r[0],r[1],bands[i][0],bands[i][1],bg)));
      o[i]=sb.ToString(); }
    b.Dispose(); return o;
  }

  static bool Boot(string exe,string desk,int launchBtn){
    deskH=CreateDesktop(desk,IntPtr.Zero,IntPtr.Zero,0,0x10000000,IntPtr.Zero);
    var si=new STARTUPINFO(); si.cb=Marshal.SizeOf(typeof(STARTUPINFO)); si.desktop="WinSta0\\"+desk;
    PROCESS_INFORMATION pi; if(!CreateProcess(exe,null,IntPtr.Zero,IntPtr.Zero,false,0,IntPtr.Zero,null,ref si,out pi)){ log.AppendLine("CreateProcess FAIL"); return false; }
    SetThreadDesktop(deskH); Thread.Sleep(4000);
    IntPtr lz=IntPtr.Zero; foreach(var f in Forms()){ RECT r; GetWindowRect(f,out r); if(r.R-r.L<400) lz=f; }
    if(lz==IntPtr.Zero){ log.AppendLine("NO LAUNCHER"); return false; }
    IntPtr btn=IntPtr.Zero; EnumChildWindows(lz,(h,x)=>{ if(GetDlgCtrlID(h)==launchBtn) btn=h; return true; },IntPtr.Zero);
    if(btn==IntPtr.Zero){ log.AppendLine("NO LAUNCH BTN "+launchBtn); return false; }
    SendMessage(btn,0x00F5,IntPtr.Zero,IntPtr.Zero); Thread.Sleep(1500);
    calc=IntPtr.Zero; foreach(var f in Forms()){ RECT r; GetWindowRect(f,out r); if(r.R-r.L>400) calc=f; }
    if(calc==IntPtr.Zero){ log.AppendLine("NO CALC FORM"); return false; }
    RECT cr; GetWindowRect(calc,out cr);
    log.AppendLine("calc "+(cr.R-cr.L)+"x"+(cr.B-cr.T)+" title='"+Txt(calc)+"'");
    return Layout();
  }

  public static string Run(string exe,string desk,int launchBtn,string mode,string job,string dir,string tag,
                           int dMin,int dMax,int hMin,int hMax,int wMin,int wMax,int wDist,int wDrop,string csv,int ink){
    gb=Encoding.GetEncoding(936);
    Thread t=new Thread(()=>{
      inkMode=ink;
      if(!Boot(exe,desk,launchBtn)) return;
      if(job=="calib"){
        var a=Sample(20,10,0,opts[0]); log.AppendLine("calib(20,10,0) => "+string.Join("|",a));
        var b2=Sample(5,0,0,opts[5]);  log.AppendLine("calib(5,0,0)   => "+string.Join("|",b2));
        var c2=Sample(20,0,20,opts[10]); log.AppendLine("calib(20,0,w20)=> "+string.Join("|",c2));
        Bitmap bb; Shot(out bb); bb.Save(dir+"\\_gs_"+tag+".png",ImageFormat.Png); bb.Dispose();
        return;
      }
      StreamWriter sw=new StreamWriter(csv,false,Encoding.UTF8); sw.AutoFlush=true;
      int n=0;
      if(job=="base"){
        sw.WriteLine("mode,dist,drop,wind,a1,p1,a2,p2,a3,p3,a4,p4");
        int oi=0;
        for(int d=dMin;d<=dMax;d++) for(int h=hMin;h<=hMax;h++){ var o=Sample(d,h,0,opts[oi%opts.Count]); oi++;
          sw.WriteLine(mode+","+d+","+h+",0,"+string.Join(",",o)); n++; }
      } else {
        sw.WriteLine("mode,dist,drop,wind,opt,angle,a1,p1,a2,p2,a3,p3,a4,p4");
        for(int w=wMin;w<=wMax;w++) foreach(int oid in opts){ var o=Sample(wDist,wDrop,w,oid);
          sw.WriteLine(mode+","+wDist+","+wDrop+","+w+","+oid+","+ang[oid]+","+string.Join(",",o)); n++; }
      }
      sw.Close(); log.AppendLine("rows="+n);
    });
    t.SetApartmentState(ApartmentState.STA); t.Start(); t.Join();
    if(deskH!=IntPtr.Zero) CloseDesktop(deskH);
    return log.ToString();
  }
}
'@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
# shape templates from the validated 2.2.3-R reference capture
$rb=New-Object 'int[][]' 8
$rb[0]=@(143,155);$rb[1]=@(167,179);$rb[2]=@(207,219);$rb[3]=@(232,244);$rb[4]=@(271,283);$rb[5]=@(303,315);$rb[6]=@(335,347);$rb[7]=@(368,380)
$tp=[GS]::BuildTpl("$dir\_f_0.png",@('34.9','1.28','79.7','2.09','85.5','3.16','/','/'),$rb,406,434)
Write-Output $tp
if($outCsv -eq ''){ $outCsv="$dir\_gs_$tag.csv" }
$r=[GS]::Run($exe,$deskName,$launchBtn,$modeLabel,$job,$dir,$tag,$dMin,$dMax,$hMin,$hMax,$wMin,$wMax,$wDist,$wDrop,$outCsv,$inkMode)
$r | Out-File -FilePath "$dir\_gs_$tag.log" -Encoding utf8
Get-Content "$dir\_gs_$tag.log" | Out-String -Width 250
