// @vitest-environment happy-dom
import assert from 'node:assert/strict';
import { beforeEach, test } from 'vitest';
import { CONFIG } from '@/config/Configuracion';
import { Aplicacion } from '@/ui/app/Aplicacion';

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  assert.ok(el, `falta #${id}`);
  return el;
};
const pulsar = (id: string): void => {
  $(id).click();
};
const escribir = (id: string, valor: string): void => {
  const el = $(id);
  assert.ok(el instanceof HTMLInputElement);
  el.value = valor;
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  new Aplicacion($('app')).iniciar();
});

test('Monta la página: cabecera, tres escenarios y resultados para cada cuenta', () => {
  assert.equal(document.querySelector('h1')?.textContent, 'Simulador de ahorro y apalancamiento');
  assert.equal(
    [...document.querySelectorAll('.escenario-letra')].map((e) => e.textContent).join(''),
    'ABC',
  );
  assert.equal(document.querySelectorAll('.matriz-fila').length, 3);
  assert.equal(
    document.querySelectorAll('.matriz-fila:first-child .resultado-card').length,
    CONFIG.cuentas.lista.length,
  );
  assert.equal($('accountList').querySelectorAll('.cuenta-tarjeta').length, 2);
});

test('Las aportaciones puntuales empiezan plegadas y su contenido no es enfocable', () => {
  const boton = $('toggleOneshots');
  assert.equal(boton.getAttribute('aria-expanded'), 'false');
  assert.equal($('oneshotPanel').firstElementChild instanceof HTMLElement, true);
  assert.equal(($('oneshotPanel').firstElementChild as HTMLElement).inert, true);
  boton.click();
  assert.equal(boton.getAttribute('aria-expanded'), 'true');
  assert.equal(($('oneshotPanel').firstElementChild as HTMLElement).inert, false);
});

test('Rango de puntuales: cada 3 meses hasta el 10, y un importe 0 borra el mes', () => {
  pulsar('toggleOneshots');
  escribir('oneshotAmount', String(CONFIG.puntual.max + 999));
  assert.equal(($('oneshotAmount') as HTMLInputElement).value, String(CONFIG.puntual.max));
  escribir('oneshotAmount', '200');
  ($('oneshotEvery') as HTMLInputElement).value = '3';
  ($('oneshotTo') as HTMLSelectElement).value = '10';
  pulsar('oneshotSet');
  assert.equal($('oneshotMonths').textContent, '4');
  assert.match($('oneshotTotal').textContent, /800,00/);
  escribir('oneshotAmount', '0');
  ($('oneshotTo') as HTMLSelectElement).value = '1';
  pulsar('oneshotSet');
  assert.equal($('oneshotMonths').textContent, '3');
});

test('Detalle: siempre queda al menos un escenario activo', () => {
  const activos = (): string =>
    [...document.querySelectorAll('#detailEsc .active')]
      .map((b) => (b as HTMLElement).dataset.e)
      .join();
  const boton = (e: string): HTMLElement => {
    const el = document.querySelector<HTMLElement>(`#detailEsc [data-e="${e}"]`);
    assert.ok(el);
    return el;
  };
  assert.equal(activos(), 'A,B,C');
  boton('A').click();
  boton('C').click();
  assert.equal(activos(), 'B');
  boton('B').click();
  assert.equal(activos(), 'B');
  assert.equal(boton('B').getAttribute('aria-disabled'), 'true');
});

test('Panel contraído: la franja resume la configuración', () => {
  pulsar('toggleControls');
  assert.ok(document.querySelector('.disposicion')?.classList.contains('contraido'));
  const items = [...$('strip').querySelectorAll('.franja-item')].map((e) => e.textContent);
  assert.ok(items.length >= 9);
  assert.ok(items.some((t) => t.includes('Capital') && t.includes('25')));
});

test('Un valor por encima del máximo se corrige al instante', () => {
  escribir('capital', String(CONFIG.campos.capital.max + 5));
  assert.equal(($('capital') as HTMLInputElement).value, String(CONFIG.campos.capital.max));
});

test('Restablecer pide confirmación: Cancelar conserva los datos', () => {
  escribir('capital', '1234');
  pulsar('reset');
  assert.equal($('confirmTitle').textContent, 'Restablecer configuración');
  pulsar('confirmNo');
  assert.equal(($('capital') as HTMLInputElement).value, '1234');
});

test('El modal de alta valida el nombre y el TIN', () => {
  pulsar('addAccount');
  assert.equal($('accError').textContent, 'Indica un nombre.');
  assert.equal(($('accCrear') as HTMLButtonElement).disabled, true);
  ($('accNombre') as HTMLInputElement).value = 'Nueva';
  $('accNombre').dispatchEvent(new Event('input', { bubbles: true }));
  assert.equal($('accError').textContent, '');
  assert.equal(($('accCrear') as HTMLButtonElement).disabled, false);
});
