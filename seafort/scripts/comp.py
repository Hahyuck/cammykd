import sys, io, json, struct, numpy as np
from scipy import ndimage, sparse
from scipy.sparse.csgraph import connected_components
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
exec(open('prep_read.py').read())          # P, N, UV, I, base, mr, nm, C (vertex colours) of s.glb
WL = -0.165
# local water height field from the full-resolution scan (as before)
Pf = np.load('/home/claude/out/P.npy').astype(np.float64); Cf = np.load('/home/claude/out/C.npy').astype(float); Nf = np.load('/home/claude/out/N.npy')
tf = (Cf[:,2] > Cf[:,0]*1.35) & (Cf[:,1] > Cf[:,0]*1.15) & (Cf[:,2] > 50) & (Nf[:,1] > 0.9) & (Pf[:,1] < -0.135)
GN = 64; bx0, bx1, bz0, bz1 = -0.50, 0.50, -0.45, 0.45
ix = np.clip(((Pf[tf,0]-bx0)/(bx1-bx0)*GN).astype(int), 0, GN-1); iz = np.clip(((Pf[tf,2]-bz0)/(bz1-bz0)*GN).astype(int), 0, GN-1)
hs = np.zeros((GN,GN)); hc = np.zeros((GN,GN)); np.add.at(hs, (iz,ix), Pf[tf,1]); np.add.at(hc, (iz,ix), 1)
ok = hc > 8; hm = np.where(ok, hs/np.maximum(hc,1), 0); idx = ndimage.distance_transform_edt(~ok, return_distances=False, return_indices=True); hm = hm[idx[0], idx[1]]
hm = ndimage.median_filter(hm, 3)
def field(Q):
    fx = np.clip((Q[:,0]-bx0)/(bx1-bx0)*GN-0.5, 0, GN-1.001); fz = np.clip((Q[:,2]-bz0)/(bz1-bz0)*GN-0.5, 0, GN-1.001)
    return hm[np.round(fz).astype(int), np.round(fx).astype(int)]          # nearest: terraces keep their steps
hl = field(P)
teal = (C[:,2] > C[:,0]*1.35) & (C[:,1] > C[:,0]*1.15) & (C[:,2] > 50)
# 1) the diorama's base goes: everything under the local water, and the teal sheet lying on it
under = P[:,1] < hl + 0.004
slab = under | (teal & (P[:,1] < hl + 0.016))
keep = ~slab[I].all(1); I = I[keep]; print('tris after base removal', len(I))
# 2) pieces: connectivity by position (UV seams do not split a building)
key = np.round(P*40000).astype(np.int64); _, wid = np.unique(key, axis=0, return_inverse=True); wid = wid.ravel()
A = sparse.coo_matrix((np.ones(len(I)*3), (np.r_[wid[I[:,0]], wid[I[:,1]], wid[I[:,2]]], np.r_[wid[I[:,1]], wid[I[:,2]], wid[I[:,0]]])), shape=(wid.max()+1,)*2)
nc, lab = connected_components(A, directed=False); vlab = lab[wid]; tl = vlab[I[:,0]]
AX, AZ, S = 0.155, 0.020, 219
def world(Q): return np.stack([10 - (Q[:,2]-AZ)*S, (Q[:,1]-WL)*S, -66 + (Q[:,0]-AX)*S], 1)     # yaw -90
W = world(P)
cnt = np.bincount(tl, minlength=nc); order = np.argsort(-cnt)
shift = np.zeros(nc); info = []
for c in order:
    if cnt[c] == 0: continue
    v = np.unique(I[tl == c]); y = P[v,1]; h = hl[v]
    foot = v[y <= np.percentile(y, 12)]
    sh = WL - np.median(hl[foot]); gap = (y.min() - np.median(h))*S          # metres its lowest point stands over its own water
    shift[c] = sh; info.append((c, cnt[c], gap, sh*S, W[v].min(0), W[v].max(0)))
print('pieces', len(info))
print('big pieces: id tris gap(m) shift(m) world-bbox')
for c, n, gap, sh, a, b in info[:22]: print(c, n, round(gap,1), round(sh,1), a.round(0), b.round(0))
print('FLOATING pieces (lowest point > 6 m over the water, > 30 tris):')
fl = [r for r in info if r[2] > 6 and r[1] > 30]
for c, n, gap, sh, a, b in fl: print(c, n, round(gap,1), a.round(0), b.round(0))
np.save('/home/claude/out/comp_lab.npy', vlab); json.dump({'float': [int(r[0]) for r in fl]}, open('/home/claude/out/comp.json','w'))

# ---- 3) every piece moves as one rigid body: the two big ones stay where the sculptor put them, the islets and pavilions are set on the water ----
import base64
BIG = {int(order[0]), int(order[1])}; drop = set(json.load(open('/home/claude/out/comp.json'))['float']) | {int(c) for c in order if 0 < cnt[c] < 30}
drop |= BIG | {0, 978}      # the town is rebuilt in code (36_town.js): only the wreck islet and the buoys stay as scanned
P2 = P.copy()
for c, n, gap, sh, a, b in info:
    if c in BIG or c in drop: continue
    v = np.unique(I[tl == c]); P2[v,1] += shift[c]
I2 = I[~np.isin(tl, list(drop))]
used = np.unique(I2); remap = -np.ones(len(P), np.int64); remap[used] = np.arange(len(used)); I2 = remap[I2]; P2, N2, UV2 = P2[used], N[used], UV[used]
print('final verts', len(P2), 'tris', len(I2), 'dropped pieces', len(drop))
mn, mx = P2.min(0), P2.max(0); q = np.round((P2-mn)/(mx-mn)*65535).astype('<u2')
nl = np.linalg.norm(N2, axis=1, keepdims=True); qn = np.round(N2/np.where(nl>0, nl, 1)*127).astype('i1'); quv = np.round(np.clip(UV2,0,1)*65535).astype('<u2')
b64 = lambda a: base64.b64encode(a.tobytes()).decode()
def tj(im, s, qq):
    bio = io.BytesIO(); im.resize((s,s), Image.LANCZOS).save(bio, 'JPEG', quality=qq, optimize=True); return bio.getvalue()
jb, jn, jm = tj(base, 2048, 84), tj(nm, 1024, 88), tj(mr, 512, 82)
d = dict(nv=len(P2), nt=len(I2), mn=mn.tolist(), mx=mx.tolist(), wl=WL, pos=b64(q), nrm=b64(qn), uv=b64(quv), idx=b64(I2.astype('<u4')),
         tBase='data:image/jpeg;base64,'+base64.b64encode(jb).decode(), tNorm='data:image/jpeg;base64,'+base64.b64encode(jn).decode(), tMR='data:image/jpeg;base64,'+base64.b64encode(jm).decode())
s = "'use strict';\n// ---- the set: a Tripo diorama (sea-fort town), decimated and quantized. DATA, not code. Its base is cut away; the two big pieces\n//      are as sculpted, the islets and pavilions are each set on the water as rigid bodies; one floating canopy is removed ----\nconst SET_DATA = " + json.dumps(d) + ";\n"
open('/home/claude/out/31_setdata.js', 'w').write(s); print('module bytes', len(s))
