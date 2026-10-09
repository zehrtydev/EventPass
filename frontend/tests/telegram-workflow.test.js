import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const workflow = JSON.parse(readFileSync(new URL('../../n8n/WF03_vinculacion_telegram.json', import.meta.url), 'utf8'));
const nodes = new Map(workflow.nodes.map(node => [node.name, node]));
const session = { session_id: 'ses_test', session_token: 'test-only-token', usuario_id: 'usr_test', estado: 'ACTIVA', expira_en: '2099-01-01T00:00:00Z' };
const user = { usuario_id: 'usr_test', estado: 'ACTIVO' };
const link = { usuario_id: 'usr_test', canal: 'TELEGRAM', estado: 'ACTIVA', chat_id: '123456' };

// Se ejecutan las rutas del export con lecturas de Sheets controladas y sin escrituras.
function run({ body = { session_token: session.session_token }, storedSession = session, storedUser = user, links = [], start = 'Consultar estado Telegram' } = {}) {
  let current = start;
  let items = [{ json: { body } }];
  const outputs = {};
  const visited = [];
  const context = () => ({ $json: items[0].json, $input: { all: () => items }, $: name => ({ first: () => outputs[name][0] }) });
  const evaluate = value => typeof value === 'string' && value.startsWith('={{')
    ? vm.runInNewContext(`(${value.slice(3, -2)})`, context()) : value;
  for (let step = 0; step < 30; step += 1) {
    const node = nodes.get(current);
    assert.ok(node, `Nodo desconocido: ${current}`);
    visited.push(current);
    let branch = 0;
    if (current === 'Generar código de vinculación') return { generatesCode: true, visited };
    if (node.type === 'n8n-nodes-base.code') {
      items = vm.runInNewContext(`(function() { ${node.parameters.jsCode} })()`, context());
    } else if (node.type === 'n8n-nodes-base.googleSheets') {
      assert.equal(node.parameters.operation ?? 'read', 'read');
      assert.equal(node.alwaysOutputData, true);
      const filter = node.parameters.filtersUI.values[0];
      const value = evaluate(filter.lookupValue);
      const rows = current === 'Buscar sesión' ? [storedSession] : current === 'Buscar usuario de sesión' ? [storedUser] : links;
      items = rows.filter(row => row[filter.lookupColumn] === value).map(json => ({ json }));
      if (!items.length) items = [{ json: {} }];
    } else if (node.type === 'n8n-nodes-base.if') {
      branch = evaluate(node.parameters.conditions.conditions[0].leftValue) === true ? 0 : 1;
    } else if (node.type === 'n8n-nodes-base.respondToWebhook') {
      const response = evaluate(node.parameters.responseBody);
      return { status: node.parameters.options.responseCode, body: typeof response === 'string' ? JSON.parse(response) : response, visited };
    }
    outputs[current] = items;
    current = workflow.connections[current]?.main[branch]?.[0]?.node;
  }
  throw new Error('La consulta no produjo respuesta');
}

test('WF03 consulta la vinculación activa de Telegram sin generar códigos ni exponer datos privados', () => {
  const result = run({ links: [link] });
  assert.equal(result.status, 200);
  assert.equal(JSON.stringify(result.body), JSON.stringify({ ok: true, canal: 'TELEGRAM', vinculado: true }));
  assert.equal(result.visited.includes('Generar código de vinculación'), false);
  assert.equal(nodes.get('Consultar estado Telegram').parameters.path, 'eventpass/vinculacion/estado');
  assert.equal(nodes.get('Buscar vinculaciones de usuario').parameters.options.returnFirstMatch, false);
});

test('WF03 distingue ausencia, WhatsApp, vinculaciones inactivas y cuentas ajenas', () => {
  for (const links of [[], [{ ...link, canal: 'WHATSAPP' }], [{ ...link, estado: 'INACTIVA' }], [{ ...link, usuario_id: 'usr_other' }], [{ ...link, chat_id: '' }]]) {
    assert.equal(run({ links }).body.vinculado, false);
  }
  assert.equal(run({ links: [{ ...link, estado: 'INACTIVA' }, { ...link, canal: 'WHATSAPP' }, link] }).body.vinculado, true);
});

test('WF03 usa el usuario de la sesión e ignora un usuario_id suministrado por el cliente', () => {
  const result = run({ body: { session_token: session.session_token, usuario_id: 'usr_other' }, links: [{ ...link, usuario_id: 'usr_other' }] });
  assert.equal(result.body.vinculado, false);
});

test('WF03 rechaza sesiones ausentes, expiradas, cerradas y usuarios inactivos antes de consultar vinculaciones', () => {
  for (const input of [{ body: {} }, { body: { session_token: 'invalid' } }, { storedSession: { ...session, expira_en: '2000-01-01' } }, { storedSession: { ...session, estado: 'CERRADA' } }, { storedUser: { ...user, estado: 'INACTIVO' } }]) {
    const result = run(input);
    assert.ok([401, 403].includes(result.status));
    assert.equal(result.visited.includes('Buscar vinculaciones de usuario'), false);
  }
});

test('WF03 conserva la ruta existente de generación de códigos', () => {
  const result = run({ start: 'Solicitar código de vinculación' });
  assert.equal(result.generatesCode, true);
  assert.equal(result.visited.includes('Buscar vinculaciones de usuario'), false);
});
