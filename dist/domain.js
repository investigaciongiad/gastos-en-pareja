export const PEOPLE = [
  { id: 'lali', name: 'Lali Valentina', short: 'Lali', initials: 'LV' },
  { id: 'oscar', name: 'Óscar Iván', short: 'Óscar', initials: 'ÓI' }
];
export const CATEGORIES = [
  { id: 'mercado', name: 'Mercado', icon: 'basket' },
  { id: 'comidas', name: 'Comidas fuera', icon: 'utensils' },
  { id: 'vivienda', name: 'Vivienda', icon: 'home' },
  { id: 'servicios', name: 'Servicios', icon: 'bolt' },
  { id: 'transporte', name: 'Transporte', icon: 'bus' },
  { id: 'salud', name: 'Salud', icon: 'heart' },
  { id: 'ocio', name: 'Ocio', icon: 'sun' },
  { id: 'otros', name: 'Otros', icon: 'dots' }
];
export const MAX_AMOUNT = 999_999_999_999;
export const pesoNumber = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
export function money(value) { return `$ ${pesoNumber.format(value)}`; }
export function todayBogota(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  return ['year', 'month', 'day'].map(key => parts.find(p => p.type === key).value).join('-');
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01') return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export function parseAmount(value) {
  const text = String(value).trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(text)) return NaN;
  const amount = Number(text.replaceAll('.', ''));
  return Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_AMOUNT ? amount : NaN;
}
export function validateExpense(input) {
  const errors = {};
  if (!PEOPLE.some(p => p.id === input.payer)) errors.payer = 'Elige quién hizo el pago.';
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > MAX_AMOUNT) {
    errors.amount = 'Ingresa un valor entre $ 1 y $ 999.999.999.999, sin centavos.';
  }
  if (typeof input.description !== 'string' || !input.description.trim() || input.description.trim().length > 200) {
    errors.description = 'Describe el gasto en un máximo de 200 caracteres.';
  }
  if (!CATEGORIES.some(c => c.id === input.category)) errors.category = 'Elige una categoría.';
  if (!validDate(input.date)) errors.date = 'Elige una fecha válida desde el año 1900.';
  return errors;
}
export function monthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < '1900-01') throw new Error('Mes no válido');
  return { start: `${month}-01`, end: `${month}-31` };
}
export function monthLabel(month) {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${month}-01T12:00:00Z`));
}
export function dateLabel(date) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`));
}
export function sortExpenses(expenses) {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date) ||
    (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0) || b.id.localeCompare(a.id));
}
export function filterExpenses(expenses, payer = '', category = '') {
  return expenses.filter(e => (!payer || e.payer === payer) && (!category || e.category === category));
}
export function summarize(expenses) {
  const result = { total: 0, count: expenses.length,
    people: Object.fromEntries(PEOPLE.map(p => [p.id, 0])),
    categories: Object.fromEntries(CATEGORIES.map(c => [c.id, 0])) };
  for (const expense of expenses) {
    result.total += expense.amount;
    result.people[expense.payer] += expense.amount;
    result.categories[expense.category] += expense.amount;
  }
  return result;
}
export function accessFromHash(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const values = params.getAll('acceso');
  return values.length === 1 && /^[a-f0-9]{64}$/.test(values[0]) ? values[0] : null;
}
export function expensePayload(input) {
  return { payer: input.payer, amount: input.amount, description: input.description.trim(),
    category: input.category, date: input.date };
}
