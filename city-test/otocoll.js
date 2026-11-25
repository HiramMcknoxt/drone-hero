/* ON THE ONE collision runtime (Part 2B), format otocoll 2.x.
 *
 * Works in the browser (plain <script>, exposes window.OTOColl) and in Node (require) for tests.
 *
 *   const world = await OTOColl.load(url, { expectAsset: '<sha256 of the .splat in use>' });
 *   const cc = OTOColl.controller({ onCollision: hit => game.crashReset(hit), transform: {...} });
 *   cc.setWorld(world)                 // or cc.setStatus('missing' | 'stale' | 'error', why)
 *   every frame: cc.step(prevPos, nextPos)  // world-space positions; fires onCollision at most once
 *   after the game's reset has put the drone back at spawn: cc.rearm()
 *
 * Coordinates: the file is in the scene's ASSET frame (the .splat's own coordinates, Y up).
 * The controller maps world -> asset with ONE scene transform, mirroring the page:
 *   G = A - shift ; if flipped: G.y = H - G.y, G.z = -G.z ; W = scale*G + (0, yOff, 0)
 * Unknown terrain is flyable. Anything outside the grid is free space.
 */
(function (root) {
  'use strict';
  const MAGIC = 'OTOCOLL\0';
  const SUPPORTED_MAJOR = 2;

  // ---------------------------------------------------------------- decode
  async function sha256Hex(bytes) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const d = await crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return require('crypto').createHash('sha256').update(bytes).digest('hex');
  }
  async function inflate(bytes) {
    if (typeof DecompressionStream !== 'undefined') {
      const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
      return new Uint8Array(await new Response(s).arrayBuffer());
    }
    return new Uint8Array(require('zlib').inflateSync(bytes));
  }

  async function decode(buf) {
    const u8 = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const dv = new DataView(u8.buffer);
    const magic = String.fromCharCode(...u8.subarray(0, 8));
    if (magic !== MAGIC) throw new Error('not an otocoll file');
    const major = dv.getUint16(8, true), minor = dv.getUint16(10, true);
    if (major !== SUPPORTED_MAJOR) throw new Error(`otocoll format ${major}.${minor} not supported (need ${SUPPORTED_MAJOR}.x)`);
    const hl = dv.getUint32(12, true);
    const H = JSON.parse(new TextDecoder().decode(u8.subarray(16, 16 + hl)));
    const cl = dv.getUint32(16 + hl, true);
    const payload = await inflate(u8.subarray(20 + hl, 20 + hl + cl));
    if (payload.length !== H.payload_bytes) throw new Error('payload length mismatch');
    if ((await sha256Hex(payload)) !== H.payload_sha256) throw new Error('payload checksum mismatch');
    const sec = n => { const [o, l] = H.sections[n]; return payload.buffer.slice(payload.byteOffset + o, payload.byteOffset + o + l); };
    return new World(H, new Uint32Array(sec('brick_ids')), new Uint8Array(sec('brick_mask')),
      new Int16Array(sec('terrain')), new Uint8Array(sec('terrain_conf')), new Float32Array(sec('overrides')));
  }

  async function load(url, opts = {}) {
    const res = await fetch(url);
    if (!res.ok) { const e = new Error(`collision file missing (${res.status})`); e.code = 'missing'; throw e; }
    const w = await decode(await res.arrayBuffer());
    checkAsset(w, opts.expectAsset);
    return w;
  }
  function checkAsset(w, expectAsset) {
    if (!expectAsset) return;
    if (!w.H.assets.some(a => a.sha256 === expectAsset || a.name === expectAsset)) {
      const e = new Error('collision file does not match this scene asset'); e.code = 'stale'; throw e;
    }
  }

  // ---------------------------------------------------------------- world (asset frame)
  class World {
    constructor(H, ids, masks, ter, conf, prims) {
      this.H = H; this.masks = masks; this.ter = ter; this.conf = conf; this.prims = prims;
      const g = H.grid; this.c = g.cell; [this.ox, this.oy, this.oz] = g.origin; [this.nx, this.ny, this.nz] = g.dims;
      this.B = g.brick; [, this.nby, this.nbz] = g.brick_dims;
      this.map = new Map(); for (let i = 0; i < ids.length; i++) this.map.set(ids[i], i);
      const t = H.terrain; this.tres = t.res; [this.tox, this.toz] = t.origin_xz; [this.tnx, this.tnz] = t.dims;
    }
    occ(i, j, k) {
      if (i < 0 || j < 0 || k < 0 || i >= this.nx || j >= this.ny || k >= this.nz) return 0;
      const B = this.B, idx = this.map.get(((i / B | 0) * this.nby + (j / B | 0)) * this.nbz + (k / B | 0));
      if (idx === undefined) return 0;
      const bit = (i % B) * 64 + (j % B) * 8 + (k % B);
      return (this.masks[idx * 64 + (bit >> 3)] >> (bit & 7)) & 1;
    }
    _t(i, k) { const v = this.ter[i * this.tnz + k]; return v === -32768 ? NaN : v / 100; }
    /** terrain height (asset Y) at asset x,z; about -1e9 where unknown (flyable) */
    terrainY(x, z) {
      const fx = (x - this.tox) / this.tres - 0.5, fz = (z - this.toz) / this.tres - 0.5;
      const i = Math.max(0, Math.min(this.tnx - 2, Math.floor(fx))), k = Math.max(0, Math.min(this.tnz - 2, Math.floor(fz)));
      const tx = Math.min(1, Math.max(0, fx - i)), tz = Math.min(1, Math.max(0, fz - k));
      // unknown columns count as -1e9 (same rule as the Python reference): any unknown corner that carries
      // weight pulls the surface far below -> flyable. Edges of observed/inferred ground fade out, never wall up.
      const g = v => (Number.isNaN(v) ? -1e9 : v);
      const a = g(this._t(i, k)), b = g(this._t(i + 1, k)), c = g(this._t(i, k + 1)), d = g(this._t(i + 1, k + 1));
      return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
    }
    /** terrain confidence at asset x,z: 2 observed, 1 inferred, 0 unknown */
    terrainConf(x, z) {
      const i = Math.floor((x - this.tox) / this.tres), k = Math.floor((z - this.toz) / this.tres);
      if (i < 0 || k < 0 || i >= this.tnx || k >= this.tnz) return 0;
      return this.conf[i * this.tnz + k];
    }
    /** swept sphere A->B (asset frame). Returns null or {t, kind:'terrain'|'obstacle', x,y,z, cell} */
    sweep(ax, ay, az, bx, by, bz, r = 0.3, step = 0.1) {
      const c = this.c, ox = this.ox, oy = this.oy, oz = this.oz, r2 = r * r;
      const dx = bx - ax, dy = by - ay, dz = bz - az, n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / step));
      for (let s = 0; s <= n; s++) {
        const t = s / n, px = ax + dx * t, py = ay + dy * t, pz = az + dz * t;
        if (py <= this.terrainY(px, pz) + r) return { t, kind: 'terrain', x: px, y: py, z: pz, cell: null };
        const i = Math.floor((px - ox) / c), j = Math.floor((py - oy) / c), k = Math.floor((pz - oz) / c);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) {
          if (!this.occ(i + a, j + b, k + e)) continue;
          const lx = ox + (i + a) * c, ly = oy + (j + b) * c, lz = oz + (k + e) * c;
          const qx = Math.min(Math.max(px, lx), lx + c), qy = Math.min(Math.max(py, ly), ly + c), qz = Math.min(Math.max(pz, lz), lz + c);
          if ((px - qx) ** 2 + (py - qy) ** 2 + (pz - qz) ** 2 <= r2) return { t, kind: 'obstacle', x: px, y: py, z: pz, cell: [i + a, j + b, k + e] };
        }
      }
      return null;
    }
    /** debug: occupied cell boxes within radius of an asset-frame point (cap: max cells) */
    cellsNear(x, y, z, radius = 6, max = 4000) {
      const c = this.c, out = [], R = Math.ceil(radius / c);
      const i0 = Math.floor((x - this.ox) / c), j0 = Math.floor((y - this.oy) / c), k0 = Math.floor((z - this.oz) / c);
      for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) for (let e = -R; e <= R; e++) {
        if ((a * a + b * b + e * e) * c * c > radius * radius || !this.occ(i0 + a, j0 + b, k0 + e)) continue;
        out.push([this.ox + (i0 + a + 0.5) * c, this.oy + (j0 + b + 0.5) * c, this.oz + (k0 + e + 0.5) * c]);   // cell centre
        if (out.length >= max) return out;
      }
      return out;
    }
    /** debug: terrain surface samples around an asset-frame point: [x, y, z, conf] */
    terrainNear(x, z, radius = 15, stepM = 1) {
      const out = [];
      for (let a = -radius; a <= radius; a += stepM) for (let b = -radius; b <= radius; b += stepM) {
        const y = this.terrainY(x + a, z + b); if (y < -1e6) continue;
        out.push([x + a, y, z + b, this.terrainConf(x + a, z + b)]);
      }
      return out;
    }
  }

  // ---------------------------------------------------------------- transform
  function makeTransform(T = {}) {
    const t = Object.assign({ shift: [0, 0, 0], scale: 1, yOff: 0, flipped: false, H: 0 }, T);
    return {
      t,
      toAsset(p) {
        let gx = p[0] / t.scale, gy = (p[1] - t.yOff) / t.scale, gz = p[2] / t.scale;
        if (t.flipped) { gy = t.H - gy; gz = -gz; }
        return [gx + t.shift[0], gy + t.shift[1], gz + t.shift[2]];
      },
      toWorld(a) {
        let gx = a[0] - t.shift[0], gy = a[1] - t.shift[1], gz = a[2] - t.shift[2];
        if (t.flipped) { gy = t.H - gy; gz = -gz; }
        return [t.scale * gx, t.scale * gy + t.yOff, t.scale * gz];
      },
      radiusToAsset(r) { return r / t.scale; },
    };
  }

  // ---------------------------------------------------------------- controller + failure policy
  const STATUS_TEXT = {
    loading: 'NO-COLLISION PRACTICE: collision loading',
    ready: 'COLLISION ON',
    practice: 'NO-CRASH PRACTICE (collision off by choice)',
    missing: 'NO-COLLISION PRACTICE: collision file missing',
    stale: 'NO-COLLISION PRACTICE: collision does not match this scene',
    error: 'NO-COLLISION PRACTICE: collision failed to load',
  };
  function controller(opts = {}) {
    const st = {
      world: null, status: 'loading', why: '', practice: false, armed: true,
      tf: makeTransform(opts.transform), r: opts.radius ?? 0.3, onCollision: opts.onCollision || (() => {}),
      lastSweep: null, collisions: 0,
    };
    const api = {
      /** install a decoded world (only after asset check); collision becomes live */
      setWorld(w, expectAsset) {
        try { checkAsset(w, expectAsset); st.world = w; st.status = 'ready'; st.why = ''; }
        catch (e) { st.world = null; st.status = e.code || 'error'; st.why = e.message; }
      },
      /** report a failure / loading state; collision is fully off until a matching world is set */
      setStatus(s, why = '') { st.world = null; st.status = s; st.why = why; },
      setTransform(T) { st.tf = makeTransform(T); },
      setPractice(on) { st.practice = !!on; },
      /** true only when a complete, matching world is loaded and practice is off */
      get active() { return st.status === 'ready' && !st.practice; },
      get status() { return st.practice && st.status === 'ready' ? 'practice' : st.status; },
      statusText() { const s = api.status; return STATUS_TEXT[s] + (st.why && s !== 'ready' && s !== 'practice' ? ` (${st.why})` : ''); },
      get armed() { return st.armed; },
      get lastSweep() { return st.lastSweep; },
      get collisions() { return st.collisions; },
      /** query only: hit (world-space) for prev->next, regardless of practice/armed; null if no world */
      query(prev, next) {
        if (!st.world) return null;
        const A = st.tf.toAsset(prev), B = st.tf.toAsset(next);
        const h = st.world.sweep(A[0], A[1], A[2], B[0], B[1], B[2], st.tf.radiusToAsset(st.r));
        const out = h ? Object.assign({}, h, { world: st.tf.toWorld([h.x, h.y, h.z]) }) : null;
        st.lastSweep = { prev, next, r: st.r, hit: out };
        return out;
      },
      /** per-frame call: fires onCollision exactly once per crash; returns the hit or null */
      step(prev, next) {
        const h = api.query(prev, next);               // debug/instrumentation stays live in practice mode
        if (!h || !api.active || !st.armed) return h;
        st.armed = false; st.collisions++;
        st.onCollision(h);
        return h;
      },
      /** call after the game's reset has placed the drone; refuses to arm inside geometry */
      rearm(spawnWorldPos) {
        if (spawnWorldPos && !api.isClear(spawnWorldPos)) return false;
        st.armed = true; return true;
      },
      /** is a sphere of drone radius at this world position free of terrain/obstacles? */
      isClear(p) {
        if (!st.world) return true;
        const A = st.tf.toAsset(p);
        return !st.world.sweep(A[0], A[1], A[2], A[0], A[1], A[2], st.tf.radiusToAsset(st.r));
      },
      debugNear(p, radius = 6) {
        if (!st.world) return { cells: [], terrain: [] };
        const A = st.tf.toAsset(p);
        return {
          cells: st.world.cellsNear(A[0], A[1], A[2], radius).map(q => st.tf.toWorld(q)),
          terrain: st.world.terrainNear(A[0], A[2], Math.ceil(radius * 2)).map(q => st.tf.toWorld(q).concat([q[3]])),
          cell: st.world.c * st.tf.t.scale, lastSweep: st.lastSweep,
        };
      },
      get world() { return st.world; },
    };
    return api;
  }

  const OTOColl = { decode, load, controller, makeTransform, World, STATUS_TEXT, SUPPORTED_MAJOR };
  if (typeof module !== 'undefined' && module.exports) module.exports = OTOColl;
  else root.OTOColl = OTOColl;
})(typeof window !== 'undefined' ? window : globalThis);
