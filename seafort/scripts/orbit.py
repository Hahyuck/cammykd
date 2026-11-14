import numpy as np, json, math
H = np.load('/home/claude/out/H.npy'); X0, Z0, C = -90, -214, 2.0; nz, nx = H.shape
def mono(xs, ys):
    n=len(xs); d=[(ys[i+1]-ys[i])/(xs[i+1]-xs[i]) for i in range(n-1)]; m=[0]*n; m[0]=d[0]; m[-1]=d[-1]
    for i in range(1,n-1): m[i]=0 if d[i-1]*d[i]<=0 else 2*d[i-1]*d[i]/(d[i-1]+d[i])
    m[0]=m[-1]=(d[0]+d[-1])/2      # the loop closes with one speed
    def f(x):
        i=0
        while i<n-2 and x>xs[i+1]: i+=1
        h=xs[i+1]-xs[i]; t=(x-xs[i])/h; t2=t*t; t3=t2*t
        return (2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1]
    return f
CX, CZ, RX, RZ = 14, -100, 150, 163
th = mono([0, 12, 40, 90], [-60, -14, 50, 300])
TW = np.array([10, 46, -66]); CEN = np.array([14, 40, -100])
CAM = []; LOOK = []
for i in range(0, 91, 2):
    t = float(i); a = math.radians(th(t)); x = CX + RX*math.sin(a); z = CZ + RZ*math.cos(a); y = 3.3 + 0.9*math.sin(t*2*math.pi/45 + 0.6)
    CAM.append([t, round(x,2), round(y,2), round(z,2), 48])
    w = 0.5 - 0.5*math.cos(a + math.radians(14)); L = TW*(1-w) + CEN*w
    LOOK.append([t] + [round(float(v),2) for v in L])
worst = 1e9; vmax = 0; prev = None
for i in range(0, 901):
    t = i/10; a = math.radians(th(t)); x = CX + RX*math.sin(a); z = CZ + RZ*math.cos(a)
    ix = int((x-X0)/C); iz = int((z-Z0)/C)
    if 0 <= ix < nx and 0 <= iz < nz: worst = min(worst, 3 - max(0, H[max(0,iz-4):iz+5, max(0,ix-4):ix+5].max()))
    if prev: vmax = max(vmax, math.hypot(x-prev[0], z-prev[1])*10)
    prev = (x, z)
print('inside-map clearance', worst, 'max speed', round(vmax,1), 'theta at 0/12/27/40/60/90', [round(th(t)) for t in (0,12,27,40,60,90)])
# strikes: the film's own four, then the storm keeps striking while the lens looks north across the town, and now and then after
ST = [27.45, 28.20, 28.65, 29.55, 31.3, 32.9, 33.7, 35.6, 37.2, 37.9, 39.8, 41.6, 43.4, 45.9, 49.5, 54.8, 60.2, 66.0, 72.5, 79.0, 83.2]
rs = np.random.RandomState(11); BOLT = []
def cam(t):
    a = math.radians(th(t)); return np.array([CX + RX*math.sin(a), 3.3, CZ + RZ*math.cos(a)]), a
for k, t in enumerate(ST):
    p, a = cam(t); w = 0.5 - 0.5*math.cos(a + math.radians(14)); L = TW*(1-w) + CEN*w
    vaz = math.atan2(L[0]-p[0], L[2]-p[2]); off = math.radians(rs.uniform(9, 25)) * (1 if rs.rand() < 0.5 else -1)
    d = rs.uniform(700, 1000); el = math.radians(rs.uniform(21, 27)); az = vaz + off
    BOLT.append([round(float(p[0] + math.sin(az)*d), 1), round(d*math.tan(el), 1), round(float(p[2] + math.cos(az)*d), 1), int(rs.randint(1, 99999))])
json.dump({'CAM': CAM, 'LOOK': LOOK, 'ST': ST, 'BOLT': BOLT}, open('/home/claude/out/tour2.json', 'w'))
print(len(CAM), 'keys', BOLT[:3])
