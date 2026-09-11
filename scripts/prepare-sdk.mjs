import { mkdir, writeFile } from 'node:fs/promises';
const folder = new URL('../.cache/sdk/',import.meta.url);
await mkdir(folder,{recursive:true});
for (const name of ['app','auth','firestore']) {
  const response = await fetch(`https://www.gstatic.com/firebasejs/12.19.0/firebase-${name}.js`);
  if (!response.ok) throw new Error(`No se pudo obtener el SDK de ${name}: ${response.status}`);
  const source = (await response.text()).replaceAll('https://www.gstatic.com/firebasejs/12.19.0/', './');
  await writeFile(new URL(`firebase-${name}.js`,folder),source);
}
console.log('SDK oficial de Firebase preparado para pruebas locales.');
