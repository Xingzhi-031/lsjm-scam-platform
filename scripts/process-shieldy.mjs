import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const imgDir = join(root, 'shared/images');

const states = ['calm', 'suspicious', 'alert', 'danger'];

for (const state of states) {
  const src = join(imgDir, `shieldy-${state}.png`);
  const dest = join(imgDir, `shieldy-${state}.png`);
  const img = sharp(src);
  const { width, height } = await img.metadata();
  const cropH = Math.floor(height * 0.82);
  const raw = await img
    .extract({ left: 0, top: 0, width, height: cropH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = raw;
  const threshold = 245;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0;
    }
  }
  await sharp(data, { raw: info })
    .png()
    .toFile(dest);
  console.log(`Processed shieldy-${state}.png`);
}
