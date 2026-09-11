import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';

const base = process.argv[2];
if (!base) {
  console.error('Uso: npm run setup:link -- https://USUARIO.github.io/REPOSITORIO/');
  process.exit(1);
}
const url = new URL(base);
if (url.protocol !== 'https:' || url.hash || url.search || url.username || url.password) throw new Error('Usa la dirección HTTPS de la aplicación sin parámetros ni fragmento.');
const folder = new URL('../.private/',import.meta.url);
const output = new URL('acceso.json',folder);
await mkdir(folder,{recursive:true});
try { await access(output); throw new Error('Ya existe .private/acceso.json. Se conserva el enlace anterior.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const identifier = randomBytes(32).toString('hex');
url.hash = new URLSearchParams({ acceso:identifier }).toString();
await writeFile(output,JSON.stringify({
  aviso:'Privado. Quien tenga este enlace puede consultar y modificar los gastos. No subir este archivo a GitHub.',
  enlace:url.toString(),
  documentoFirebase:{ coleccion:'espacios', id:identifier, campos:{ active:true } }
},null,2)+'\n',{ flag:'wx', mode:0o600 });
console.log('Enlace generado en .private/acceso.json (excluido de Git). No se muestra en la terminal.');
