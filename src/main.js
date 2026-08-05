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

function makeSkyTexture() {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#e9f1f6');
  grad.addColorStop(0.55, '#f2f4ee');
  grad.addColorStop(1, '#f7f4ea');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const scene = new THREE.Scene();
scene.background = makeSkyTexture();
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

scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe5d2, 1.0));

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

const { voxelCount, updates } = buildWorld(scene);

/* --------------------------- dashboard ---------------------------- */

const elVoxels = document.getElementById('stat-voxels');
const elFps = document.getElementById('stat-fps');
const elDraws = document.getElementById('stat-draws');
const btnRotate = document.getElementById('btn-rotate');
const btnReset = document.getElementById('btn-reset');

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
