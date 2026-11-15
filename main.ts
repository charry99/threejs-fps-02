import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const root = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const game = join(root, 'game');
try {
  await readFile(join(game, 'index.html'));
} catch {
  console.error(`Game directory is missing or incomplete: ${game}`);
  process.exit(1);
}
await mkdir(output, { recursive: true });
await cp(game, join(output, 'game'), { recursive: true });
const screenshots = join(root, 'screenshots');
await mkdir(join(output, 'screenshots'), { recursive: true });
try { await cp(screenshots, join(output, 'screenshots'), { recursive: true }); } catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
const dossier = await buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
await writeFile(join(output, 'dossier.json'), dossier, 'utf8');
console.log(`${output}\n${Buffer.byteLength(dossier, 'utf8')} bytes`);
