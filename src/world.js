import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Seeded RNG so the garden layout is deterministic.                  */
/* ------------------------------------------------------------------ */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260805);

/* ------------------------------------------------------------------ */
/* Palette                                                            */
/* ------------------------------------------------------------------ */

const C = {
  grassA: 0x86b46b,
  grassB: 0x93c179,
  grassC: 0x7cab60,
  path: 0xdad3c2,
  pathEdge: 0xc9c0ac,
  water: 0x9fd4e4,
  waterDeep: 0x86c3d8,
  koi: 0xf08a4b,
  lily: 0x6fae5f,
  stone: 0xb7b1a3,
  stoneDark: 0x9c968a,
  wall: 0xc2503a,
  wallDark: 0x9a3a2a,
  trim: 0xf3ead9,
  door: 0x5c2a1e,
  roof: 0x47566b,
  roofDark: 0x3b4859,
  gold: 0xd9a441,
  pearl: 0xf3f0e6,
  trunk: 0x7a5230,
  blossomA: 0xf3a7bb,
  blossomB: 0xf8c6d2,
  blossomC: 0xfde8ee,
  lanternStone: 0xa9a396,
  lanternGlow: 0xffd98c,
  torii: 0xc2452f,
  bushA: 0x6f9e57,
  bushB: 0x83b36a,
  flowerA: 0xe88fa6,
  flowerB: 0xf6d789,
  rock: 0x9b958a,
  cloud: 0xffffff,
};

/* ------------------------------------------------------------------ */
/* Voxel store: one Map of "x|y|z" -> color, converted to a single    */
/* InstancedMesh at the end.                                          */
/* ------------------------------------------------------------------ */

const voxels = new Map();

function setVoxel(x, y, z, color) {
  if (y < 0) return;
  voxels.set(`${x}|${y}|${z}`, color);
}

function fillBox(x0, y0, z0, x1, y1, z1, color) {
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const za = Math.min(z0, z1), zb = Math.max(z0, z1);
  for (let x = xa; x <= xb; x++)
    for (let y = ya; y <= yb; y++)
      for (let z = za; z <= zb; z++) setVoxel(x, y, z, color);
}

/* ------------------------------------------------------------------ */
/* Terrain: grass island, stone path and koi pond                     */
/* ------------------------------------------------------------------ */

const GROUND = 20;

function ground() {
  const tones = [C.grassA, C.grassA, C.grassB, C.grassC];
  for (let x = -GROUND; x <= GROUND; x++)
    for (let z = -GROUND; z <= GROUND; z++)
      setVoxel(x, 0, z, tones[Math.floor(rng() * tones.length)]);
}

function path() {
  for (let z = 7; z <= GROUND; z++) {
    for (let x = -1; x <= 1; x++) setVoxel(x, 0, z, C.path);
    if (rng() < 0.85) setVoxel(-2, 0, z, C.pathEdge);
    if (rng() < 0.85) setVoxel(2, 0, z, C.pathEdge);
  }
}

function pond() {
  const cx = 11, cz = -8, rx = 5.2, rz = 4.4;
  for (let x = 4; x <= 18; x++) {
    for (let z = -14; z <= -2; z++) {
      const d = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
      if (d <= 1) setVoxel(x, 0, z, rng() < 0.25 ? C.waterDeep : C.water);
      else if (d <= 1.45 && rng() < 0.9)
        setVoxel(x, 0, z, rng() < 0.5 ? C.stone : C.stoneDark);
    }
  }
  // koi seen from above + lily pads
  setVoxel(9, 0, -7, C.koi);
  setVoxel(12, 0, -9, C.koi);
  setVoxel(10, 0, -5, C.koi);
  setVoxel(13, 0, -6, C.lily);
  setVoxel(8, 0, -10, C.lily);
}

/* ------------------------------------------------------------------ */
/* Five-tier pagoda with stepped roofs and a gold finial              */
/* ------------------------------------------------------------------ */

