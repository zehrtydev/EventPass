import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const workflow = JSON.parse(readFileSync(new URL('../../n8n/WF11_checkin_digital.json', import.meta.url), 'utf8'));
const nodes = new Map(workflow.nodes.map(node => [node.name, node]));

// Ejecuta las decisiones y el código exportado; las lecturas y escrituras de Sheets son dobles locales.
function runWorkflow({ body, registration = {}, event = {}, previous = {} }) {
  const output = {};
  const writes = [];
  let current = 'Webhook';
  let data = { body };
  const evaluate = expression => vm.runInNewContext(`(${expression.slice(3, -2)})`, {
    $json: data,
    $: name => ({ first: () => ({ json: output[name] }) }),
  });
  for (let step = 0; step < 40; step += 1) {
    const node = nodes.get(current);
    assert.ok(node, `Nodo inexistente: ${current}`);
    let branch = 0;
    if (node.type === 'n8n-nodes-base.code') {
      data = vm.runInNewContext(`(function() { ${node.parameters.jsCode} })()`, {
        $json: data,
        $: name => ({ first: () => ({ json: output[name] }) }),
      })[0].json;
    } else if (node.type === 'n8n-nodes-base.if') {
      const condition = node.parameters.conditions.conditions[0];
      const left = evaluate(condition.leftValue);
      const right = condition.rightValue.startsWith('={{') ? evaluate(condition.rightValue) : condition.rightValue;
      const passed = condition.operator.operation === 'true' ? left === true : left === right;
      branch = passed ? 0 : 1;
    } else if (node.type === 'n8n-nodes-base.googleSheets') {
      if (current === 'Buscar inscripción') data = registration;
      else if (current === 'Buscar evento') data = event;
      else if (current === 'Buscar check-in previo') data = previous;
      else writes.push(current);
      if (current.startsWith('Buscar')) assert.equal(node.alwaysOutputData, true);
    } else if (node.type === 'n8n-nodes-base.respondToWebhook') {
      return { status: node.parameters.options.responseCode || 200, body: evaluate(node.parameters.responseBody), writes };
    }
    output[current] = data;
    current = workflow.connections[current]?.main[branch]?.[0]?.node;
  }
  throw new Error('El workflow no produjo una respuesta');
}

const body = { inscripcion_id: 'ins_test', evento_id: 'evt_test' };
const registration = { ...body, usuario_id: 'usr_test', estado: 'CONFIRMADA' };
const event = { evento_id: 'evt_test' };

test('WF11 registra asistencia y entrega un comprobante', () => {
  const result = runWorkflow({ body, registration, event });
  assert.equal(result.status, 200);
  assert.equal(result.body.resultado, 'EXITOSO');
  assert.equal(result.body.inscripcion_id, body.inscripcion_id);
  assert.ok(result.body.checkin_id);
  assert.deepEqual(result.writes, ['Registrar check-in EXITOSO', 'Actualizar inscripción ASISTIO']);
  assert.equal(nodes.get('Actualizar inscripción ASISTIO').parameters.columns.value.estado, 'ASISTIO');
});

test('WF11 rechaza una inscripción de otro evento aunque ambos eventos existan', () => {
  const result = runWorkflow({ body, registration: { ...registration, evento_id: 'evt_other' }, event });
  assert.equal(result.status, 400);
  assert.equal(result.body.resultado, 'RECHAZADO');
  assert.match(result.body.mensaje, /evt_other/);
  assert.deepEqual(result.writes, ['Registrar check-in RECHAZADO']);
});

test('WF11 rechaza campos vacíos, registros inexistentes y estados no confirmados', () => {
  const cases = [
    { body: { inscripcion_id: '   ' } },
    { body, event },
    { body, registration },
    ...['LISTA_ESPERA', 'CANCELADA', 'ASISTIO'].map(estado => ({ body, event, registration: { ...registration, estado } })),
  ];
  for (const input of cases) {
    const result = runWorkflow(input);
    assert.equal(result.status, 400);
    assert.equal(result.body.resultado, 'RECHAZADO');
    assert.deepEqual(result.writes, ['Registrar check-in RECHAZADO']);
  }
});

test('WF11 devuelve duplicado sin volver a actualizar la asistencia', () => {
  const result = runWorkflow({ body, event, registration: { ...registration, estado: 'ASISTIO' }, previous: { checkin_id: 'chk_existing' } });
  assert.equal(result.status, 409);
  assert.equal(result.body.resultado, 'DUPLICADO');
  assert.deepEqual(result.writes, ['Registrar check-in DUPLICADO']);
});
