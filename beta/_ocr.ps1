$code = @'
using System;
using System.Text;
using System.Drawing;
using System.Collections.Generic;
public class OCR {
  // 8 output boxes in the 497x468 form: {y0,y1}; x scan range fixed
  static int[][] BANDS = new int[][]{ new int[]{143,155}, new int[]{167,179}, new int[]{207,219}, new int[]{232,244}, new int[]{271,283}, new int[]{303,315}, new int[]{335,347}, new int[]{368,380} };
  static int X0=406, X1=434;
  static int GW=10, GH=12;
  static Dictionary<char,List<bool[]>> templates = new Dictionary<char,List<bool[]>>();
  static bool Ink(Bitmap b,int x,int y){ if(x<0||y<0||x>=b.Width||y>=b.Height) return false; Color c=b.GetPixel(x,y); return (c.R<110 && c.G<110 && c.B<110); }
  // segment a band into glyph column-ranges
  static List<int[]> Segment(Bitmap b,int y0,int y1){
    var runs=new List<int[]>(); int s=-1;
    for(int x=X0;x<=X1;x++){ bool any=false; for(int y=y0;y<=y1;y++){ if(Ink(b,x,y)){ any=true; break; } }
      if(any && s<0) s=x; if(!any && s>=0){ runs.Add(new int[]{s,x-1}); s=-1; } }
    if(s>=0) runs.Add(new int[]{s,X1});
    return runs;
  }
  static bool[] Norm(Bitmap b,int c0,int c1,int y0,int y1){
    bool[] g=new bool[GW*GH]; int w=c1-c0+1; int h=y1-y0+1;
    for(int r=0;r<GH;r++){ for(int c=0;c<GW;c++){
      int sx0=c0+(int)((double)c*w/GW), sx1=c0+(int)((double)(c+1)*w/GW)-1; if(sx1<sx0) sx1=sx0;
      int sy0=y0+(int)((double)r*h/GH), sy1=y0+(int)((double)(r+1)*h/GH)-1; if(sy1<sy0) sy1=sy0;
      bool any=false; for(int x=sx0;x<=sx1 && !any;x++) for(int y=sy0;y<=sy1;y++) if(Ink(b,x,y)){ any=true; break; }
      g[r*GW+c]=any; } }
    return g;
  }
  static void AddTpl(char ch,bool[] g){ if(!templates.ContainsKey(ch)) templates[ch]=new List<bool[]>(); templates[ch].Add(g); }
  static int Diff(bool[] a,bool[] b){ int d=0; for(int i=0;i<a.Length;i++) if(a[i]!=b[i]) d++; return d; }
  static char Match(bool[] g){ char best='?'; int bd=999; foreach(var kv in templates){ foreach(var t in kv.Value){ int d=Diff(g,t); if(d<bd){ bd=d; best=kv.Key; } } } return best; }
  public static void BuildFrom(string png,string[] labels){
    Bitmap b=new Bitmap(png);
    for(int i=0;i<8;i++){ string lab=labels[i]; if(lab=="") continue; var runs=Segment(b,BANDS[i][0],BANDS[i][1]); if(runs.Count!=lab.Length) continue; for(int j=0;j<runs.Count;j++){ AddTpl(lab[j], Norm(b,runs[j][0],runs[j][1],BANDS[i][0],BANDS[i][1])); } }
    b.Dispose();
  }
  public static string ReadBox(Bitmap b,int i){ var runs=Segment(b,BANDS[i][0],BANDS[i][1]); if(runs.Count==0) return ""; var sb=new StringBuilder(); foreach(var r in runs){ sb.Append(Match(Norm(b,r[0],r[1],BANDS[i][0],BANDS[i][1]))); } return sb.ToString(); }
  public static string ReadForm(string png){ Bitmap b=new Bitmap(png); var parts=new List<string>(); for(int i=0;i<8;i++) parts.Add(ReadBox(b,i)); b.Dispose(); return string.Join("|",parts); }
  public static int TplCount(){ int n=0; foreach(var kv in templates) n+=kv.Value.Count; return n; }
}
'@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
$dir='c:\Users\fanli\Documents\zcodegunbound\beta'
# labels for _f_0 (dist5,drop0): 34.9/1.28 79.7/2.09 85.5/3.16 //
[OCR]::BuildFrom("$dir\_f_0.png", @('34.9','1.28','79.7','2.09','85.5','3.16','/','/'))
Write-Output ("templates built: $([OCR]::TplCount())")
Write-Output ("f0 => " + [OCR]::ReadForm("$dir\_f_0.png"))
Write-Output ("f3 => " + [OCR]::ReadForm("$dir\_f_3.png"))
Write-Output ("f8 => " + [OCR]::ReadForm("$dir\_f_8.png"))
Write-Output ("f13=> " + [OCR]::ReadForm("$dir\_f_13.png"))
