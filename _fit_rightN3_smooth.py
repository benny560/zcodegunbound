# -*- coding: utf-8 -*-
# 右N3 平滑重标定: 7.20实测10点=金标(w=6) + 识别数据36点=趋势(陡角降权)
# 模型: A(sd)=cubic加权LSQ; g(sd)=P^2*sin(2A)/(0.4*sd) quadratic加权LSQ; P=sqrt(0.4*sd*g/sin2A)
import json, math

R3 = json.load(open(r'c:\Users\fanli\Documents\zcodegunbound\_ident_table.json'))['R3']
# 7.20 用户实测锚点 (10点, 0风)
MEAS = [(14,80.2,3.72),(15,79.4,3.72),(16,78.7,3.73),(17,78.0,3.73),(18,77.2,3.73),
        (19,76.5,3.74),(20,75.8,3.74),(22,74.3,3.75),(24,72.8,3.76),(26,71.4,3.78)]
OLD = {1:(89.3,3.73),2:(88.7,3.73),40:(61.3,3.98),41:(60.6,3.98),42:(60.2,4.02)}

def gphase(sd,a,p):
    return p*p*math.sin(math.radians(2*a))/(0.4*sd)

# 样本: (sd, angle, power, w)  —— 角度和力度都直接加权拟合(避开陡角g反算噪声)
samples = []
for r in R3:
    sd,a,p = r['sd'], r['angle'], r['power']
    samples.append((sd, a, p, 1.0))
for sd,a,p in MEAS:
    samples.append((sd, a, p, 6.0))

def wpolyfit(xs, ys, ws, deg):
    # 加权最小二乘 (正规方程, 小规模够用)
    n = deg+1
    A = [[sum(w*x**(i+j) for x,w in zip(xs,ws)) for j in range(n)] for i in range(n)]
    b = [sum(w*y*x**i for x,y,w in zip(xs,ys,ws)) for i in range(n)]
    # 高斯消元
    for c in range(n):
        piv = max(range(c,n), key=lambda r: abs(A[r][c]))
        A[c],A[piv]=A[piv],A[c]; b[c],b[piv]=b[piv],b[c]
        for r in range(c+1,n):
            f = A[r][c]/A[c][c]
            for k in range(c,n): A[r][k]-=f*A[c][k]
            b[r]-=f*b[c]
    coef=[0]*n
    for r in range(n-1,-1,-1):
        coef[r]=(b[r]-sum(A[r][k]*coef[k] for k in range(r+1,n)))/A[r][r]
    return coef

def ev(coef, x):
    return sum(c*x**i for i,c in enumerate(coef))

xs=[s[0] for s in samples]
ca = wpolyfit(xs, [s[1] for s in samples], [s[3] for s in samples], 3)
cp = wpolyfit(xs, [s[2] for s in samples], [s[3] for s in samples], 3)

print('A(sd) cubic:', ['%.6f'%c for c in ca])
print('P(sd) cubic:', ['%.6f'%c for c in cp])

# 生成 sd1-40 表 (角度力度均直接拟合, sd1-2也纳入拟合消除接缝台阶)
tbl={}
for sd in range(1,41):
    a = ev(ca, sd); p = ev(cp, sd)
    tbl[sd]=(round(a,1), round(p,3))

# 锚点回检
print('\n-- 7.20实测锚点回检 (拟合-实测) --')
for sd,a,p in MEAS:
    fa,fp = tbl[sd]
    print(f'  sd={sd:2}: fit {fa}/{fp:.3f}  meas {a}/{p}  dA={fa-a:+.2f} dP={fp-p:+.3f}')

# 识别点对比 (整数角量化容差 ±0.5°)
print('\n-- 识别数据对比 (fit-ident) --')
mae_a=mae_p=mx_a=mx_p=0
for r in R3:
    sd=r['sd']; fa,fp=tbl[sd]
    da=fa-r['angle']; dp=fp-r['power']
    mae_a+=abs(da); mae_p+=abs(dp); mx_a=max(mx_a,abs(da)); mx_p=max(mx_p,abs(dp))
    flag=' *' if abs(da)>0.65 else ''
    print(f'  sd={sd:2}: fit {fa}/{fp:.3f}  ident {r["angle"]}/{r["power"]}  dA={da:+.2f} dP={dp:+.3f}{flag}')
print(f'  MAE: {mae_a/len(R3):.2f}deg / {mae_p/len(R3):.3f}   Max: {mx_a:.2f}deg / {mx_p:.3f}')

# 平滑度 + 物理自洽(g复核)
print('\n-- 平滑度 (相邻整数sd步长) --')
mxda=mxdp=0; rev=0
for sd in range(2,41):
    da=tbl[sd][0]-tbl[sd-1][0]; dp=tbl[sd][1]-tbl[sd-1][1]
    mxda=max(mxda,abs(da)); mxdp=max(mxdp,abs(dp))
    if dp<-0.0005: rev+=1
print(f'  max|dA/sd|={mxda:.2f}  max|dP/sd|={mxdp:.3f}  力度回落次数={rev}')
gs=[gphase(sd,tbl[sd][0],tbl[sd][1]) for sd in range(1,41)]
print(f'  物理量 g=P^2*sin2A/(0.4sd) 范围: {min(gs):.4f}~{max(gs):.4f} (守恒性)')

# 接缝: sd1-2拟合值(覆盖旧保留) + sd40→sd41(保留旧表)
print('\n-- 接缝检查 --')
print(f'  sd1 fit {tbl[1]} (旧保留 {OLD[1]})')
print(f'  sd2 fit {tbl[2]} (旧保留 {OLD[2]}) -> sd3 fit {tbl[3]}')
print(f'  sd40 fit {tbl[40]} -> sd41(保留 {OLD[41]}) (旧sd40={OLD[40]})')

# 对比 v1.48 锯齿低点 (偏小问题): 拟合力度应抬升这些点
print('\n-- 对比 v1.48 锯齿低点 (实战偏小嫌疑点) --')
saw = {8:3.7, 11:3.7, 14:3.7, 15:3.7, 18:3.7, 22:3.72, 26:3.75, 27:3.75, 30:3.77}
for sd,p48 in saw.items():
    print(f'  sd={sd:2}: v1.48={p48:.2f}  fit={tbl[sd][1]:.3f}  ({tbl[sd][1]-p48:+.3f})')

# 输出JS表 (sd3-40, 角1位小数 力3位)
row = ','.join(f'[{sd},{tbl[sd][0]},{tbl[sd][1]}]' for sd in range(1,41))
print('\nJS:', row)
