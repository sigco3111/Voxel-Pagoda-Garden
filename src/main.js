import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld } from './world.js';

/* --------------------------- renderer ----------------------------- */

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* ----------------------------- scene ------------------------------ */

const skyCanvas = document.createElement('canvas');
skyCanvas.width = 2;
skyCanvas.height = 512;
const skyCtx = skyCanvas.getContext('2d');
const skyTex = new THREE.CanvasTexture(skyCanvas);
skyTex.colorSpace = THREE.SRGBColorSpace;

const dayStops = ['#e9f1f6', '#f2f4ee', '#f7f4ea'].map((h) => new THREE.Color(h));
const duskStops = ['#f6c9a6', '#fbe0c4', '#f9e9d4'].map((h) => new THREE.Color(h));
const stopTmp = new THREE.Color();

function paintSky(mix) {
  const grad = skyCtx.createLinearGradient(0, 0, 0, 512);
  for (let i = 0; i < 3; i++) {
    stopTmp.lerpColors(dayStops[i], duskStops[i], mix);
    grad.addColorStop(i / 2, '#' + stopTmp.getHexString());
  }
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, 2, 512);
  skyTex.needsUpdate = true;
}

const scene = new THREE.Scene();
scene.background = skyTex;
scene.fog = new THREE.Fog(0xf2f4ef, 90, 190);

/* ---------------------------- camera ------------------------------ */

const HOME_POS = new THREE.Vector3(31, 23, 35);
const HOME_TARGET = new THREE.Vector3(0, 10, 0);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.copy(HOME_POS);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 14;
controls.maxDistance = 95;
controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;

/* ---------------------------- lights ------------------------------ */

const hemi = new THREE.HemisphereLight(0xffffff, 0xdfe5d2, 1.0);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0da, 1.9);
sun.position.set(36, 50, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const S = 36;
sun.shadow.camera.left = -S;
sun.shadow.camera.right = S;
sun.shadow.camera.top = S;
sun.shadow.camera.bottom = -S;
sun.shadow.camera.near = 5;
sun.shadow.camera.far = 130;
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);

/* ----------------------------- world ------------------------------ */

const { voxelCount, updates, handles } = buildWorld(scene);

/* --------------------------- day / dusk ---------------------------- */

const DAY = {
  fog: new THREE.Color(0xf2f4ef),
  fogNear: 90,
  fogFar: 190,
  hemiSky: new THREE.Color(0xffffff),
  hemiGround: new THREE.Color(0xdfe5d2),
  hemiI: 1.0,
  sunColor: new THREE.Color(0xfff0da),
  sunI: 1.9,
  sunPos: new THREE.Vector3(36, 50, 24),
  glow: new THREE.Color(0xffc98a),
};
const DUSK = {
  fog: new THREE.Color(0xf2d3b3),
  fogNear: 70,
  fogFar: 165,
  hemiSky: new THREE.Color(0xffcf9e),
  hemiGround: new THREE.Color(0xb49ec4),
  hemiI: 0.72,
  sunColor: new THREE.Color(0xffa45e),
  sunI: 1.35,
  sunPos: new THREE.Vector3(-34, 18, -26),
  glow: new THREE.Color(0xffab4e),
};

let themeMix = 0;
let themeTarget = 0;

function applyTheme(dt) {
  themeMix = THREE.MathUtils.damp(themeMix, themeTarget, 3.5, dt);
  const m = themeMix;
  paintSky(m);
  scene.fog.color.lerpColors(DAY.fog, DUSK.fog, m);
  scene.fog.near = THREE.MathUtils.lerp(DAY.fogNear, DUSK.fogNear, m);
  scene.fog.far = THREE.MathUtils.lerp(DAY.fogFar, DUSK.fogFar, m);
  hemi.color.lerpColors(DAY.hemiSky, DUSK.hemiSky, m);
  hemi.groundColor.lerpColors(DAY.hemiGround, DUSK.hemiGround, m);
  hemi.intensity = THREE.MathUtils.lerp(DAY.hemiI, DUSK.hemiI, m);
  sun.color.lerpColors(DAY.sunColor, DUSK.sunColor, m);
  sun.intensity = THREE.MathUtils.lerp(DAY.sunI, DUSK.sunI, m);
  sun.position.lerpVectors(DAY.sunPos, DUSK.sunPos, m);
  for (const light of handles.lanternLights) light.intensity = m * 1.6;
  handles.glowMaterial.color.lerpColors(DAY.glow, DUSK.glow, m);
  handles.fireflyMaterial.opacity = m * 0.95;
  handles.fireflyMesh.visible = m > 0.02;
}

/* --------------------------- dashboard ---------------------------- */

const elVoxels = document.getElementById('stat-voxels');
const elFps = document.getElementById('stat-fps');
const elDraws = document.getElementById('stat-draws');
const btnRotate = document.getElementById('btn-rotate');
const btnReset = document.getElementById('btn-reset');
const btnDusk = document.getElementById('btn-dusk');

elVoxels.textContent = voxelCount.toLocaleString('en-US');

btnRotate.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  btnRotate.classList.toggle('active', controls.autoRotate);
  btnRotate.setAttribute('aria-pressed', String(controls.autoRotate));
});

btnReset.addEventListener('click', () => {
  camera.position.copy(HOME_POS);
  controls.target.copy(HOME_TARGET);
});

btnDusk.addEventListener('click', () => {
  themeTarget = themeTarget === 0 ? 1 : 0;
  btnDusk.classList.toggle('active', themeTarget === 1);
  btnDusk.setAttribute('aria-pressed', String(themeTarget === 1));
});

/* ---------------------------- resize ------------------------------ */

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ------------------------------ loop ------------------------------ */

let frames = 0;
let lastStats = performance.now();
let lastT = 0;

renderer.setAnimationLoop((time) => {
  const t = time / 1000;
  const dt = Math.min(Math.max(t - lastT, 0), 0.05) || 0.016;
  lastT = t;

  for (const u of updates) u(t, dt);
  applyTheme(dt);

  controls.update();
  renderer.render(scene, camera);

  frames++;
  const now = performance.now();
  if (now - lastStats >= 500) {
    elFps.textContent = Math.round((frames * 1000) / (now - lastStats));
    elDraws.textContent = renderer.info.render.calls;
    frames = 0;
    lastStats = now;
  }
});