function pagoda() {
  fillBox(-6, 1, -6, 6, 1, 6, C.stone); // stone platform
  fillBox(-1, 1, 7, 1, 1, 7, C.stone); // entrance step

  const tiers = [
    { w: 9, h: 3 },
    { w: 7, h: 3 },
    { w: 7, h: 2 },
    { w: 5, h: 2 },
    { w: 5, h: 2 },
  ];

  let y = 2;
  tiers.forEach((tier, i) => {
    const half = (tier.w - 1) / 2;
    const top = y + tier.h - 1;

    fillBox(-half, y, -half, half, top, half, C.wall);

    // dark corner pillars
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        fillBox(sx * half, y, sz * half, sx * half, top, sz * half, C.wallDark);

    // pale trim ring below each roof
    for (let x = -half; x <= half; x++) {
      setVoxel(x, top, -half, C.trim);
      setVoxel(x, top, half, C.trim);
    }
    for (let z = -half + 1; z <= half - 1; z++) {
      setVoxel(-half, top, z, C.trim);
      setVoxel(half, top, z, C.trim);
    }

    // entrance door + window accents on the first tier
    if (i === 0) {
      setVoxel(0, y, half, C.door);
      setVoxel(0, y + 1, half, C.door);
      setVoxel(-2, y + 1, half, C.trim);
      setVoxel(2, y + 1, half, C.trim);
    }

    // two-layer roof with upturned corner tips
    const roofY = y + tier.h;
    fillBox(-(half + 2), roofY, -(half + 2), half + 2, roofY, half + 2, C.roof);
    fillBox(-(half + 1), roofY + 1, -(half + 1), half + 1, roofY + 1, half + 1, C.roofDark);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        setVoxel(sx * (half + 2), roofY + 1, sz * (half + 2), C.roofDark);

    y = roofY + 2;
  });

  // gold finial spire
  fillBox(-1, y, -1, 1, y, 1, C.gold);
  for (let i = 1; i <= 4; i++) setVoxel(0, y + i, 0, C.gold);
  setVoxel(0, y + 5, 0, C.pearl);
}

/* ------------------------------------------------------------------ */
/* Torii gate at the garden entrance                                  */
/* ------------------------------------------------------------------ */

function torii() {
  const z = 16;
  for (const sx of [-3, 3]) fillBox(sx, 1, z, sx, 6, z, C.torii);
  fillBox(-5, 7, z, 5, 7, z, C.torii); // top beam
  setVoxel(-5, 8, z, C.torii); // upturned ends
  setVoxel(5, 8, z, C.torii);
  fillBox(-3, 5, z, 3, 5, z, C.torii); // lower tie beam
  setVoxel(0, 6, z, C.torii); // central strut
}

/* ------------------------------------------------------------------ */
/* Blossom trees, stone lanterns, bushes and rocks                    */
/* ------------------------------------------------------------------ */

const TREE_SPOTS = [
  [-12, 7, 4],
  [-8, -13, 5],
  [13, 10, 4],
  [-15, -3, 3],
  [6, 15, 4],
  [16, 3, 3],
];

function blossomCanopy(x, y, z, r) {
  for (let dy = -1; dy <= 1; dy++) {
    const rr = dy === 0 ? r : r - 1;
    if (rr < 1) continue;
    for (let dx = -rr; dx <= rr; dx++) {
      for (let dz = -rr; dz <= rr; dz++) {
        if (dx * dx + dz * dz > rr * rr + 1) continue;
        const roll = rng();
        const c = roll < 0.6 ? C.blossomA : roll < 0.85 ? C.blossomB : C.blossomC;
        setVoxel(x + dx, y + dy, z + dz, c);
      }
    }
  }
}

function trees() {
  for (const [x, z, h] of TREE_SPOTS) {
    for (let i = 0; i < h; i++) setVoxel(x, 1 + i, z, C.trunk);
    blossomCanopy(x, 2 + h, z, 2);
  }
}

const LANTERN_SPOTS = [
  [-4, 9],
  [4, 9],
  [-4, 18],
  [4, 18],
  [4, -2],
];

function lanterns() {
  for (const [x, z] of LANTERN_SPOTS) {
    setVoxel(x, 1, z, C.stoneDark);
    setVoxel(x, 2, z, C.lanternStone);
    setVoxel(x, 3, z, C.lanternGlow);
    setVoxel(x, 4, z, C.stoneDark);
  }
}

