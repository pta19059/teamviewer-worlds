import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputs = ['dist', 'docs'].map(name => resolve(root, name));
for (const output of outputs) {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(resolve(root, 'index.html'), resolve(output, 'index.html'));
  await cp(resolve(root, 'src'), resolve(output, 'src'), { recursive: true });
  await cp(resolve(root, 'public'), output, { recursive: true });
  const three = await readFile(resolve(output, 'vendor/three/three.module.js'), 'utf8');
  if (!three.includes('REVISION')) throw new Error('The local Three.js bundle is missing or invalid.');
  await writeFile(resolve(output, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
}
console.log('Production site built in dist/ and docs/. docs/ is ready for GitHub Pages.');
