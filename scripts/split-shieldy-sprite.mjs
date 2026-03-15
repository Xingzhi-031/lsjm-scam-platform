import sharp from 'sharp';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'shared/images/shieldy-sprite.png');
const outDir = join(root, 'shared/images');

const buffer = readFileSync(src);
const meta = await sharp(buffer).metadata();
const { width, height } = meta;
const w = Math.floor(width / 2);
const h = Math.floor(height / 2);

await sharp(buffer)
  .extract({ left: 0, top: 0, width: w, height: h })
  .toFile(join(outDir, 'shieldy-calm.png'));
await sharp(buffer)
  .extract({ left: w, top: 0, width: width - w, height: h })
  .toFile(join(outDir, 'shieldy-suspicious.png'));
await sharp(buffer)
  .extract({ left: 0, top: h, width: w, height: height - h })
  .toFile(join(outDir, 'shieldy-alert.png'));
await sharp(buffer)
  .extract({ left: w, top: h, width: width - w, height: height - h })
  .toFile(join(outDir, 'shieldy-danger.png'));

console.log('Shieldy split: shieldy-calm.png, shieldy-suspicious.png, shieldy-alert.png, shieldy-danger.png');
