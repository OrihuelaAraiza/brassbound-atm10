// Reader for the Ponder recordings published by the Cretania wiki (https://www.cretania.net/wiki/).
// Pure helpers: no DOM or WebGL, so the format rules stay testable in Node.
export const PONDER_API = 'https://api.cretania.net/wiki-datos/';
export const TICKS_PER_SECOND = 20;
const MARK = '\u0001', SEP = '\u0002';
const DEFAULT_VIEW = [0, -35, 145, 1];
// Cull directions of baked quads: down, up, north, south, west, east.
const FACE_DIRS = [[0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]];
const LAYERS = ['solido', 'recorte', 'translucido'];

export const stripFormatting = s => String(s ?? '').replace(/§./g, '');
export function formatArgs(text, args = []) {
  let next = 0;
  return String(text).replace(/%(?:(\d+)\$)?([sd%])/g, (m, pos, kind) => kind === '%' ? '%' : String((pos ? args[pos - 1] : args[next++]) ?? ''));
}
// Text is stored as "\x01key\x02arg\x01" segments mixed with literal text.
export function resolveText(raw, lookup) {
  if (!raw || !raw.includes(MARK)) return stripFormatting(raw);
  let out = '', at = 0;
  while (at < raw.length) {
    const open = raw.indexOf(MARK, at);
    if (open < 0) { out += raw.slice(at); break; }
    out += raw.slice(at, open);
    const close = raw.indexOf(MARK, open + 1);
    if (close < 0) { out += raw.slice(open); break; }
    const [key, ...args] = raw.slice(open + 1, close).split(SEP);
    out += formatArgs(lookup(key), args);
    at = close + 1;
  }
  return stripFormatting(out);
}
// Our Spanish string is used only when its English source matches the text recorded in the scene.
export function sceneLookup(scene, {es = () => undefined, en = () => undefined, remote = null} = {}) {
  return key => {
    const recorded = scene?.defecto?.[key], local = es(key);
    if (local && (!recorded || en(key) === recorded)) return local;
    return remote?.[key] ?? recorded ?? key;
  };
}
export const needsRemoteText = (scene, {es = () => undefined, en = () => undefined} = {}) => Object.entries(scene?.defecto || {}).some(([k, v]) => !(es(k) && en(k) === v));

// A frame of 0 repeats the previous frame.
export function expandFrames(raw) {
  const out = [];
  let last = [];
  for (const f of raw || []) { if (f !== 0) last = f; out.push(last); }
  return out;
}
export function viewAt(keys, frame) {
  let v = DEFAULT_VIEW;
  for (const k of keys || []) { if (k[0] > frame) break; v = k; }
  return {pitch: v[1], yaw: v[2], scale: v[3] || 1};
}
export const fpt = scene => scene?.fpt || 3;
export const chapterFrames = scene => (scene?.marcas || []).map(t => t * fpt(scene));
// Next chapter, or back to the current chapter start (previous one when just past it).
export function chapterTarget(marks, frame, dir, total, framesPerTick = 3) {
  if (dir > 0) return marks.find(m => m > frame + 1) ?? total - 1;
  const prev = marks.filter(m => m < frame - framesPerTick * 10);
  return prev.length ? prev.at(-1) : 0;
}
export const formatClock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
// 3x4 row-major affine matrix -> 4x4 row-major elements (for Matrix4.set).
export const affine = m => [m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9], m[10], m[11], 0, 0, 0, 1];

export function argb(value) {
  if (value == null || value === -1 || value === 4294967295) return [1, 1, 1, 1];
  const v = value >>> 0;
  return [(v >>> 16 & 255) / 255, (v >>> 8 & 255) / 255, (v & 255) / 255, (v >>> 24 & 255) / 255];
}
export const lightLevel = l => .12 + .88 * Math.pow(Math.max(0, Math.min(15, l ?? 15)) / 15, 1.5);
export function faceNormal(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx, len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}
// Minecraft's fixed face brightness for block faces.
export function faceShade(n) {
  const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
  return ay >= ax && ay >= az ? (n[1] > 0 ? 1 : .5) : az >= ax ? .8 : .6;
}
// Animated textures are vertical strips; show the first frame. meta = [width, height, frameHeight].
export const frameScale = meta => meta && meta[1] && meta[2] ? Math.min(1, meta[2] / meta[1]) : 1;

