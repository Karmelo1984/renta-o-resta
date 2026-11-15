import assert from 'node:assert/strict';
import { afterEach, beforeEach, test, vi } from 'vitest';
import { Logger } from '@/core/log/Logger';
import type { NivelLog } from '@/core/log/NivelLog';

let previo: NivelLog;
beforeEach(() => {
  previo = Logger.obtenerNivel();
});
afterEach(() => {
  Logger.establecerNivel(previo);
  vi.restoreAllMocks();
});

test('Nivel debug: registra debug y superiores con el ámbito delante', () => {
  Logger.establecerNivel('debug');
  const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const log = new Logger('prueba');
  log.debug('traza', { k: 1 });
  log.warn('aviso');
  assert.deepEqual(debug.mock.calls[0], ['[prueba] traza', { k: 1 }]);
  assert.deepEqual(warn.mock.calls[0], ['[prueba] aviso']);
});

test('Nivel warn (producción): descarta debug e info, conserva warn y error', () => {
  Logger.establecerNivel('warn');
  const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const log = new Logger('prueba');
  log.debug('a');
  log.info('b');
  log.warn('c');
  log.error('d');
  assert.equal(debug.mock.calls.length + info.mock.calls.length, 0);
  assert.equal(warn.mock.calls.length + error.mock.calls.length, 2);
});

test('Nivel silent: no escribe nada', () => {
  Logger.establecerNivel('silent');
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  new Logger('prueba').error('x');
  assert.equal(error.mock.calls.length, 0);
});
