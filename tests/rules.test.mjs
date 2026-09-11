import { before,after,beforeEach,test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment,assertSucceeds,assertFails } from '@firebase/rules-unit-testing';
import { doc,collection,collectionGroup,getDoc,getDocs,setDoc,updateDoc,deleteDoc,serverTimestamp,Timestamp } from 'firebase/firestore';

const SPACE = 'a'.repeat(64);
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId:'demo-gastos-pareja', firestore:{ host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8') } });
});
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(),'espacios',SPACE),{active:true}));
});
function anonymous() { return env.authenticatedContext('browser-one',{firebase:{sign_in_provider:'anonymous'}}).firestore(); }
function ref(db,id='expense') { return doc(db,'espacios',SPACE,'gastos',id); }
function expense(overrides={}) {
  return { payer:'lali',amount:25000,description:'Mercado',category:'mercado',date:'2026-09-11',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),version:1,...overrides };
}
test('sesión anónima y enlace válido permiten crear, consultar, listar, editar y eliminar',async () => {
  const db = anonymous(); const record = ref(db);
  await assertSucceeds(setDoc(record,expense()));
  await assertSucceeds(getDoc(record)); await assertSucceeds(getDocs(collection(db,'espacios',SPACE,'gastos')));
  await assertSucceeds(updateDoc(record,{amount:30000,version:2,updatedAt:serverTimestamp()}));
  await assertSucceeds(deleteDoc(record));
});
test('sin autenticación no se pueden leer ni escribir los gastos',async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(ref(db))); await assertFails(setDoc(ref(db),expense()));
});
test('otro proveedor no se considera una sesión anónima',async () => {
  const db = env.authenticatedContext('google-user',{firebase:{sign_in_provider:'google.com'}}).firestore();
  await assertFails(setDoc(ref(db),expense()));
});
test('identificadores desconocidos, malformados e inactivos no dan acceso',async () => {
  const db = anonymous();
  for (const id of ['b'.repeat(64),'corto']) {
    await assertFails(getDocs(collection(db,'espacios',id,'gastos')));
    await assertFails(setDoc(doc(db,'espacios',id,'gastos','expense'),expense()));
  }
  await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(),'espacios',SPACE),{active:false}));
  await assertFails(getDoc(ref(db))); await assertFails(setDoc(ref(db),expense()));
});
test('no se pueden descubrir, leer, crear, activar ni borrar espacios administrativos',async () => {
  const db = anonymous();
  await assertFails(getDocs(collection(db,'espacios')));
  await assertFails(getDoc(doc(db,'espacios',SPACE)));
  await assertFails(setDoc(doc(db,'espacios','b'.repeat(64)),{active:true}));
  await assertFails(updateDoc(doc(db,'espacios',SPACE),{active:true}));
  await assertFails(deleteDoc(doc(db,'espacios',SPACE)));
  await assertFails(getDocs(collectionGroup(db,'gastos')));
});
test('valores, campos, categorías, personas y versiones inválidas se rechazan',async () => {
  const db = anonymous();
  const invalid = [
    {amount:0},{amount:-1},{amount:12.5},{amount:'25000'},{amount:1000000000000},
    {payer:'tercero'},{category:'cualquiera'},{description:''},{description:'    '},{description:'x'.repeat(201)},
    {version:2},{version:1.5},{extra:'campo no permitido'},
    {createdAt:Timestamp.fromMillis(0)},{updatedAt:Timestamp.fromMillis(0)}
  ];
  for (let i=0;i<invalid.length;i++) await assertFails(setDoc(ref(db,`invalid-${i}`),expense(invalid[i])));
  const incomplete = expense(); delete incomplete.category;
  await assertFails(setDoc(ref(db,'incomplete'),incomplete));
});
test('las fechas deben existir, incluso al final de mes y en años bisiestos',async () => {
  const db = anonymous();
  for (const date of ['2026-02-29','2026-04-31','1900-02-29','2026-00-01','2026-13-01','2026-01-00','2026-1-1','1899-12-31']) {
    await assertFails(setDoc(ref(db,date),expense({date})));
  }
  for (const date of ['2024-02-29','2000-02-29','2026-04-30','2026-12-31']) await assertSucceeds(setDoc(ref(db,date),expense({date})));
});
test('la creación no se puede alterar y la versión debe avanzar exactamente uno',async () => {
  const db = anonymous(); const record = ref(db);
  await setDoc(record,expense());
  await assertFails(updateDoc(record,{version:1,amount:42,updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(record,{version:3,amount:42,updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(record,{version:2,createdAt:Timestamp.fromMillis(0),updatedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(record,{version:2,payer:'oscar',updatedAt:serverTimestamp()}));
});
test('revocar el espacio bloquea también actualizaciones y eliminaciones',async () => {
  const db = anonymous(); await setDoc(ref(db),expense());
  await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(),'espacios',SPACE),{active:false}));
  await assertFails(updateDoc(ref(db),{version:2,amount:500,updatedAt:serverTimestamp()}));
  await assertFails(deleteDoc(ref(db)));
});
