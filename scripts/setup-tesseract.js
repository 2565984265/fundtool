import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const tessdataDir = join(publicDir, 'tessdata');

function copy(from, to) {
  if (!existsSync(to)) {
    copyFileSync(from, to);
    console.log('Copied:', to);
  }
}

// Ensure directories exist
mkdirSync(tessdataDir, { recursive: true });

// Copy language traineddata
const chiSimSrc = join(root, 'node_modules/@tesseract.js-data/chi_sim/chi_sim.traineddata.gz');
const engSrc = join(root, 'node_modules/@tesseract.js-data/eng/eng.traineddata.gz');
copy(chiSimSrc, join(tessdataDir, 'chi_sim.traineddata.gz'));
copy(engSrc, join(tessdataDir, 'eng.traineddata.gz'));

// Copy worker
const workerSrc = join(root, 'node_modules/tesseract.js/dist/worker.min.js');
copy(workerSrc, join(publicDir, 'worker.min.js'));

// Copy all core variants
const coreFiles = [
  'tesseract-core-lstm.js',
  'tesseract-core-lstm.wasm',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.js',
  'tesseract-core-relaxedsimd-lstm.wasm',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract-core-relaxedsimd.js',
  'tesseract-core-relaxedsimd.wasm',
  'tesseract-core-relaxedsimd.wasm.js',
  'tesseract-core-simd-lstm.js',
  'tesseract-core-simd-lstm.wasm',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-simd.js',
  'tesseract-core-simd.wasm',
  'tesseract-core-simd.wasm.js',
  'tesseract-core.js',
  'tesseract-core.wasm',
  'tesseract-core.wasm.js',
];

for (const file of coreFiles) {
  const src = join(root, 'node_modules/tesseract.js-core', file);
  const dest = join(publicDir, file);
  copy(src, dest);
}

console.log('Tesseract setup complete.');
