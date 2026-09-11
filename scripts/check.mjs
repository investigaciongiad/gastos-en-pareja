import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const publicRoot = new URL('../dist/',import.meta.url);
const html = await readFile(new URL('index.html',publicRoot),'utf8');
for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) await readFile(new URL(match[1],publicRoot));
for (const name of await readdir(publicRoot)) {
  if (name.endsWith('.js')) {
    const check = spawnSync(process.execPath,['--check',fileURLToPath(new URL(name,publicRoot))],{ encoding:'utf8' });
    if (check.status !== 0) throw new Error(check.stderr);
  }
  const text = await readFile(new URL(name,publicRoot),'utf8');
  if (/[a-f0-9]{64}/.test(text)) throw new Error(`Posible identificador privado en dist/${name}`);
  if (/BEGIN (RSA )?PRIVATE KEY|private_key_id|service_account/.test(text)) throw new Error(`Posible credencial administrativa en dist/${name}`);
}
if (process.argv.includes('--production')) {
  const { firebaseConfig,emulatorConfig } = await import('../dist/firebase-config.js');
  if (!Object.values(firebaseConfig).every(value => typeof value === 'string' && value.trim()) || firebaseConfig.projectId.startsWith('demo-')) throw new Error('Completa firebase-config.js antes de publicar.');
  if (emulatorConfig !== null) throw new Error('No publicar una configuración de emuladores.');
}
console.log('Archivos estáticos, referencias, sintaxis y revisión de secretos: correctos.');
