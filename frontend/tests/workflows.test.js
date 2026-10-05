import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const workflow = name => JSON.parse(fs.readFileSync(new URL(`../../n8n/${name}`, import.meta.url), 'utf8'));

const nodeCode = (workflowData, nodeName) => {
  const node = workflowData.nodes.find(item => item.name === nodeName);
  if (!node?.parameters?.jsCode) throw new Error(`No se encontró el nodo ${nodeName}.`);
  return node.parameters.jsCode;
};

const executeCode = (code, { inputs = {}, json = {} } = {}) => {
  const selector = name => {
    const items = inputs[name] ?? [];
    return {
      all: () => items,
      first: () => items[0] ?? { json: {} },
      item: { json: items[0]?.json ?? {} },
    };
  };
  return new vm.Script(`(() => { ${code} })()`).runInNewContext({ $: selector, $json: json });
};

test('WF06 permite inscripción con WhatsApp o Telegram activos', () => {
  const code = nodeCode(workflow('WF06_inscripciones_crud.json'), 'Validar mensajería CREATE');
  const whatsapp = executeCode(code, {
    inputs: {
      'Buscar vinculaciones CREATE': [{ json: { vinculacion_id: 'vin_wa', estado: 'ACTIVA', canal: 'WHATSAPP', chat_id: '573001112233@s.whatsapp.net' } }],
    },
  });
  const inactive = executeCode(code, {
    inputs: {
      'Buscar vinculaciones CREATE': [{ json: { vinculacion_id: 'vin_old', estado: 'INACTIVA', canal: 'WHATSAPP', chat_id: '573001112233@s.whatsapp.net' } }],
    },
  });

  assert.equal(whatsapp[0].json.whatsapp_vinculado, true);
  assert.equal(whatsapp[0].json.mensajeria_vinculada, true);
  assert.equal(inactive[0].json.mensajeria_vinculada, false);
});

test('WF09 normaliza WhatsApp y conserva Telegram como canales independientes', () => {
  const code = nodeCode(workflow('WF09_notificaciones.json'), 'Preparar canales NOTIF');
  const result = executeCode(code, {
    inputs: {
      'Preparar destinatario NOTIF': [{ json: { email: '', titulo: 'Confirmación', mensaje: 'Tu cupo está listo.' } }],
      'Buscar vinculaciones NOTIF': [
        { json: { vinculacion_id: 'vin_tg', estado: 'ACTIVA', canal: 'TELEGRAM', chat_id: '12345' } },
        { json: { vinculacion_id: 'vin_wa', estado: 'ACTIVA', canal: 'WHATSAPP', chat_id: '573001112233@s.whatsapp.net' } },
      ],
    },
  })[0].json;

  assert.equal(result.gmail_disponible, false);
  assert.equal(result.telegram_disponible, true);
  assert.equal(result.telegram_chat_id, '12345');
  assert.equal(result.whatsapp_disponible, true);
  assert.equal(result.whatsapp_numero, '573001112233');
});

test('WF07 y WF08 tratan WhatsApp entregado como notificación exitosa', () => {
  const reassignmentCode = nodeCode(workflow('WF07_reasignacion_lista_espera.json'), 'Preparar registro REASIGNACIÓN');
  const reminderCode = nodeCode(workflow('WF08_recordatorios.json'), 'Preparar resultado RECORDATORIO');
  const notification = { gmail_estado: 'NO_APLICA', telegram_estado: 'NO_APLICA', whatsapp_estado: 'ENVIADO' };

  const reassignment = executeCode(reassignmentCode, {
    inputs: { 'Preparar promoción REASIGNACIÓN': [{ json: { reasignacion_id: 'rea_1' } }] },
    json: notification,
  });
  const reminder = executeCode(reminderCode, {
    inputs: { 'Preparar recordatorio': [{ json: { recordatorio_id: 'rec_1' } }] },
    json: notification,
  });

  assert.equal(reassignment.json.resultado_notificacion, 'ENVIADO');
  assert.equal(reminder.json.estado, 'ENVIADO');
  assert.ok(reminder.json.fecha_envio);
});
