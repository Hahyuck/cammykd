import numpy as np, json, base64, re, sys
s = open('/home/claude/out/31_setdata.js').read(); D = json.loads(s[s.index('{'):s.rindex('}')+1])
q = np.frombuffer(base64.b64decode(D['pos']), '<u2').reshape(-1,3).astype(np.float64); mn = np.array(D['mn']); mx = np.array(D['mx'])
M = q/65535*(mx-mn)+mn
AX, AZ, SC, YAW, WL = 0.155, 0.020, 219, np.radians(-90), D['wl']
x = (M[:,0]-AX)*SC; y = (M[:,1]-WL)*SC; z = (M[:,2]-AZ)*SC; cy, sy = np.cos(YAW), np.sin(YAW)
W = np.stack([10 + x*cy + z*sy, 0.05 + y, -66 - x*sy + z*cy], 1)
np.save('/home/claude/out/W.npy', W)
X0, X1, Z0, Z1, C = -90, 118, -214, 16, 2.0
nx, nz = int((X1-X0)/C), int((Z1-Z0)/C)
H = np.full((nz, nx), -1.0); ix = ((W[:,0]-X0)/C).astype(int); iz = ((W[:,2]-Z0)/C).astype(int); ok = (ix>=0)&(ix<nx)&(iz>=0)&(iz<nz)
np.maximum.at(H, (iz[ok], ix[ok]), W[ok,1]); np.save('/home/claude/out/H.npy', H)
print('world bbox', W.min(0).round(1), W.max(0).round(1))
B = 8; print('max height per %dm cell; cols x from %d step %d; rows z from %d (far) to %d (near camera)' % (B, X0, B, Z0, Z1))
print('      ' + ''.join('%4d' % (X0 + i*B) for i in range(0, nx*2//B)))
k = int(B/C)
for r in range(0, nz, k):
    row = H[r:r+k].reshape(-1, nx)
    print('%5d ' % (Z0 + r*C) + ''.join(('%4d' % row[:, c:c+k].max()) if row[:, c:c+k].max() > 0.5 else '   .' for c in range(0, nx, k)))
