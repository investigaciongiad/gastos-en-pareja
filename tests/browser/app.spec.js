import { test,expect } from '@playwright/test';
import { todayBogota } from '../../dist/domain.js';

const SPACE = 'a'.repeat(64); // Identificador ficticio: exclusivo del emulador demo-.
const BASE = 'http://127.0.0.1:4175/gastos-en-pareja/';
const URL = `${BASE}#acceso=${SPACE}`;
const DB = 'http://127.0.0.1:8080/v1/projects/demo-gastos-pareja/databases/(default)/documents';
async function admin(path,method='GET',body) {
  const response = await fetch(`${DB}${path}`,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body ? JSON.stringify(body) : undefined});
  if (!response.ok) throw new Error(`Emulador: ${response.status} ${await response.text()}`);
  return response.json();
}
test.beforeEach(async () => {
  const reset = await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-gastos-pareja/databases/(default)/documents',{method:'DELETE'});
  if (!reset.ok) throw new Error('No se pudo limpiar el emulador de pruebas.');
  await admin(`/espacios/${SPACE}`,'PATCH',{fields:{active:{booleanValue:true}}});
});
async function open(page) { await page.goto(URL); await expect(page.locator('#connection-label')).toHaveText('Conectados'); }
async function fill(page,{amount='25000',description='Mercado de la semana',payer='Lali Valentina',category='Mercado'}={}) {
  await page.getByRole('button',{name:payer,exact:true}).click();
  await page.getByLabel('¿Cuánto pagó?').fill(amount);
  await page.getByLabel('¿En qué gastó?').fill(description);
  await page.getByRole('button',{name:category,exact:true}).click();
}
async function seed(id,overrides={}) {
  const data = {payer:'lali',amount:25000,description:'Mercado de la semana',category:'mercado',date:todayBogota(),version:1,...overrides};
  const fields = Object.fromEntries(Object.entries(data).map(([key,value]) => [key,typeof value === 'number' ? {integerValue:String(value)} : {stringValue:value}]));
  fields.createdAt = {timestampValue:new Date().toISOString()}; fields.updatedAt = {timestampValue:new Date().toISOString()};
  await admin(`/espacios/${SPACE}/gastos/${id}`,'PATCH',{fields});
}
async function records() {
  const result = await admin(`/espacios/${SPACE}/gastos`);
  return (result.documents || []).map(d => ({id:d.name.split('/').pop(),...Object.fromEntries(Object.entries(d.fields).map(([key,value]) => [key,value.integerValue !== undefined ? Number(value.integerValue) : value.stringValue ?? value.timestampValue]))}));
}

test('registro, sincronización entre dispositivos y persistencia al reabrir',async ({page,browser}) => {
  const other = await browser.newContext(); const second = await other.newPage();
  try {
    await open(page); await open(second);
    await fill(page);
    await page.getByRole('button',{name:'Guardar gasto',exact:true}).click();
    await expect(page.locator('#toast-text')).toHaveText('Gasto guardado para los dos');
    await expect(page.locator('#amount')).toHaveValue('');
    await expect(second.locator('#quick-total')).toHaveText('$ 25.000');
    await page.reload(); await expect(page.locator('#quick-total')).toHaveText('$ 25.000');
    await expect(page.getByRole('button',{name:'Lali Valentina',exact:true})).toHaveAttribute('aria-pressed','true');
    expect((await records()).length).toBe(1);
  } finally { await other.close(); }
});

