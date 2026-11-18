// Menyalin runtime Pyodide dari node_modules ke public/pyodide agar
// dapat dimuat tanpa internet (lingkungan lab offline).
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'pyodide');
const dest = join(root, 'public', 'pyodide');

const NEEDED = ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

if (!existsSync(src)) {
  console.error('[pyodide] Paket "pyodide" belum terpasang. Jalankan: npm install');
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
for (const file of NEEDED) {
  if (!readdirSync(src).includes(file)) {
    console.error(`[pyodide] Berkas ${file} tidak ditemukan di node_modules/pyodide.`);
    process.exit(1);
  }
  cpSync(join(src, file), join(dest, file));
}
console.log(`[pyodide] ${NEEDED.length} berkas disalin ke public/pyodide`);
