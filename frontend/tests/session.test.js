import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSession, readSession, sessionKey, writeSession } from '../src/services/session.js';
import { categoryStyle, formatDate, safeImageUrl } from '../src/services/presentation.js';

const fixture = {
  ok: true,
  session: { session_token: 'test-only-token', session_id: 'ses_test', expira_en: '2026-11-15T20:00:00Z' },
  usuario: { usuario_id: 'usr_test', nombre: 'Persona de prueba', email: 'test@example.invalid', password: 'must-not-persist', password_hash: 'must-not-persist' },
};
afterEach(() => { delete globalThis.localStorage; });

test('Normaliza el contrato real del login y excluye credenciales', () => {
  const value = normalizeSession(fixture);
  assert.equal(value.session_token, fixture.session.session_token);
  assert.equal(value.usuario_id, fixture.usuario.usuario_id);
  assert.equal(value.nombre, fixture.usuario.nombre);
  assert.deepEqual(Object.keys(value).sort(), ['email', 'expira_en', 'nombre', 'session_id', 'session_token', 'usuario_id']);
  assert.ok(!JSON.stringify(value).includes('must-not-persist'));
});

test('Validar sesión conserva el token que WF02 no vuelve a entregar', () => {
  const previous = normalizeSession(fixture);
  const value = normalizeSession({ session: { session_id: 'ses_test' }, usuario: { usuario_id: 'usr_test', nombre: 'Nombre actualizado' } }, previous);
  assert.equal(value.session_token, previous.session_token);
  assert.equal(value.nombre, 'Nombre actualizado');
});

test('Rechaza un login incompleto', () => {
  assert.throws(() => normalizeSession({ usuario: fixture.usuario }));
  assert.throws(() => normalizeSession({ session: fixture.session }));
});

test('Persistencia mínima y limpieza de sesión', () => {
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const value = { ...normalizeSession(fixture), password: 'never-save-this' };
  writeSession(value);
  assert.ok(!storage.get(sessionKey).includes('never-save-this'));
  assert.equal(readSession().usuario_id, 'usr_test');
  writeSession(null);
  assert.equal(readSession(), null);
});

test('El almacenamiento corrupto o bloqueado no rompe la aplicación', () => {
  globalThis.localStorage = { getItem: () => '{not json}', setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
  assert.equal(readSession(), null);
  assert.doesNotThrow(() => writeSession(normalizeSession(fixture)));
  assert.doesNotThrow(() => writeSession(null));
});

test('Las fechas sin hora mantienen el día del evento', () => {
  const output = formatDate('2026-10-06');
  assert.match(output, /6/);
  assert.match(output, /2026/);
  assert.equal(formatDate(null), 'Por confirmar');
  assert.equal(formatDate('Por definir'), 'Por definir');
});

test('Solo acepta imágenes HTTPS, sin protocolos ejecutables', () => {
  assert.equal(safeImageUrl('https://example.com/event.webp'), 'https://example.com/event.webp');
  for (const url of ['javascript:alert(1)', 'http://example.com/image', 'data:image/svg+xml,test', '/image.png', '']) assert.equal(safeImageUrl(url), null);
});

test('Las nuevas categorías se muestran sin inventar eventos', () => {
  assert.equal(categoryStyle('NUEVA_CATEGORIA').label, 'NUEVA CATEGORIA');
  assert.equal(categoryStyle('CIENCIA_FICCION').label, 'Ciencia ficción');
});