function freeOfStructures(x, z) {
  if (Math.abs(x) <= 7 && Math.abs(z) <= 7) return false; // pagoda
  if (Math.abs(x) <= 3 && z >= 6) return false; // path + gate
  if (((x - 11) / 6.2) ** 2 + ((z + 8) / 5.4) ** 2 <= 1.6) return false; // pond
  if (Math.abs(z - 16) <= 1 && Math.abs(x) <= 6) return false; // torii
  return true;
}

function scatter() {
  let placed = 0;
  let tries = 0;
  while (placed < 26 && tries++ < 400) {
    const x = Math.floor(rng() * 37) - 18;
    const z = Math.floor(rng() * 37) - 18;
    if (!freeOfStructures(x, z)) continue;
    if (TREE_SPOTS.some(([tx, tz]) => Math.abs(tx - x) + Math.abs(tz - z) < 3)) continue;
    if (LANTERN_SPOTS.some(([lx, lz]) => lx === x && lz === z)) continue;

    if (rng() < 0.22) {
      setVoxel(x, 1, z, C.rock);
      if (rng() < 0.5) setVoxel(x + 1, 1, z, C.stoneDark);
      if (rng() < 0.35) setVoxel(x, 2, z, C.stoneDark);
    } else {
      setVoxel(x, 1, z, rng() < 0.5 ? C.bushA : C.bushB);
      if (rng() < 0.55) setVoxel(x, 2, z, C.bushB);
      if (rng() < 0.4) setVoxel(x + (rng() < 0.5 ? 1 : -1), 1, z, C.bushA);
      if (rng() < 0.35) setVoxel(x, 2, z, rng() < 0.5 ? C.flowerA : C.flowerB);
    }
    placed++;
  }
}

/* ------------------------------------------------------------------ */
/* Instancing: Map -> InstancedMesh with per-instance color           */
/* ------------------------------------------------------------------ */

function toInstancedMesh(map, jitter = 0) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geometry, material, map.size);
  const mtx = new THREE.Matrix4();
  const color = new THREE.Color();
  let i = 0;
  for (const [key, hex] of map) {
    const [x, y, z] = key.split('|').map(Number);
    mtx.makeTranslation(x, y + 0.5, z);
    mesh.setMatrixAt(i, mtx);
    // subtle per-voxel tonal variation for a hand-placed feel
    const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + jitter) * 43758.5453;
    color.setHex(hex).multiplyScalar(0.96 + (n - Math.floor(n)) * 0.08);
    mesh.setColorAt(i, color);
    i++;
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Drifting clouds (separate meshes so they can animate)              */
/* ------------------------------------------------------------------ */

function makeCloud(radius) {
  const map = new Map();
  const rx = radius;
  const rz = Math.max(1, Math.round(radius * 0.55));
  for (let x = -rx; x <= rx; x++) {
    for (let z = -rz; z <= rz; z++) {
      if ((x / rx) ** 2 + (z / rz) ** 2 > 1) continue;
      map.set(`${x}|0|${z}`, C.cloud);
      if ((x / (rx * 0.6)) ** 2 + (z / (rz * 0.6)) ** 2 <= 1)
        map.set(`${x}|1|${z}`, C.cloud);
    }
  }
  const mesh = toInstancedMesh(map, radius * 13.7);
  mesh.receiveShadow = false;
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

export function buildWorld(scene) {
  ground();
  path();
  pond();
  pagoda();
  torii();
  trees();
  lanterns();
  scatter();

  scene.add(toInstancedMesh(voxels));

  // soft diorama base disc under the voxel island
  const base = new THREE.Mesh(
    new THREE.CircleGeometry(32, 64),
    new THREE.MeshLambertMaterial({ color: 0xe9e5d9 })
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = -0.02;
  base.receiveShadow = true;
  scene.add(base);

  const clouds = [];
  const defs = [
    { r: 4, y: 33, z: -13, offset: 6, speed: 1.1 },
    { r: 3, y: 36, z: 3, offset: 30, speed: 0.8 },
    { r: 5, y: 31, z: 13, offset: 48, speed: 0.65 },
  ];
  for (const d of defs) {
    const mesh = makeCloud(d.r);
    mesh.position.set((d.offset % 64) - 32, d.y, d.z);
    scene.add(mesh);
    clouds.push({ mesh, speed: d.speed, offset: d.offset });
  }

  return { voxelCount: voxels.size, clouds };
}
