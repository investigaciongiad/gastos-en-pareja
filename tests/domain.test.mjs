import test from 'node:test';
import assert from 'node:assert/strict';
import { todayBogota,parseAmount,validDate,validateExpense,monthRange,filterExpenses,summarize,sortExpenses,accessFromHash } from '../dist/domain.js';

test('día de Colombia: un cambio de día en UTC conserva el día local', () => {
  assert.equal(todayBogota(new Date('2026-10-01T03:00:00Z')),'2026-09-30');
  assert.equal(todayBogota(new Date('2026-10-01T05:00:00Z')),'2026-10-01');
});
test('pesos enteros: formato colombiano, ceros, decimales y límites', () => {
  assert.equal(parseAmount('123.456'),123456); assert.equal(parseAmount(' 5000 '),5000);
  for (const value of ['0','-2','1,50','1.5','1e3','50 pesos','12.34.567','1000000000000','']) assert.ok(Number.isNaN(parseAmount(value)),value);
});
test('fechas reales, años bisiestos y períodos mensuales', () => {
  assert.equal(validDate('2024-02-29'),true); assert.equal(validDate('2026-02-29'),false);
  assert.equal(validDate('2026-04-31'),false); assert.equal(validDate('2026-09-11'),true);
  assert.equal(validDate('1900-02-29'),false); assert.equal(validDate('2000-02-29'),true);
  assert.deepEqual(monthRange('2026-12'),{start:'2026-12-01',end:'2026-12-31'});
  assert.throws(() => monthRange('2026-13'));
});
const expenses = [
  {id:'a',payer:'lali',amount:15000,category:'mercado',description:'Pan',date:'2026-09-10'},
  {id:'b',payer:'oscar',amount:25000,category:'mercado',description:'Frutas',date:'2026-09-11'},
  {id:'c',payer:'oscar',amount:10000,category:'transporte',description:'Bus',date:'2026-09-09'}
];
test('resúmenes y filtros independientes por persona y categoría', () => {
  const summary = summarize(expenses);
  assert.equal(summary.total,50000); assert.equal(summary.people.lali,15000); assert.equal(summary.people.oscar,35000);
  assert.equal(summary.categories.mercado,40000); assert.equal(summary.categories.transporte,10000);
  assert.equal(filterExpenses(expenses,'oscar','mercado').length,1); assert.equal(summarize([]).total,0);
  assert.deepEqual(sortExpenses(expenses).map(e => e.id),['b','a','c']);
});
test('validación de los campos y descripciones largas o vacías', () => {
  assert.deepEqual(validateExpense(expenses[0]),{});
  assert.ok(validateExpense({...expenses[0],description:'   '}).description);
  assert.ok(validateExpense({...expenses[0],description:'x'.repeat(201)}).description);
  assert.ok(validateExpense({...expenses[0],payer:'tercero',category:'no',amount:1.5}).payer);
});
test('el acceso requiere exactamente un identificador de 256 bits en hexadecimal', () => {
  const token = 'a'.repeat(64);
  assert.equal(accessFromHash(`#acceso=${token}`),token);
  for (const hash of ['', '#acceso=corto', `#acceso=${token}&acceso=${token}`, `#acceso=${'z'.repeat(64)}`]) assert.equal(accessFromHash(hash),null);
});
