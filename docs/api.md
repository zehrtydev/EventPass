# API de EventPass

## Check-in digital (WF11)

Contrato verificado contra `n8n/WF11_checkin_digital.json` el 9 de octubre de 2026. El estado remoto y CORS del webhook no se comprobaron mediante escrituras reales.

## Solicitud

`POST /webhook/eventpass/checkin`, con `Content-Type: application/json`:

```json
{
  "inscripcion_id": "ins_ejemplo",
  "evento_id": "evt_ejemplo",
  "session_token": "TOKEN_DE_EJEMPLO_NO_REAL"
}
```

WF11 normaliza los identificadores eliminando espacios exteriores. El frontend envía el token de la sesión, pero el workflow actual no lo valida ni comprueba permisos de operador. No debe habilitarse para usuarios reales sin resolver esa autorización.

## Respuestas

| HTTP | `ok` | `resultado` | Comportamiento |
| --- | --- | --- | --- |
| 200 | `true` | `EXITOSO` | Registra el ingreso, cambia la inscripción a `ASISTIO` e invoca WF09 |
| 409 | `false` | `DUPLICADO` | Registra el intento duplicado sin actualizar otra vez la inscripción |
| 400 | `false` | `RECHAZADO` | Registra el rechazo por campos vacíos, inscripción/evento inexistente, evento distinto o estado no confirmado |

Todas incluyen `mensaje`, `inscripcion_id` y `evento_id`. El éxito incluye además `checkin_id` y `fecha_checkin`; el duplicado incluye `fecha_intento`.

La comparación del evento debe leer `Buscar inscripción.evento_id`. Comparar `Buscar evento.evento_id` con la entrada solo confirma el filtro de búsqueda y deja pasar inscripciones ajenas al evento. La regresión está cubierta por `frontend/tests/checkin-workflow.test.js`.

## Persistencia y limitaciones

`EP11_Checkin` / `Checkins`: `checkin_id`, `inscripcion_id`, `evento_id`, `usuario_id`, `fecha_checkin`, `resultado`, `detalle`. La asistencia se actualiza en `EP06_Inscripciones` y las notificaciones se delegan a WF09.

- La consulta del check-in previo y su inserción son pasos separados: no garantizan exclusión entre solicitudes concurrentes.
- El registro exitoso se inserta antes de actualizar la inscripción. Un fallo entre ambas escrituras puede dejar datos parciales; un reintento encontrará un duplicado.
- WF11 espera la ejecución de WF09 antes de responder. Un fallo de notificación puede impedir confirmar al cliente un ingreso ya escrito. No se reintenta automáticamente desde React; se debe consultar el estado y revisar la ejecución antes de repetir.
- El JSON exportado tiene `active: false`. El commit no publica ni activa el workflow en n8n.
- Las pruebas locales ejecutan código y decisiones del JSON con dobles de Sheets; no prueban credenciales, CORS, disponibilidad ni efectos reales en la instancia de n8n.
- La política de autorización del operador queda pendiente de definición. La pantalla requiere sesión, pero esa restricción del navegador no es una barrera de seguridad del backend.

## Exportaciones locales

Los once libros en `docs/EventPass/` contienen datos, incluidos campos de credenciales, sesiones e información personal. Están excluidos de Git mediante `.gitignore` y se conservan sin modificaciones. Para compartir estructura, utilizar esquemas documentados o fixtures sintéticos, nunca esas exportaciones.

## Estado de Telegram (WF03)

`POST /webhook/eventpass/vinculacion/estado` con `{ "session_token": "TOKEN_DE_EJEMPLO_NO_REAL" }`. También acepta `Authorization: Bearer ...` mediante el validador existente de WF03.

Respuesta 200:

```json
{ "ok": true, "canal": "TELEGRAM", "vinculado": true }
```

`vinculado` es `false` cuando no hay una fila `ACTIVA` del usuario autenticado con canal `TELEGRAM` y `chat_id` no vacío. WhatsApp, registros inactivos y filas de otros usuarios no cuentan. Se consultan todas las coincidencias del usuario (`returnFirstMatch: false`), incluyendo el caso de una fila antigua inactiva seguida de otra activa. La opción corresponde al nodo Google Sheets 4.7 del export; [definición oficial de la operación de lectura](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/Google/Sheet/v2/actions/sheet/read.operation.ts).

La consulta reutiliza la validación de sesión activa y vigente y de usuario activo. Devuelve 401 por sesión inválida y 403 por usuario inactivo. El usuario se obtiene de la sesión, nunca de un `usuario_id` enviado por el cliente. Solo lee Sheets: no genera códigos, no cambia vinculaciones ni envía mensajes. No devuelve `chat_id`, nombres ni credenciales.

La generación existente en `/vinculacion/codigo` y los flujos de recepción de Telegram/WhatsApp conservan sus rutas. Se agregó una bifurcación después de validar el usuario para dirigir únicamente el nuevo webhook hacia la consulta.

Es necesario publicar el WF03 actualizado antes del frontend. Esta corrección modifica el export de desarrollo; no publica ni cambia el workflow remoto. Las pruebas locales cubren estados vinculados y no vinculados, ausencia de datos, separación de canales/usuarios, autorización y conservación de la ruta de generación.