export class QuadBuffer {
  constructor() { this.position = []; this.uv = []; this.normal = []; this.tint = []; }
  // v: four [x,y,z,u,v] corners in winding order; colors: one rgba or four.
  quad(v, normal, colors, vScale = 1) {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      const p = v[i], c = Array.isArray(colors[0]) ? colors[i] : colors;
      this.position.push(p[0], p[1], p[2]);
      this.uv.push(p[3], 1 - p[4] * vScale);
      this.normal.push(normal[0], normal[1], normal[2]);
      this.tint.push(c[0], c[1], c[2], c[3]);
    }
  }
  get triangles() { return this.position.length / 9; }
}
const bucket = (map, key) => { let b = map.get(key); if (!b) map.set(key, b = new QuadBuffer()); return b; };
const corners = (q, ox = 0, oy = 0, oz = 0) => [0, 1, 2, 3].map(k => { const i = 4 + k * 5; return [q[i] + ox, q[i + 1] + oy, q[i + 2] + oz, q[i + 3], q[i + 4]]; });

// entries: [blockState, x, y, z]; states: estados.json. Faces touching an opaque neighbour are culled.
export function blockBuffers(entries, states, textures = {}) {
  const solid = new Set(entries.filter(([s]) => states[s]?.op).map(([, x, y, z]) => `${x},${y},${z}`));
  const out = new Map();
  for (const [s, x, y, z] of entries) {
    for (const q of states[s]?.q || []) {
      const [cull, tex, layer, tint] = q;
      if (cull >= 0) { const d = FACE_DIRS[cull]; if (solid.has(`${x + d[0]},${y + d[1]},${z + d[2]}`)) continue; }
      const v = corners(q, x, y, z), n = faceNormal(v[0], v[1], v[2]), c = argb(tint), shade = faceShade(n);
      bucket(out, `${tex}|${LAYERS[layer] || 'recorte'}`).quad(v, n, [c[0] * shade, c[1] * shade, c[2] * shade, c[3]], frameScale(textures[tex]));
    }
  }
  return out;
}
// mesh: {t: texture, m: mode, v: [x,y,z,u,v,nx,ny,nz] per vertex, c?: argb per vertex}.
export function meshBuffer(mesh, textures = {}) {
  const b = new QuadBuffer(), v = mesh.v || [], count = v.length / 8, scale = frameScale(textures[mesh.t]);
  for (let i = 0; i + 3 < count; i += 4) {
    const quad = [0, 1, 2, 3].map(k => v.slice((i + k) * 8, (i + k) * 8 + 5));
    let n = v.slice(i * 8 + 5, i * 8 + 8);
    if (!n[0] && !n[1] && !n[2]) n = faceNormal(quad[0], quad[1], quad[2]);
    b.quad(quad, n, mesh.c ? [0, 1, 2, 3].map(k => argb(mesh.c[i + k])) : [1, 1, 1, 1], scale);
  }
  return b;
}
// parts: [{m: column-major 4x4, q: quads}] from objetos-de-escena.json; transform(m, point) applies a part matrix.
export function itemBuffers(parts, textures = {}, transform = (m, p) => p) {
  const out = new Map();
  for (const part of parts || []) for (const q of part.q || []) {
    const [, tex, layer, tint] = q, v = corners(q).map(p => [...transform(part.m, p), p[3], p[4]]);
    bucket(out, `${tex}|${layer === 2 ? 'translucido' : 'recorte'}`).quad(v, faceNormal(v[0], v[1], v[2]), argb(tint), frameScale(textures[tex]));
  }
  return out;
}
// Axis-aligned box faces selected by bitmask: 1 down, 2 up, 4 north, 8 south, 16 west, 32 east.
export function boxBuffer(box, uv, faces, color, vScale = 1) {
  const [ax, ay, az, bx, by, bz] = box, x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by), z0 = Math.min(az, bz), z1 = Math.max(az, bz);
  const [u0, v0, u1, v1] = uv || [0, 0, 1, 1], c = argb(color), b = new QuadBuffer();
  // Corners listed top-left, bottom-left, bottom-right, top-right as seen from outside.
  const sides = [
    [1, [0, -1, 0], [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]]],
    [2, [0, 1, 0], [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]]],
    [4, [0, 0, -1], [[x1, y1, z0], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0]]],
    [8, [0, 0, 1], [[x0, y1, z1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1]]],
    [16, [-1, 0, 0], [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]]],
    [32, [1, 0, 0], [[x1, y1, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0]]],
  ];
  for (const [bit, n, p] of sides) if (faces & bit) b.quad([[...p[0], u0, v0], [...p[1], u0, v1], [...p[2], u1, v1], [...p[3], u1, v0]], n, c, vScale);
  return b;
}
// Chests are drawn by a block-entity renderer, so the recordings carry no faces for them.
// Brassbound fills them with its own chest texture (assets/ui/chest-normal.png, 64x64 entity layout).
export const LOCAL_TEXTURES = {'brassbound:chest': 'assets/ui/chest-normal.png'};
const CHEST_TURN = {south: 0, east: 90, north: 180, west: -90};
function entityBox(x0, y0, z0, x1, y1, z1, u, v) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0, px = n => n / 16, uv = n => n / 64, faces = [];
  const face = (cull, corners, [a, b, c, e]) => faces.push([cull, 'brassbound:chest', 0, -1, ...corners.flatMap((p, i) => [...p.map(px), uv([a, a, c, c][i]), uv([b, e, e, b][i])])]);
  // Corners: top-left, bottom-left, bottom-right, top-right as seen from outside; regions follow Minecraft's box UV layout.
  face(-1, [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], [u + d, v, u + d + w, v + d]);
  face(-1, [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]], [u + d + w, v, u + d + 2 * w, v + d]);
  face(-1, [[x0, y1, z1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1]], [u + d, v + d, u + d + w, v + d + h]);
  face(-1, [[x1, y1, z0], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0]], [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h]);
  face(-1, [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], [u, v + d, u + d, v + d + h]);
  face(-1, [[x1, y1, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0]], [u + d + w, v + d, u + 2 * d + w, v + d + h]);
  return faces;
}
export function chestState(state) {
  const m = /^minecraft:(?:trapped_)?chest\[(.*)\]$/.exec(state || '');
  if (!m) return null;
  const p = Object.fromEntries(m[1].split(',').map(kv => kv.split('=')));
  // Built facing south (latch on +z). A double chest reaches its partner: left half to the west, right half to the east.
  const left = p.type === 'left', right = p.type === 'right', x0 = left ? 0 : 1, x1 = right ? 16 : 15, lx = left ? 0 : right ? 15 : 7, lw = left || right ? 1 : 2;
  const quads = [...entityBox(x0, 0, 1, x1, 10, 15, 0, 19), ...entityBox(x0, 9, 1, x1, 14, 15, 0, 0), ...entityBox(lx, 7, 15, lx + lw, 11, 16, 0, 0)];
  const a = (CHEST_TURN[p.facing] ?? 0) * Math.PI / 180, cos = Math.round(Math.cos(a)), sin = Math.round(Math.sin(a));
  for (const q of quads) for (let k = 0; k < 4; k++) {
    const i = 4 + k * 5, x = q[i] - .5, z = q[i + 2] - .5;
    q[i] = x * cos + z * sin + .5; q[i + 2] = -x * sin + z * cos + .5;
  }
  return {op: false, q: quads};
}
// Adds local geometry for recorded states that have none.
export function withLocalBlocks(states, used) {
  const out = Object.create(states);
  for (const s of used || []) if (!states[s]?.q?.length) { const local = chestState(s); if (local) out[s] = local; }
  return out;
}
export const fluidTexture = id => { const [ns, path] = id.includes(':') ? id.split(':') : ['minecraft', id]; return `${ns}:block/${path.replace(/^flowing_/, '')}_still`; };
export const textureUrl = id => { const [ns, path] = id.includes(':') ? id.split(':') : ['minecraft', id]; return `${PONDER_API}texturas/${ns}/${path}.png`; };
export const iconUrl = id => { const [ns, path] = id.split(':'); return `${PONDER_API}iconos/${ns}/${path}.png`; };
// Names for recorded ids: Cretania renames Create items, so their language file is the source for those.
export const itemNameKeys = id => { const [ns, path] = id.split(':'); return [`item.${ns}.${path}`, `block.${ns}.${path}`]; };
const MOUSE_LABELS = {CLIC_DERECHO: 'Clic derecho', CLIC_IZQUIERDO: 'Clic izquierdo', RUEDA_ARRIBA: 'Rueda arriba', RUEDA_ABAJO: 'Rueda abajo'};
export const mouseLabel = v => MOUSE_LABELS[v] || String(v).toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const DIRECTIONS = {ESTE: [0, 1], OESTE: [0, -1], ARRIBA: [1, 1], ABAJO: [1, -1], SUR: [2, 1], NORTE: [2, -1]};
// Fluid stream inside a pipe: grows from the block centre towards `dir` between distances (.5-yMax) and (.5-yMin).
export function streamBox(dir, radius, yMax, yMin) {
  const [axis, sign] = DIRECTIONS[dir] || [1, -1], lo = [.5 - radius, .5 - radius, .5 - radius], hi = [.5 + radius, .5 + radius, .5 + radius];
  const a = .5 + sign * (.5 - yMax), b = .5 + sign * (.5 - yMin);
  lo[axis] = Math.min(a, b); hi[axis] = Math.max(a, b);
  return [...lo, ...hi];
}
