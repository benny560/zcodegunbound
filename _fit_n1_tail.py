# -*- coding: utf-8 -*-
# 用实测点(右N1 d=22.5 elev=0.6 wa=298 ws=7 -> 13/3.9)反解 T/G(22.5), 得延伸段斜率
import math
PF=0.004332712; MASS=0.23; EPPU=516/13
# 求解器口径(calcTimePhysicsSolver)
sd=22.5; xDist=sd*40.0; elev=0.6*EPPU
wa=298.0; ws=7.0
cosW=math.cos(math.radians(wa)); sinW=math.sin(math.radians(wa))
force=ws if abs(cosW+1)<0.001 else max(0,ws-1)
xA=cosW*force/MASS
wy=sinW*force/MASS
dT=0.0243-0.00066*wy
# 目标: angle=13度, P=3.9 -> V=900.13
tgtA=math.radians(13.0); V=3.9/PF
# 方程: T=T_base+dT; denomX=xDist-0.5*xA*T^2; numY=elev+0.5*(G+(-wy? no: effG=G-wy))*T^2
#   effG = G_base - sinW*force/MASS = G_base - wy
# tan(tgtA)=numY/denomX ; V=sqrt(numY^2+denomX^2)/T
# 由第二式: sqrt(numY^2+denomX^2)=V*T; 又 numY=denomX*tan -> denomX*sec(tgtA)=V*T
# denomX=V*T*cos(tgtA) -> xDist-0.5*xA*T^2 = V*T*cosA  (一元方程解T)
cosA=math.cos(tgtA); sinA=math.sin(tgtA)
# 0.5*xA*T^2 + V*cosA*T - xDist = 0
a=0.5*xA; b=V*cosA; c=-xDist
T=(-b+math.sqrt(b*b-4*a*c))/(2*a) if abs(a)>1e-12 else xDist/(V*cosA)
T_base=T-dT
# numY = V*T*sinA = elev+0.5*effG*T^2 -> effG=2*(V*T*sinA-elev)/T^2; G_base=effG+wy
effG=2*(V*T*sinA-elev)/(T*T); G_base=effG+wy
print(f'T(22.5)={T_base:.4f}  G(22.5)={G_base:.2f}   (T_flight={T:.4f} effG={effG:.2f} xA={xA:.3f} wy={wy:.3f} dT={dT:.4f})')
# 斜率(锚定 22.0 表值)
t22,g22=0.9995,374.49
tSlope=(T_base-t22)/0.5; gSlope=(G_base-g22)/0.5
print(f'tSlope={tSlope:.4f}/sd  gSlope={gSlope:.2f}/sd   (旧盲推: -0.0424 / -11.36)')
# 延伸行 22.1-24.0
rows=[]
x=22.1
while x<=24.001:
    Tx=t22+tSlope*(x-22); Gx=g22+gSlope*(x-22)
    rows.append(f'[{round(x,1)},{round(Tx,4)},{round(Gx,2)}]')
    x+=0.1
print(','.join(rows))
# 无风基线 sd23/24 (同首版方法: tanA=0.5*G*T^2/x, V=x/(cosA*T))
for sdx in (23,24):
    Tx=t22+tSlope*(sdx-22); Gx=g22+gSlope*(sdx-22); xd=sdx*40.0
    tanA=(0.5*Gx*Tx*Tx)/xd; A=math.degrees(math.atan(tanA))
    Vx=xd/(math.cos(math.radians(A))*Tx); P=Vx*PF
    print(f'sd={sdx}: {A:.2f}/{P:.3f}')
