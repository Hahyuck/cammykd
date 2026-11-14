src = '/home/claude/glb/s.glb'
b = open(src,'rb').read(); jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20+jl]); bin0 = 20+jl+8
CT = {5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}; NC = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def acc(i):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]; n = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
    o = bin0+v.get('byteOffset',0)+a.get('byteOffset',0); st = v.get('byteStride', 0)
    if st and st != dt.itemsize*n:
        raw = np.frombuffer(b, 'u1', st*a['count'], o).reshape(-1, st)[:, :dt.itemsize*n].copy(); arr = raw.view(dt).reshape(-1, n)
    else: arr = np.frombuffer(b, dt, a['count']*n, o).reshape(-1, n)
    arr = arr.astype(np.float64) if dt.kind == 'f' else arr
    if a.get('normalized'): arr = arr.astype(np.float64)/np.iinfo(dt).max
    return arr
def img(i): v = j['bufferViews'][j['images'][i]['bufferView']]; o = bin0+v.get('byteOffset',0); return Image.open(io.BytesIO(b[o:o+v['byteLength']]))
pr = j['meshes'][0]['primitives'][0]
P = acc(pr['attributes']['POSITION']).astype(np.float64); N = acc(pr['attributes']['NORMAL']).astype(np.float64); UV = acc(pr['attributes']['TEXCOORD_0']).astype(np.float64)
I = acc(pr['indices']).astype(np.int64).reshape(-1, 3)
node = j['nodes'][0]; print('node', {k: node[k] for k in node if k in ('scale','translation','rotation','matrix')})
if 'scale' in node: P = P*np.array(node['scale'])
if 'translation' in node: P = P+np.array(node['translation'])

mat = j['materials'][0]; ti = lambda t: j['textures'][t['index']]['source']
base = img(ti(mat['pbrMetallicRoughness']['baseColorTexture'])).convert('RGB'); mr = img(ti(mat['pbrMetallicRoughness']['metallicRoughnessTexture'])).convert('RGB'); nm = img(ti(mat['normalTexture'])).convert('RGB')
tex = np.asarray(base.resize((2048,2048))); H_, W_ = tex.shape[:2]
C = tex[np.clip((UV[:,1]%1*H_).astype(int),0,H_-1), np.clip((UV[:,0]%1*W_).astype(int),0,W_-1)].astype(float)