test('filtros, cambio de mes, totales por persona y categorías',async ({page}) => {
  const month = todayBogota().slice(0,7); const previous = month === '2026-01' ? '2025-12' : '2026-01';
  await seed('mercado'); await seed('bus',{payer:'oscar',category:'transporte',amount:5000,description:'Bus'});
  await seed('anterior',{date:`${previous}-10`,amount:12000,description:'Mes anterior'});
  await open(page);
  await page.getByRole('tab',{name:'Movimientos'}).click();
  await expect(page.locator('#movement-count')).toHaveText('2 gastos');
  await page.getByLabel('Quién pagó',{exact:true}).selectOption('oscar');
  await expect(page.locator('#filtered-total')).toHaveText('$ 5.000');
  await page.getByLabel('Categoría',{exact:true}).selectOption('mercado');
  await expect(page.getByText('Sin coincidencias',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Resumen',exact:true}).click();
  await expect(page.locator('#summary-total')).toHaveText('$ 30.000');
  await expect(page.locator('#category-bars')).toContainText('$ 25.000');
  await expect(page.locator('#summary-people')).toContainText('$ 5.000');
  await page.locator('#summary-month').fill(previous);
  await expect(page.locator('#summary-total')).toHaveText('$ 12.000');
  await page.getByRole('tab',{name:'Registrar',exact:true}).click();
  await expect(page.locator('#quick-total')).toHaveText('$ 30.000');
});

test('editar y eliminar con confirmación actualiza los totales',async ({page}) => {
  await seed('mercado'); await open(page);
  await page.getByRole('tab',{name:'Movimientos'}).click();
  await page.getByRole('button',{name:'Editar Mercado de la semana',exact:true}).click();
  await page.getByLabel('¿Cuánto pagó?').fill('30000');
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await expect(page.locator('#toast-text')).toHaveText('Cambios guardados para los dos');
  await expect(page.locator('#quick-total')).toHaveText('$ 30.000');
  await page.getByRole('tab',{name:'Movimientos'}).click();
  await page.getByRole('button',{name:'Eliminar Mercado de la semana',exact:true}).click();
  await page.getByRole('button',{name:'Conservar gasto'}).click();
  expect((await records()).length).toBe(1);
  await page.getByRole('button',{name:'Eliminar Mercado de la semana',exact:true}).click();
  await page.getByRole('button',{name:'Eliminar gasto',exact:true}).click();
  await expect(page.locator('#toast-text')).toHaveText('Gasto eliminado');
  await expect(page.locator('#filtered-total')).toHaveText('$ 0');
});

test('ediciones simultáneas detectan conflicto y permiten cargar la versión actual',async ({page,browser}) => {
  await seed('mercado'); const other = await browser.newContext(); const second = await other.newPage();
  try {
    await open(page); await open(second);
    for (const p of [page,second]) {
      await p.getByRole('tab',{name:'Movimientos'}).click();
      await p.getByRole('button',{name:'Editar Mercado de la semana',exact:true}).click();
    }
    await page.getByLabel('¿Cuánto pagó?').fill('31000');
    await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
    await expect(page.locator('#toast-text')).toHaveText('Cambios guardados para los dos');
    await second.getByLabel('¿Cuánto pagó?').fill('42000');
    await second.getByRole('button',{name:'Guardar cambios',exact:true}).click();
    await expect(second.locator('#form-message')).toContainText('cambió en otro dispositivo');
    expect((await records())[0].amount).toBe(31000);
    await second.getByRole('button',{name:'Cargar la versión actual'}).click();
    await expect(second.locator('#amount')).toHaveValue('31.000');
  } finally { await other.close(); }
});

test('sin internet conserva el formulario, no guarda en cola y permite reintentar',async ({page,context}) => {
  await open(page); await fill(page);
  await context.setOffline(true);
  await expect(page.locator('#save-button')).toBeDisabled();
  expect((await records()).length).toBe(0);
  await expect(page.locator('#description')).toHaveValue('Mercado de la semana');
  await context.setOffline(false);
  await expect(page.locator('#save-button')).toBeEnabled();
  expect((await records()).length).toBe(0);
  await page.getByRole('button',{name:'Guardar gasto',exact:true}).click();
  await expect(page.locator('#toast-text')).toHaveText('Gasto guardado para los dos');
  expect((await records()).length).toBe(1);
});

test('doble envío, validación y texto no interpretado como HTML',async ({page}) => {
  await open(page);
  await fill(page,{amount:'0'});
  await page.getByRole('button',{name:'Guardar gasto',exact:true}).click();
  await expect(page.locator('#error-amount')).toBeVisible();
  expect((await records()).length).toBe(0);
  await fill(page,{description:'<img src=x onerror=alert(1)>'});
  await page.locator('#expense-form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  await expect(page.locator('#toast-text')).toHaveText('Gasto guardado para los dos');
  expect((await records()).length).toBe(1);
  await page.getByRole('tab',{name:'Movimientos'}).click();
  await expect(page.locator('#expense-list')).toContainText('<img src=x onerror=alert(1)>');
  expect(await page.locator('#expense-list img').count()).toBe(0);
});

test('enlace ausente, malformado o desconocido impide el acceso',async ({page}) => {
  for (const url of [BASE,`${BASE}#acceso=incorrecto`,`${BASE}#acceso=${'b'.repeat(64)}`]) {
    await page.goto(url);
    await expect(page.locator('#notice')).toContainText('Enlace no válido');
    await expect(page.locator('#save-button')).toBeDisabled();
    await expect(page.locator('#quick-total')).toHaveText('—');
  }
});

test('el diseño cabe en el celular y en escritorio con datos largos',async ({page},testInfo) => {
  await seed('largo',{description:'Un concepto largo para comprobar el espacio disponible en la pantalla del celular y la distribución del texto sin desplazamiento horizontal',amount:999999999999});
  await open(page);
  for (const width of [320,390,1280]) {
    await page.setViewportSize({width,height:900});
    for (const name of ['Registrar','Movimientos','Resumen']) {
      await page.getByRole('tab',{name,exact:true}).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),`${name}, ${width}px`).toBe(true);
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('tab',{name:'Registrar',exact:true}).click();
  await page.screenshot({path:testInfo.outputPath('registro-mobile.png'),fullPage:true,animations:'disabled'});
});
