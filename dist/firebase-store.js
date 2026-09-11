import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, signInAnonymously, connectAuthEmulator, setPersistence, browserLocalPersistence, inMemoryPersistence }
  from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { initializeFirestore, memoryLocalCache, connectFirestoreEmulator, collection, doc,
  query, where, orderBy, onSnapshot, runTransaction, serverTimestamp, getDocFromServer, setLogLevel }
  from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { monthRange, sortExpenses, expensePayload, validateExpense } from './domain.js';

function fail(code) { return Object.assign(new Error(code), { code }); }
export async function connectStore(config, spaceId, emulators) {
  // Los diagnósticos del SDK pueden incluir rutas; la ruta contiene la credencial compartida.
  setLogLevel('silent');
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  if (emulators) {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) throw fail('invalid-emulator');
    connectAuthEmulator(auth, `http://127.0.0.1:${emulators.authPort}`, { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', emulators.firestorePort);
  }
  try { await setPersistence(auth, browserLocalPersistence); }
  catch { await setPersistence(auth, inMemoryPersistence); }
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  const expenses = collection(db, 'espacios', spaceId, 'gastos');
  return {
    newId: () => doc(expenses).id,
    async getExpense(id) {
      const snapshot = await getDocFromServer(doc(expenses, id));
      return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    },
    watchMonth(month, onData, onError) {
      const { start, end } = monthRange(month);
      return onSnapshot(query(expenses, where('date', '>=', start), where('date', '<=', end), orderBy('date', 'desc')),
        { includeMetadataChanges: true }, snapshot => {
          // Una caché vacía no significa que no existan gastos en el servidor.
          onData(sortExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))), !snapshot.metadata.fromCache);
        }, onError);
    },
    async save(input, id, expectedVersion = null) {
      const payload = expensePayload(input);
      if (Object.keys(validateExpense(payload)).length) throw fail('invalid-data');
      if (!navigator.onLine) throw fail('offline');
      const ref = doc(expenses, id);
      return runTransaction(db, async transaction => {
        const existing = await transaction.get(ref);
        if (expectedVersion === null) {
          if (existing.exists()) {
            const previous = existing.data();
            if (Object.entries(payload).every(([key, value]) => previous[key] === value)) return;
            throw fail('duplicate-mismatch');
          }
          transaction.set(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), version: 1 });
        } else {
          if (!existing.exists()) throw fail('deleted');
          if (existing.data().version !== expectedVersion) throw fail('conflict');
          transaction.update(ref, { ...payload, updatedAt: serverTimestamp(), version: expectedVersion + 1 });
        }
      });
    },
    async remove(id, expectedVersion) {
      if (!navigator.onLine) throw fail('offline');
      return runTransaction(db, async transaction => {
        const ref = doc(expenses, id);
        const existing = await transaction.get(ref);
        if (!existing.exists()) return;
        if (existing.data().version !== expectedVersion) throw fail('conflict');
        transaction.delete(ref);
      });
    }
  };
}
