import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Playwright es una herramienta externa opcional; no forma parte del bundle.
const modulePath = process.env.PLAYWRIGHT_MODULE_PATH;
if (!modulePath) throw new Error('Define PLAYWRIGHT_MODULE_PATH con la ruta al index.mjs de Playwright.');
const { chromium } = await import(pathToFileURL(modulePath));
const base = process.env.EVENTPASS_TEST_URL || 'http://localhost:5173';
const output = process.env.EVENTPASS_TEST_OUTPUT || '/tmp/eventpass-browser-results';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const results = [];
const ok = name => { results.push(name); console.log(`OK ${name}`); };

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const events = [
    { evento_id: 'evt_test_anime', nombre: 'Evento de prueba Anime', categoria: 'ANIME', descripcion: 'Descripción controlada para validar el frontend.', fecha: '2026-11-15', hora: '13:00', lugar: 'Auditorio de prueba', capacidad: 10, cupos_disponibles: 3, disponible: true, organizador: 'Organización de prueba', imagen_url: '' },
    { evento_id: 'evt_test_gaming', nombre: 'Evento de prueba Gaming', categoria: 'GAMING', descripcion: 'Evento lleno para probar lista de espera.', fecha: '2026-11-16', hora: '17:00', lugar: 'Zona de prueba', capacidad: 2, cupos_disponibles: 0, disponible: false, organizador: 'Organización de prueba', imagen_url: '' },
  ];
  let user = { usuario_id: 'usr_test', nombre: 'Persona de prueba', email: 'test@example.invalid', estado: 'ACTIVO' };
  const session = { session_token: 'browser-test-token', session_id: 'ses_test', expira_en: '2026-11-30T20:00:00Z' };
  let registrations = [];
  let linked = false;
  let expired = false;
  let catalogError = false;
  let catalogEmpty = false;
  let validationNetworkError = false;
  const actions = [];
  await page.route('**/webhook/eventpass/**', async route => {
    const endpoint = new URL(route.request().url()).pathname.split('/eventpass/')[1];
    const body = route.request().postDataJSON();
    actions.push({ endpoint, ...body });
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (endpoint === 'catalogo') {
      if (catalogError) return reply({ ok: false, error: 'Catálogo de prueba temporalmente no disponible' }, 503);
      if (body.action === 'LISTADO') return reply({ ok: true, eventos: catalogEmpty ? [] : events });
      if (body.action === 'FILTRO') return reply({ ok: true, eventos: events.filter(event => event.categoria === body.categoria) });
      const event = events.find(event => event.evento_id === body.evento_id);
      if (!event) return reply({ ok: false, error: 'Evento no encontrado' }, 404);
      return reply(body.action === 'DETALLE' ? { ok: true, evento: event } : { ok: true, ...event });
    }
    if (endpoint === 'auth') {
      if (body.action === 'login') {
        if (body.password !== 'test-password') return reply({ ok: false, error: 'Email o contraseña incorrectos' }, 401);
        expired = false;
        return reply({ ok: true, session, usuario: user });
      }
      if (body.action === 'validate' && validationNetworkError) return route.abort('failed');
      if (expired) return reply({ ok: false, error: 'Sesión inválida o expirada' }, 401);
      if (body.action === 'validate') return reply({ ok: true, valid: true, session: { session_id: session.session_id, expira_en: session.expira_en }, usuario: user });
      return reply({ ok: true, message: 'Sesión cerrada' });
    }
    if (endpoint === 'usuarios') {
      if (body.action === 'create') return reply({ ok: true, usuario: user }, 201);
      if (body.action === 'update') user = { ...user, nombre: body.nombre, email: body.email };
      if (body.action === 'deactivate') return reply({ ok: true, message: 'Cuenta desactivada' });
      return reply({ ok: true, usuario: user });
    }
    if (endpoint === 'vinculacion/codigo') return reply({ ok: true, codigo: 'TEST42', expira_en: '2026-11-15T20:00:00Z', message: 'Código generado' });
    if (endpoint === 'inscripciones') {
      if (expired) return reply({ ok: false, error: 'Sesión inválida o expirada' }, 401);
      if (body.action === 'LIST') return reply({ ok: true, inscripciones: registrations });
      if (body.action === 'CREATE') {
        if (!linked) return reply({ ok: false, error: 'Debes vincular una cuenta de Telegram antes de inscribirte' }, 403);
        const item = { inscripcion_id: `ins_test_${registrations.length}`, evento_id: body.evento_id, nombre_acreditacion: body.nombre_acreditacion, observaciones: body.observaciones, fecha_inscripcion: '2026-10-04T20:00:00Z', estado: body.evento_id === 'evt_test_gaming' ? 'LISTA_ESPERA' : 'CONFIRMADA', orden_espera: body.evento_id === 'evt_test_gaming' ? 1 : null };
        registrations.push(item);
        return reply({ ok: true, inscripcion: item, mensaje: 'Inscripción recibida' }, 201);
      }
      const item = registrations.find(item => item.inscripcion_id === body.inscripcion_id);
      if (body.action === 'UPDATE') Object.assign(item, { nombre_acreditacion: body.nombre_acreditacion, observaciones: body.observaciones });
      if (body.action === 'CANCEL') item.estado = 'CANCELADA';
      return reply({ ok: true, inscripcion: item, mensaje: 'Inscripción actualizada' });
    }
    throw new Error(`Endpoint inesperado: ${endpoint}`);
  });

  await page.goto(base);
  await page.locator('.event-card').nth(1).waitFor();
  await page.getByRole('button', { name: 'Gaming', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.event-card').length === 1);
  assert.ok(actions.some(action => action.action === 'FILTRO' && action.categoria === 'GAMING'));
  await page.getByRole('button', { name: 'Todas', exact: true }).click();
  await page.getByRole('textbox', { name: 'Buscar eventos, lugares o temáticas' }).fill('no existe');
  await page.getByRole('button', { name: 'Buscar eventos', exact: true }).click();
  await page.getByRole('heading', { name: 'Todavía no hay eventos por aquí' }).waitFor();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await page.getByLabel('Filtrar por fecha').selectOption('2026-11-15');
  assert.equal(await page.locator('.event-card').count(), 1);
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  ok('Catálogo, categoría por HTTP, búsqueda vacía y filtro de fecha');

  for (const width of [1440, 1024, 768, 390, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Desbordamiento en ${width}px`);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Eventos', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Abrir menú' }).getAttribute('aria-expanded'), 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
  ok('Responsive en seis tamaños, menú móvil y movimiento reducido');

  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const path of ['/cuenta', '/inscripciones', '/vinculacion']) {
    await page.goto(base + path);
    await page.waitForURL('**/login');
  }
  ok('Las tres rutas protegidas redirigen al login');

  await page.goto(base + '/registro');
  await page.getByLabel('Nombre', { exact: true }).fill('Persona de prueba');
  await page.getByLabel('Correo electrónico').fill('test@example.invalid');
  await page.getByLabel('Contraseña', { exact: true }).fill('test-password');
  await page.getByLabel('Confirmar contraseña').fill('does-not-match');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  assert.equal(actions.filter(action => action.endpoint === 'usuarios' && action.action === 'create').length, 0);
  await page.getByLabel('Confirmar contraseña').fill('test-password');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await page.waitForURL('**/login');
  await page.getByText('Cuenta creada correctamente. Ya puedes iniciar sesión.').waitFor();
  ok('Registro, confirmación de contraseña y redirección al login');

  const login = async (destination = '/cuenta') => {
    await page.getByLabel('Correo electrónico').fill('test@example.invalid');
    await page.getByLabel('Contraseña', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await page.waitForURL('**' + destination);
  };
  await page.getByLabel('Correo electrónico').fill('test@example.invalid');
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Email o contraseña incorrectos' }).waitFor();
  await login();
  await page.getByLabel('Nombre', { exact: true }).waitFor();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('eventpass.session')));
  assert.equal(stored.session_token, session.session_token);
  assert.equal(stored.password, undefined);
  await page.reload();
  await page.getByLabel('Nombre', { exact: true }).waitFor();
  assert.ok(actions.some(action => action.action === 'validate'));
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('eventpass.session')).session_token), session.session_token);
  ok('Login erróneo y correcto, persistencia mínima y validación tras recarga');

  validationNetworkError = true;
  await page.reload();
  await page.getByRole('heading', { name: 'No pudimos validar tu sesión' }).waitFor();
  assert.ok(await page.evaluate(() => localStorage.getItem('eventpass.session')));
  validationNetworkError = false;
  await page.getByRole('button', { name: 'Volver a intentar' }).click();
  await page.getByLabel('Nombre', { exact: true }).waitFor();
  ok('Fallo de red al validar conserva sesión y permite reintentar');

  await page.getByLabel('Nombre', { exact: true }).fill('Nombre actualizado');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await page.getByText('Tu perfil se actualizó correctamente.').waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('eventpass.session')).nombre), 'Nombre actualizado');
  ok('Actualización del perfil sincroniza los datos de sesión');

  await page.goto(base + '/eventos/evt_test_anime');
  await page.getByRole('button', { name: 'Consultar disponibilidad' }).click();
  await page.getByText('Disponibilidad actualizada.').waitFor();
  await page.getByRole('button', { name: 'Inscribirme', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar inscripción' }).click();
  await page.getByRole('alert').filter({ hasText: 'Debes vincular una cuenta de Telegram' }).waitFor();
  assert.ok(await page.evaluate(() => localStorage.getItem('eventpass.session')));
  ok('Disponibilidad real del contrato y 403 Telegram sin cerrar sesión');

  await page.goto(base + '/vinculacion');
  await page.getByRole('button', { name: 'Generar código de vinculación' }).click();
  await page.locator('.generated-code strong').filter({ hasText: 'TEST42' }).waitFor();
  assert.equal(await page.locator('.command code').textContent(), '/vincular TEST42');
  linked = true;
  ok('Generación y presentación del código Telegram sin simular vinculación');

  for (const [id, state] of [['evt_test_anime', 'CONFIRMADA'], ['evt_test_gaming', 'LISTA_ESPERA']]) {
    await page.goto(base + '/eventos/' + id);
    await page.getByRole('button', { name: 'Inscribirme', exact: true }).click();
    await page.getByLabel('Nombre de acreditación').fill('Acreditación de prueba');
    await page.getByLabel('Observaciones').fill('Observación de prueba');
    await page.getByRole('button', { name: 'Confirmar inscripción' }).click();
    await page.getByRole('link', { name: 'Ver mis inscripciones' }).waitFor();
    assert.equal(registrations.at(-1).estado, state);
  }
  ok('Inscripción confirmada y lista de espera');

  await page.goto(base + '/inscripciones');
  await page.getByRole('button', { name: 'Editar acreditación' }).first().click();
  await page.getByRole('dialog').getByLabel('Nombre de acreditación').fill('Acreditación editada');
  await page.getByRole('dialog').getByLabel('Observaciones').fill('');
  let lists = actions.filter(action => action.endpoint === 'inscripciones' && action.action === 'LIST').length;
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar cambios' }).click();
  await page.getByText('Acreditación editada', { exact: true }).waitFor();
  assert.ok(actions.filter(action => action.endpoint === 'inscripciones' && action.action === 'LIST').length > lists);
  assert.equal(registrations[0].observaciones, '');
  await page.getByRole('button', { name: 'Cancelar inscripción', exact: true }).first().click();
  await page.keyboard.press('Escape');
  assert.equal(actions.filter(action => action.action === 'CANCEL').length, 0);
  await page.getByRole('button', { name: 'Cancelar inscripción', exact: true }).first().click();
  lists = actions.filter(action => action.endpoint === 'inscripciones' && action.action === 'LIST').length;
  await page.getByRole('button', { name: 'Sí, cancelar inscripción' }).click();
  await page.locator('.registration-card .status.cancelled').waitFor();
  assert.ok(actions.filter(action => action.endpoint === 'inscripciones' && action.action === 'LIST').length > lists);
  assert.equal(registrations.length, 2);
  ok('Editar, vaciar observaciones, confirmar cancelación y volver a consultar LIST');

  for (const path of ['/cuenta', '/inscripciones', '/vinculacion', '/eventos/evt_test_anime', '/asistente']) {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(base + path);
    await page.locator('h1').waitFor();
    await page.locator('.loading').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Desbordamiento en ${path}`);
  }
  ok('Todas las pantallas privadas y de detalle sin desbordamiento móvil');
  const assistant = page.getByRole('link', { name: 'Abrir EventPass Assistant' });
  assert.equal(await assistant.getAttribute('target'), '_blank');
  assert.ok((await assistant.getAttribute('rel')).includes('noopener'));
  assert.equal(await page.locator('iframe').count(), 0);
  ok('El Assistant abre el Hosted Chat existente en otra pestaña');

  await page.setViewportSize({ width: 1440, height: 1000 });
  expired = true;
  await page.goto(base + '/inscripciones');
  await page.waitForURL('**/login');
  assert.equal(await page.evaluate(() => localStorage.getItem('eventpass.session')), null);
  expired = false;
  await page.goto(base + '/login');
  await login('/inscripciones');
  await page.goto(base + '/cuenta');
  await page.getByRole('button', { name: 'Desactivar mi cuenta' }).click();
  assert.equal(await page.getByRole('dialog').getByRole('button', { name: 'Desactivar cuenta', exact: true }).isEnabled(), false);
  await page.getByLabel('Escribe DESACTIVAR para confirmar').fill('DESACTIVAR');
  await page.getByRole('dialog').getByRole('button', { name: 'Desactivar cuenta', exact: true }).click();
  await page.waitForURL('**/login');
  await page.getByText('Tu cuenta quedó desactivada y cerramos la sesión.').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('eventpass.session')), null);
  assert.ok(actions.some(action => action.action === 'logout'));
  ok('Sesión expirada, desactivación confirmada y cierre de sesión');

  catalogError = true;
  await page.goto(base);
  await page.getByRole('alert').filter({ hasText: 'Catálogo de prueba temporalmente no disponible' }).waitFor();
  catalogError = false;
  await page.getByRole('button', { name: 'Volver a intentar' }).click();
  await page.locator('.event-card').first().waitFor();
  catalogEmpty = true;
  await page.reload();
  await page.getByRole('heading', { name: 'Todavía no hay eventos por aquí' }).waitFor();
  await page.goto(base + '/ruta-inexistente');
  await page.getByRole('heading', { name: 'Este universo aún no existe' }).waitFor();
  ok('Error y reintento del catálogo, estado vacío y 404');
  assert.deepEqual(errors, []);
  ok('Sin excepciones JavaScript durante los flujos');
  console.log(`${results.length} grupos de comprobaciones completados con respuestas controladas. No se escribieron datos reales.`);
} finally {
  await browser.close();
}
