/* ------------------------------------------------------------------ */
/* Docs media capture: screenshots + GIFs of the running app.         */
/*                                                                    */
/* Usage:  npm run dev   (in one terminal)                            */
/*         npm i --no-save puppeteer gifenc pngjs                     */
/*         npm run capture                                            */
/*                                                                    */
/* Outputs PNG screenshots and GIF animations into docs/.             */
/* ------------------------------------------------------------------ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import gifencPkg from 'gifenc';
import { PNG } from 'pngjs';

const { GIFEncoder, quantize, applyPalette } = gifencPkg;

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    '--hide-scrollbars',
  ],
});

const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[page error]', e.message));
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

// wait for the intro fly-in to settle and the first frames to render
await sleep(4500);
const alive = await page.evaluate(() => Boolean(window.garden));
if (!alive) {
  console.error('window.garden not found - is the dev server running?');
  await browser.close();
  process.exit(1);
}

// freeze auto-rotation for clean stills
await page.evaluate(() => {
  window.garden.controls.autoRotate = false;
});

const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('shot:', name);
};

/* ----------------------------- stills ----------------------------- */

await shot('overview-day.png');

for (const [view, name] of [
  ['pagoda', 'pagoda.png'],
  ['pond', 'pond.png'],
  ['gate', 'gate.png'],
]) {
  await page.click(`[data-view="${view}"]`);
  await sleep(2100);
  await shot(name);
}

/* ------------------------- dusk stills ---------------------------- */

await page.click('[data-view="overview"]');
await sleep(1900);
await page.click('#btn-dusk');
await sleep(2600);
await shot('overview-dusk.png');

await page.click('[data-view="pond"]');
await sleep(2100);
await shot('pond-dusk.png');

/* ------------------------------ gifs ------------------------------ */

async function captureGif(name, frames, intervalMs, w, h) {
  await page.setViewport({ width: w, height: h });
  const gif = GIFEncoder();
  for (let i = 0; i < frames; i++) {
    const buf = await page.screenshot();
    const png = PNG.sync.read(buf);
    const palette = quantize(png.data, 256);
    const index = applyPalette(png.data, palette);
    gif.writeFrame(index, png.width, png.height, { palette, delay: intervalMs });
    await sleep(intervalMs);
  }
  gif.finish();
  fs.writeFileSync(path.join(OUT, name), Buffer.from(gif.bytes()));
  console.log('gif :', name);
  await page.setViewport({ width: 1280, height: 800 });
}

// back to day, overview, then spin fast for the rotation gif
await page.click('#btn-dusk');
await sleep(2400);
await page.click('[data-view="overview"]');
await sleep(1900);
await page.evaluate(() => {
  window.garden.controls.autoRotate = true;
  window.garden.controls.autoRotateSpeed = 5;
});
await captureGif('rotation.gif', 36, 200, 720, 450);

// day -> dusk transition gif
await page.evaluate(() => {
  window.garden.controls.autoRotate = false;
});
await page.click('[data-view="overview"]');
await sleep(1200);
await page.click('#btn-dusk');
await captureGif('dusk-transition.gif', 22, 160, 720, 450);

await browser.close();

for (const f of fs.readdirSync(OUT)) {
  const s = fs.statSync(path.join(OUT, f));
  if (/\.(png|gif)$/.test(f)) console.log(`${f}  ${(s.size / 1024).toFixed(0)} KB`);
}
console.log('done.');
