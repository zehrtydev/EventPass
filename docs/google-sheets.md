# Migración de notificaciones por WhatsApp

Antes de activar la versión actualizada de `WF09 - Servicio central de notificaciones` en n8n, agrega estas dos columnas al encabezado de la hoja `Notificaciones` de `EP09_Notificaciones`:

- `whatsapp_estado`
- `whatsapp_error`

Después importa el flujo actualizado y actualiza el esquema de columnas del nodo `Registrar notificación`. La vinculación usa la hoja existente `Vinculaciones` y no requiere cambiar sus columnas: el canal se identifica mediante el valor `WHATSAPP` de `canal`.

La instancia de Evolution debe conservar el webhook de eventos hacia `eventpass/whatsapp/vincular` y la credencial de cabecera usada por los nodos de envío.
