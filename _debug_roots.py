# -*- coding: utf-8 -*-
import json, math, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
real = json.load(open(r"C:\Users\fanli\Documents\zcodegunbound\_real.json", encoding="utf-8"))
PF=0.004332712; G=430; MASS=0.23; ELEV_UNIT=516/13
def eff_angle(wa, side): return ((180-wa)%360+360)%360 if side=='left' else wa
OMEGA={'right':lambda V:0.023623*V**0.764315,'left':lambda V:0.687878*V**0.299291}
TURNS_RANGE={1:(0,1),2:(1.1,1.9),3:(2.1,2.9)}

# 调试 #46(idx45), #12(idx11), #48(idx47)
for target_idx in [45, 11, 47, 7]:
    r = real[target_idx]
    side = 'right' if r['side']=='右' else 'left'; n=r['n']
    wa = eff_angle(r['windAngle'], side); ws=r['windStrength']
    cosW=math.cos(wa*math.pi/180); sinW=math.sin(wa*math.pi/180)
    force = ws if abs(cosW+1)<0.001 else max(0,ws-1)
    force = 0 if ws==0 else force
    xA=cosW*force/MASS; effGrav=G-sinW*force/MASS
    V=r['power']/PF; ar=r['angle']*math.pi/180
    vx=V*math.cos(ar); vy=V*math.sin(ar)
    sd=abs(r['distance']); xDist=sd*40; elev=(r['elevation'] or 0)*ELEV_UNIT
    print(f"#{target_idx+1} N{n} 风角{r['windAngle']} 风{ws} sd{sd} 实测{r['angle']}°/{r['power']}")
    print(f"  force={force} xA={xA:.1f} effGrav={effGrav:.1f} vx={vx:.0f} vy={vy:.0f} elev={elev:.0f}")
    roots=[]
    if abs(xA)>1e-9:
        disc=vx*vx+2*xA*xDist
        if disc>=0:
            sq=math.sqrt(disc)
            for t in [(-vx+sq)/xA,(-vx-sq)/xA]:
                if t>0.01: roots.append(t)
    print(f"  根: {roots}")
    for T in roots:
        yLand=vy*T-0.5*effGrav*T*T
        turns=OMEGA[side](V)*T/(2*math.pi)
        print(f"    T={T:.3f} yLand={yLand:.0f}(目标{elev:.0f}) yErr={abs(yLand-elev):.0f} 圈数={turns:.3f}(范围{TURNS_RANGE[n]})")
