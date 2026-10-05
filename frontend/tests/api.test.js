import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, authRequest, catalogoRequest, inscripcionesRequest, request, requireList, requireObject, usuariosRequest, vinculacionRequest } from '../src/services/api.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('Los cinco clientes envían POST exclusivamente a los endpoints de n8n', async () => {
  const clients = [[usuariosRequest, 'usuarios'], [authRequest, 'auth'], [catalogoRequest, 'catalogo'], [vinculacionRequest, 'vinculacion/codigo'], [inscripcionesRequest, 'inscripciones']];
  for (const [client, endpoint] of clients) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, `https://zehrty.app.n8n.cloud/webhook/eventpass/${endpoint}`);
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['Content-Type'], 'application/json');
      assert.equal(options.redirect, 'error');
      assert.equal(options.credentials, 'omit');
      assert.deepEqual(JSON.parse(options.body), { action: 'TEST', session_token: 'test-only-token' });
      return Response.json({ ok: true });
    };
    assert.deepEqual(await client({ action: 'TEST' }, { token: 'test-only-token' }), { ok: true });
  }
});

test('El catálogo público no envía credenciales de sesión', async () => {
  globalThis.fetch = async (url, options) => {
    assert.deepEqual(JSON.parse(options.body), { action: 'LISTADO' });
    assert.equal(options.headers.Authorization, undefined);
    return Response.json({ ok: true, eventos: [] });
  };
  assert.deepEqual(await catalogoRequest({ action: 'LISTADO' }), { ok: true, eventos: [] });
});

test('Conserva el mensaje de n8n y el estado HTTP', async () => {
  globalThis.fetch = async () => Response.json({ ok: false, error: 'Ya existe una inscripción activa' }, { status: 409 });
  await assert.rejects(inscripcionesRequest({ action: 'CREATE' }), error => error instanceof ApiError && error.status === 409 && error.message === 'Ya existe una inscripción activa');
});

test('Rechaza errores de negocio incluso cuando HTTP devuelve 200', async () => {
  globalThis.fetch = async () => Response.json({ ok: false, mensaje: 'Sesión inválida' });
  await assert.rejects(authRequest({ action: 'validate' }), /Sesión inválida/);
});

test('No interpreta una respuesta vacía o HTML como una operación exitosa', async () => {
  for (const body of ['', '<html>Error del servidor</html>']) {
    globalThis.fetch = async () => new Response(body);
    await assert.rejects(request('usuarios'), /no pudimos interpretar/);
  }
});

test('No interpreta formatos inesperados o sin confirmación como éxito', async () => {
  for (const body of [null, [], 'ok', {}, { message: 'Workflow was started' }]) {
    globalThis.fetch = async () => Response.json(body);
    await assert.rejects(request('usuarios'), ApiError);
  }
});

test('Los errores de red son comprensibles y no exponen contenido técnico', async () => {
  globalThis.fetch = async () => { throw new TypeError('network internal detail'); };
  await assert.rejects(request('catalogo'), /No pudimos conectar con EventPass/);
});

test('El timeout advierte que no se repita una escritura sin comprobar su estado', async () => {
  globalThis.fetch = (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  });
  await assert.rejects(request('inscripciones', {}, { timeout: 5 }), /consulta su estado antes de repetirla/);
});

test('Una cancelación externa conserva el error de aborto', async () => {
  const controller = new AbortController();
  globalThis.fetch = (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  });
  const result = request('catalogo', {}, { signal: controller.signal });
  controller.abort();
  await assert.rejects(result, { name: 'AbortError' });
});

test('El contrato de listado distingue vacío válido de respuesta rota', () => {
  assert.deepEqual(requireList({ eventos: [] }, 'eventos'), []);
  assert.throws(() => requireList({}, 'eventos'), ApiError);
  assert.throws(() => requireList({ eventos: {} }, 'eventos'), ApiError);
});

test('El contrato de detalle y perfil exige un objeto', () => {
  assert.deepEqual(requireObject({ evento: { nombre: 'Evento de prueba' } }, 'evento'), { nombre: 'Evento de prueba' });
  for (const value of [null, undefined, 'evento', []]) assert.throws(() => requireObject({ evento: value }, 'evento'), ApiError);
});
