import { firebaseConfig, emulatorConfig } from './firebase-config.js';
import { PEOPLE, CATEGORIES, money, pesoNumber, todayBogota, parseAmount, validateExpense,
  monthLabel, dateLabel, filterExpenses, summarize, accessFromHash } from './domain.js';

const $ = id => document.getElementById(id);
const ICONS = {
  plus:'<path d="M12 5v14M5 12h14"/>', arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check:'<path d="m5 12 4 4L19 6"/>', list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  chart:'<path d="M5 19V9m7 10V4m7 15v-7M3 21h18"/>',
  basket:'<path d="m7 9 3-6m7 6-3-6M3 9h18l-2 11H5L3 9Zm6 4v3m6-3v3"/>',
  utensils:'<path d="M5 3v6c0 3 6 3 6 0V3M8 3v18M20 3c-4 1-5 9 0 9V3Zm0 9v9"/>',
  home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8L21 9h-8l1-7Z"/>',
  bus:'<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 10h14M8 19v2m8-2v2M8 15h.01M16 15h.01M9 6h6"/>',
  heart:'<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 1 10 8 15 7-5 12-11 8-15Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  cloud:'<path d="M7 18a5 5 0 1 1 1-9 6 6 0 0 1 11 1 4 4 0 0 1-1 8H7Z"/>',
  edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5Z"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 7h6M9 11h6M9 15h3"/>'
};
function icon(name) { return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.receipt}</svg>`; }
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function iconElement(name, className = '') { const el = element('span', className); el.innerHTML = icon(name); return el; }
function avatar(person) { return element('span', `avatar ${person.id}`, person.initials); }
document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); $('main').focus(); });
function readPreference() { try { return localStorage.getItem('gastos-payer'); } catch { return null; } }
const preferred = readPreference();
const state = {
  view:'register', month:todayBogota().slice(0,7), payer:PEOPLE.some(p => p.id === preferred) ? preferred : '', category:'',
  store:null, expenses:[], edit:null, newId:null, busy:false, authorized:false, loaded:false,
  watchMonth:null, unsubscribe:null, toastTimer:null, deleteTarget:null, dirty:false, denied:false
};

for (const person of PEOPLE) {
  const button = element('button', 'payer-option'); button.type = 'button';
  button.dataset.payer = person.id;
  button.setAttribute('aria-label',person.name);
  button.setAttribute('aria-describedby', 'error-payer');
  button.append(avatar(person), element('span', '', person.name), element('span', 'selected-dot'));
  button.addEventListener('click', () => {
    state.payer = person.id; state.dirty = true;
    try { localStorage.setItem('gastos-payer', person.id); } catch { /* Preferencia opcional. */ }
    updateChoices(); clearError('payer');
  });
  $('payer-options').append(button);
  $('filter-payer').append(new Option(person.name, person.id));
}
for (const category of CATEGORIES) {
  const button = element('button', 'category-option'); button.type = 'button';
  button.dataset.category = category.id;
  button.setAttribute('aria-describedby', 'error-category');
  button.append(iconElement(category.icon), element('span', '', category.name));
  button.addEventListener('click', () => { state.category = category.id; state.dirty = true; updateChoices(); clearError('category'); });
  $('category-options').append(button);
  $('filter-category').append(new Option(category.name, category.id));
}
function updateChoices() {
  document.querySelectorAll('[data-payer]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.payer === state.payer)));
  document.querySelectorAll('[data-category]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.category === state.category)));
}
function clearError(key) { $(`error-${key}`).hidden = true; $(key)?.removeAttribute('aria-invalid'); }
function showErrors(errors) {
  for (const key of ['payer','amount','description','category','date']) {
    clearError(key);
    if (errors[key]) { $(`error-${key}`).textContent = errors[key]; $(`error-${key}`).hidden = false; $(key)?.setAttribute('aria-invalid','true'); }
  }
  const first = Object.keys(errors)[0];
  if (first) ($(first) || $(first === 'payer' ? 'payer-options' : 'category-options').querySelector('button'))?.focus();
}
function notice(text, retry = false) { $('notice-text').textContent = text; $('notice').hidden = !text; $('retry-connect').hidden = !retry; }
function connection(label, status = '') { $('connection-label').textContent = label; $('connection').className = `connection ${status}`; }
function toast(text) {
  clearTimeout(state.toastTimer); $('toast-text').textContent = text; $('toast').hidden = false;
  state.toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
}
function updateAvailability() {
  $('save-button').disabled = state.busy || !state.authorized || !navigator.onLine;
  $('save-label').textContent = state.busy ? 'Guardando…' : state.edit ? 'Guardar cambios' : 'Guardar gasto';
  $('expense-form').setAttribute('aria-busy', String(state.busy));
  $('expense-form').querySelectorAll('input, fieldset button, #cancel-edit, #reload-edit').forEach(el => { el.disabled = state.busy; });
}
function displayMonth(month) {
  state.month = month; $('movement-month').value = month; $('summary-month').value = month;
  $('summary-month-label').textContent = monthLabel(month);
}
function switchView(view) {
  if (!['register','movements','summary'].includes(view)) return;
  state.view = view;
  document.querySelectorAll('[data-view]').forEach(tab => {
    const active = tab.dataset.view === view;
    tab.classList.toggle('active', active); tab.setAttribute('aria-selected',String(active)); tab.tabIndex = active ? 0 : -1;
    $(`view-${tab.dataset.view}`).hidden = !active;
  });
  const desiredMonth = view === 'register' ? todayBogota().slice(0,7) : state.month;
  subscribe(desiredMonth);
  render();
}
document.querySelectorAll('[data-view]').forEach(tab => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
  tab.addEventListener('keydown', event => {
    const tabs = [...document.querySelectorAll('[data-view]')]; const i = tabs.indexOf(tab);
    let index;
    if (event.key === 'ArrowRight') index = (i + 1) % tabs.length;
    if (event.key === 'ArrowLeft') index = (i + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') index = 0;
    if (event.key === 'End') index = tabs.length - 1;
    if (index !== undefined) { event.preventDefault(); switchView(tabs[index].dataset.view); tabs[index].focus(); }
  });
});
$('open-summary').addEventListener('click', () => { displayMonth(todayBogota().slice(0,7)); switchView('summary'); $('tab-summary').focus(); });
for (const id of ['movement-month','summary-month']) $(id).addEventListener('change', event => {
  const input = event.target;
  if (!input.value || !input.checkValidity() || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.value)) { input.value = state.month; return; }
  displayMonth(input.value); subscribe(state.month);
});
for (const id of ['filter-payer','filter-category']) $(id).addEventListener('change', render);

function empty(container, title, detail = '', symbol = 'receipt') {
  const box = element('div','empty-state'); box.append(iconElement(symbol), element('strong','',title));
  if (detail) box.append(element('p','',detail)); container.replaceChildren(box);
}
function render() {
  const loaded = state.loaded;
  const summary = summarize(state.expenses);
  const total = loaded ? money(summary.total) : '—';
  $('quick-total').textContent = total; $('summary-total').textContent = total;
  $('summary-count').textContent = loaded ? `${summary.count} ${summary.count === 1 ? 'gasto' : 'gastos'}` : '';
  $('quick-people').replaceChildren(); $('summary-people').replaceChildren();
  for (const person of PEOPLE) {
    const value = loaded ? money(summary.people[person.id]) : '—';
    const quick = element('div','quick-person'); quick.append(avatar(person),element('span','',person.short),element('strong','',value)); $('quick-people').append(quick);
    const row = element('div','summary-person'); const info = element('div','summary-person-info');
    info.append(element('p','',person.name),element('strong','',value));
    row.append(avatar(person),info,element('span','percentage',loaded && summary.total ? `${Math.round(summary.people[person.id] / summary.total * 100)} %` : '—'));
    $('summary-people').append(row);
  }
  const filtered = filterExpenses(state.expenses, $('filter-payer').value, $('filter-category').value);
  $('movement-count').textContent = loaded ? `${filtered.length} ${filtered.length === 1 ? 'gasto' : 'gastos'}` : 'Esperando conexión';
  $('filtered-total').textContent = loaded ? money(summarize(filtered).total) : '—';
  if (!loaded) {
    for (const id of ['recent-list','expense-list','category-bars']) empty($(id), state.denied ? 'Sin acceso a los gastos' : 'Esperando los gastos', state.denied ? 'Abre el enlace privado completo.' : 'Aparecerán al conectar el almacenamiento.');
    return;
  }
  $('recent-list').replaceChildren();
  if (!state.expenses.length) empty($('recent-list'), 'El mes empieza aquí', 'Cuando registren un gasto, lo verán en este espacio.');
  for (const expense of state.expenses.slice(0,3)) {
    const category = CATEGORIES.find(c => c.id === expense.category); const person = PEOPLE.find(p => p.id === expense.payer);
    const row = element('div','recent-item'); const text = element('div','recent-text');
    text.append(element('strong','',expense.description),element('small','',`${person.short} · ${dateLabel(expense.date)}`));
    row.append(iconElement(category.icon,'category-icon'),text,element('span','recent-amount',money(expense.amount))); $('recent-list').append(row);
  }
  $('expense-list').replaceChildren();
  if (!filtered.length) empty($('expense-list'), state.expenses.length ? 'Sin coincidencias' : 'Todavía no hay gastos', state.expenses.length ? 'Prueba con otra persona o categoría.' : 'Los gastos de este mes aparecerán aquí.');
  for (const expense of filtered) {
    const person = PEOPLE.find(p => p.id === expense.payer); const category = CATEGORIES.find(c => c.id === expense.category);
    const row = element('article','expense-row'); const body = element('div','expense-body');
    const meta = element('div','expense-meta');
    meta.append(element('span',`payer-tag ${person.id}`,person.name),element('span','',category.name),element('span','',dateLabel(expense.date)));
    body.append(element('h2','expense-description',expense.description),meta);
    const end = element('div','expense-end'); const actions = element('div','row-actions');
    for (const action of ['edit','trash']) {
      const button = element('button','icon-button'); button.type = 'button'; button.innerHTML = icon(action);
      button.setAttribute('aria-label',`${action === 'edit' ? 'Editar' : 'Eliminar'} ${expense.description}`);
      button.disabled = state.busy || !state.authorized;
      button.addEventListener('click', () => action === 'edit' ? startEdit(expense) : askDelete(expense)); actions.append(button);
    }
    end.append(element('span','expense-amount',money(expense.amount)),actions);
    row.append(iconElement(category.icon,'category-icon'),body,end); $('expense-list').append(row);
  }
  $('category-bars').replaceChildren();
  const categories = [...CATEGORIES].sort((a,b) => summary.categories[b.id]-summary.categories[a.id]).filter(c => summary.categories[c.id] > 0);
  if (!categories.length) empty($('category-bars'),'Aún no hay gastos por categoría');
  for (const category of categories) {
    const value = summary.categories[category.id]; const row = element('div','bar-row'); const label = element('div','bar-label');
    label.append(element('span','',category.name),element('strong','',money(value)));
    const track = element('div','bar-track'); const fill = element('div','bar-fill'); fill.style.width = `${value / summary.total * 100}%`; track.append(fill);
    row.append(label,track); $('category-bars').append(row);
  }
}

function subscribe(month) {
  if (!state.store || state.watchMonth === month) return;
  state.unsubscribe?.(); state.watchMonth = month; state.loaded = false; state.expenses = []; render();
  state.unsubscribe = state.store.watchMonth(month, (expenses, fromServer) => {
    if (state.watchMonth !== month) return;
    if (fromServer) {
      state.authorized = true; state.loaded = true; state.denied = false;
      connection('Conectados','online'); notice('');
    } else if (state.loaded) {
      connection('Reconectando'); notice('La conexión se interrumpió. Los datos visibles pueden estar desactualizados.');
    }
    if (state.loaded) state.expenses = expenses;
    render(); updateAvailability();
  }, error => {
    state.authorized = false; state.loaded = false; state.expenses = []; state.watchMonth = null;
    state.denied = ['permission-denied','unauthenticated'].includes(error.code);
    connection('Sin conexión','offline');
    notice(state.denied ? 'Enlace no válido. Abre el enlace privado completo que comparten.' : 'No pudimos cargar los gastos. Revisa la conexión y vuelve a intentar.', !state.denied);
    render(); updateAvailability();
  });
}
function formInput() { return { payer:state.payer, category:state.category, amount:parseAmount($('amount').value), description:$('description').value.trim(), date:$('date').value }; }
function formError(text) { $('form-message').textContent = text; $('form-message').hidden = !text; }
function errorText(error) {
  if (error.code === 'conflict') return 'Este gasto cambió en otro dispositivo. Carga la versión actual antes de volver a editarlo.';
  if (error.code === 'deleted') return 'Este gasto ya fue eliminado. Cancela la edición para registrar uno nuevo.';
  if (error.code === 'duplicate-mismatch') return 'Este registro ya se guardó con otros datos. Carga la versión guardada antes de cambiarlo.';
  if (['permission-denied','unauthenticated'].includes(error.code)) return 'El enlace ya no permite guardar. Revisa el acceso; el formulario se conserva.';
  if (error.code === 'invalid-data') return 'Revisa los datos del gasto e inténtalo de nuevo.';
  return 'No se ha confirmado el guardado. Revisa la conexión y vuelve a intentar; tus datos siguen en el formulario.';
}
function resetForm() {
  state.edit = null; state.newId = null; state.dirty = false;
  $('expense-form').reset(); $('date').value = todayBogota(); state.category = '';
  $('form-title').textContent = 'Un nuevo gasto'; $('cancel-edit').hidden = true; $('reload-edit').hidden = true;
  formError(''); showErrors({}); updateChoices(); updateAvailability();
}
async function saveExpense(event) {
  event?.preventDefault();
  if (state.busy || !state.authorized) return;
  const input = formInput(); const errors = validateExpense(input); showErrors(errors);
  if (Object.keys(errors).length) return;
  if (!navigator.onLine) { formError('Necesitas conexión a internet para guardar. Tus datos siguen en el formulario.'); return; }
  if (!state.edit && !state.newId) state.newId = state.store.newId();
  const editing = state.edit;
  state.busy = true; formError(''); $('reload-edit').hidden = true; updateAvailability(); render();
  try {
    await state.store.save(input, editing?.id || state.newId, editing?.version ?? null);
    state.busy = false; resetForm(); toast(editing ? 'Cambios guardados para los dos' : 'Gasto guardado para los dos');
    $('amount').focus();
  } catch (error) {
    formError(errorText(error));
    $('reload-edit').hidden = !['conflict','duplicate-mismatch'].includes(error.code);
  } finally { state.busy = false; updateAvailability(); render(); }
}
$('expense-form').addEventListener('submit', saveExpense);
$('expense-form').addEventListener('input', event => { state.dirty = true; if (event.target.id) clearError(event.target.id); });
$('amount').addEventListener('blur', () => { const value = parseAmount($('amount').value); if (Number.isFinite(value)) $('amount').value = pesoNumber.format(value); });
$('cancel-edit').addEventListener('click', resetForm);
function startEdit(expense) {
  if (state.busy) return;
  // No reemplazar silenciosamente un borrador que se esté escribiendo.
  if (state.dirty && !window.confirm('Tienes un gasto sin guardar. ¿Descartar ese borrador y editar este gasto?')) return;
  applyEdit(expense);
}
function applyEdit(expense) {
  state.edit = { ...expense }; state.payer = expense.payer; state.category = expense.category; state.dirty = false;
  $('amount').value = pesoNumber.format(expense.amount); $('description').value = expense.description; $('date').value = expense.date;
  $('form-title').textContent = 'Editar gasto'; $('cancel-edit').hidden = false; $('reload-edit').hidden = true;
  formError(''); showErrors({}); updateChoices(); updateAvailability(); switchView('register'); $('amount').focus();
}
$('reload-edit').addEventListener('click', async () => {
  if (state.busy) return;
  state.busy = true; updateAvailability();
  try {
    const expense = await state.store.getExpense(state.edit?.id || state.newId);
    if (!expense) { formError(errorText({ code:'deleted' })); $('cancel-edit').hidden = false; }
    else applyEdit(expense);
  } catch { formError('No pudimos cargar la versión actual. Revisa tu conexión y vuelve a intentar.'); }
  finally { state.busy = false; updateAvailability(); }
});

function askDelete(expense) {
  if (state.busy) return;
  state.deleteTarget = { ...expense };
  $('delete-description').textContent = `${expense.description} · ${money(expense.amount)}`;
  $('delete-error').hidden = true; $('confirm-delete').disabled = false; $('delete-dialog').showModal();
}
$('cancel-delete').addEventListener('click', () => $('delete-dialog').close());
$('delete-dialog').addEventListener('cancel', event => { if (state.busy) event.preventDefault(); });
$('confirm-delete').addEventListener('click', async () => {
  if (state.busy || !state.deleteTarget) return;
  state.busy = true; $('confirm-delete').disabled = true; $('cancel-delete').disabled = true; updateAvailability();
  try {
    await state.store.remove(state.deleteTarget.id,state.deleteTarget.version);
    if (state.edit?.id === state.deleteTarget.id) resetForm();
    $('delete-dialog').close(); toast('Gasto eliminado');
  } catch (error) {
    $('delete-error').textContent = error.code === 'conflict' ? 'Este gasto cambió. Cierra esta ventana y revisa la versión actual antes de eliminarlo.' : 'No se ha confirmado la eliminación. Revisa la conexión y vuelve a intentar.';
    $('delete-error').hidden = false;
  } finally { state.busy = false; $('confirm-delete').disabled = false; $('cancel-delete').disabled = false; updateAvailability(); }
});

async function boot() {
  updateAvailability(); render();
  if (!Object.values(firebaseConfig).every(Boolean)) {
    connection('Sin configurar');
    notice('Falta conectar el almacenamiento. La aplicación está lista para configurar Firebase; todavía no se pueden guardar gastos.'); return;
  }
  const access = accessFromHash(location.hash);
  if (!access) {
    state.denied = true; connection('Sin acceso','offline');
    notice('Enlace no válido. Abre el enlace privado completo que comparten.'); render(); return;
  }
  connection('Conectando'); notice('Conectando con los gastos compartidos…');
  try {
    const { connectStore } = await import('./firebase-store.js');
    state.store = await connectStore(firebaseConfig,access,emulatorConfig);
    subscribe(state.view === 'register' ? todayBogota().slice(0,7) : state.month);
  } catch {
    connection('Sin conexión','offline');
    notice('No pudimos conectar. Revisa la conexión y la configuración del almacenamiento.',true);
  }
}
$('retry-connect').addEventListener('click', () => {
  if (state.store) subscribe(state.view === 'register' ? todayBogota().slice(0,7) : state.month);
  else boot();
});
window.addEventListener('offline', () => { connection('Sin internet','offline'); notice('Sin internet. Puedes completar el formulario y guardarlo cuando vuelva la conexión.'); updateAvailability(); });
window.addEventListener('online', () => { if (state.store) { connection('Reconectando'); state.watchMonth = null; subscribe(state.view === 'register' ? todayBogota().slice(0,7) : state.month); } else boot(); updateAvailability(); });
window.addEventListener('beforeunload', event => { if (state.busy || state.dirty) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('hashchange', () => location.reload());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.view === 'register') {
    updateToday(); subscribe(todayBogota().slice(0,7));
  }
});
function updateToday() {
  const today = todayBogota(); $('today-label').textContent = `Hoy, ${dateLabel(today)}`;
  document.querySelectorAll('.current-month-label').forEach(el => { el.textContent = monthLabel(today.slice(0,7)); });
  if (!state.dirty && !state.edit) $('date').value = today;
}
updateToday(); displayMonth(state.month); updateChoices(); boot();

// Compatibilidad progresiva: consulta el mismo resumen visible, sin revelar el enlace.
const modelContext = document.modelContext;
if (modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(modelContext.registerTool({
      name:'consultar_resumen_visible', title:'Consultar resumen de gastos',
      description:'Devuelve los totales del mes cargado en la aplicación. No modifica gastos.',
      inputSchema:{ type:'object', properties:{}, additionalProperties:false },
      annotations:{ readOnlyHint:true, untrustedContentHint:false },
      execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('No se admiten parámetros.');
        if (!state.loaded || !state.authorized) throw new Error('Los gastos no están disponibles.');
        return { month:state.watchMonth, currency:'COP', ...summarize(state.expenses) };
      }
    }, { signal:lifecycle.signal })).catch(() => {});
    window.addEventListener('pagehide', () => lifecycle.abort(), { once:true });
  } catch { /* La aplicación funciona sin WebMCP. */ }
}
