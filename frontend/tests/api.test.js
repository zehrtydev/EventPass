import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, authRequest, catalogoRequest, checkinRequest, inscripcionesRequest, request, requireList, requireObject, telegramStatusRequest, usuariosRequest, vinculacionRequest } from '../src/services/api.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('El estado de Telegram consulta el endpoint de lectura con la sesión', async () => {
  for (const vinculado of [true, false]) {
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith('/webhook/eventpass/vinculacion/estado'));
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), { session_token: 'test-only-token' });
      return Response.json({ ok: true, canal: 'TELEGRAM', vinculado });
    };
    assert.equal((await telegramStatusRequest({ token: 'test-only-token' })).vinculado, vinculado);
  }
});

test('Un estado ausente o inválido de Telegram no se interpreta como cuenta sin vincular', async () => {
  for (const vinculado of [undefined, null, 'false', 0]) {
    globalThis.fetch = async () => Response.json({ ok: true, vinculado });
    await assert.rejects(telegramStatusRequest({ token: 'test-only-token' }), /confirmar el estado/);
  }
});

test('Los cinco clientes envían POST exclusivamente a los endpoints de n8n', async () => {
  const clients = [[usuariosRequest, 'usuarios'], [authRequest, 'auth'], [catalogoRequest, 'catalogo'], [vinculacionRequest, 'vinculacion/codigo'], [inscripcionesRequest, 'inscripciones']];
  for (const [client, endpoint] of clients) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, `https://manuamado.app.n8n.cloud/webhook/eventpass/${endpoint}`);
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

test('Check-in envía los identificadores y devuelve el comprobante confirmado', async () => {
  const payload = { inscripcion_id: 'ins_test', evento_id: 'evt_test' };
  const receipt = { ok: true, resultado: 'EXITOSO', ...payload, checkin_id: 'chk_test', fecha_checkin: '2026-10-09T19:00:00Z' };
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/webhook/eventpass/checkin'));
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { ...payload, session_token: 'test-only-token' });
    return Response.json(receipt);
  };
  assert.deepEqual(await checkinRequest(payload, { token: 'test-only-token' }), receipt);
});

test('Check-in conserva los resultados de duplicado y rechazo sin reintentos', async () => {
  for (const [status, resultado] of [[409, 'DUPLICADO'], [400, 'RECHAZADO']]) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return Response.json({ ok: false, resultado, mensaje: 'Mensaje del check-in' }, { status });
    };
    await assert.rejects(checkinRequest({}), error => error.status === status && error.resultado === resultado && error.message === 'Mensaje del check-in');
    assert.equal(calls, 1);
  }
});

test('Check-in no confirma respuestas incompletas o de otra inscripción', async () => {
  const payload = { inscripcion_id: 'ins_test', evento_id: 'evt_test' };
  const receipt = { ok: true, resultado: 'EXITOSO', ...payload, checkin_id: 'chk_test', fecha_checkin: '2026-10-09T19:00:00Z' };
  for (const invalid of [{ resultado: 'RECHAZADO' }, { checkin_id: '' }, { checkin_id: {} }, { fecha_checkin: '' }, { fecha_checkin: 'invalid' }, { inscripcion_id: 'otra' }, { evento_id: 'otro' }]) {
    globalThis.fetch = async () => Response.json({ ...receipt, ...invalid });
    await assert.rejects(checkinRequest(payload), /Consulta el estado/);
  }
});
