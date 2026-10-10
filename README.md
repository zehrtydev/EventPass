# EventPass

EventPass es una plataforma de gestión de eventos. Permite consultar eventos, registrarse, administrar inscripciones, vincular una cuenta de Telegram y registrar el check-in digital de los asistentes.

El repositorio contiene el frontend web y las exportaciones de workflows de n8n que implementan la API y las automatizaciones del sistema.

## Componentes

- `frontend/`: aplicación React 19 construida con Vite 8.
- `n8n/`: workflows exportados para los procesos de EventPass.
- `docs/`: contrato de API y documentación técnica.
- `docs/EventPass/`: exportaciones locales de las hojas de datos utilizadas por los workflows.

## Requisitos

- Node.js `>=22.12.0`.
- Una instancia de n8n con los workflows y credenciales correspondientes.
- Google Sheets configurado para los workflows que persisten datos.

## Desarrollo local

```bash
cd frontend
npm ci
npm run dev
```

Vite mostrará la URL local del frontend. Para generar una compilación de producción:

```bash
cd frontend
npm run build
```

## Configuración

Copia `frontend/.env.example` a `frontend/.env` y ajusta las variables según la instancia de n8n:

```env
VITE_N8N_BASE_URL=https://manuamado.app.n8n.cloud
VITE_EVENTPASS_CHAT_URL=https://manuamado.app.n8n.cloud/webhook/5ebbcae5-e6e5-44d4-800a-77330877ba2b/chat
```

Las variables `VITE_*` se incorporan al bundle del navegador. No coloques secretos, API keys ni credenciales privadas en ellas.

## Pruebas

Las pruebas del frontend se ejecutan desde `frontend/`:

```bash
npm test
```

La suite cubre sesiones, llamadas de API, decisiones del flujo de check-in y estados de vinculación de Telegram. Las pruebas locales utilizan dobles de los servicios; no sustituyen una validación de credenciales, webhooks o disponibilidad de n8n.

## Workflows n8n

Los workflows principales son:

| Workflow | Responsabilidad |
| --- | --- |
| WF01 | CRUD de usuarios |
| WF02 | Autenticación y sesiones |
| WF03 | Vinculación de Telegram y WhatsApp |
| WF04 | CRUD de eventos |
| WF05 | Catálogo público |
| WF06 | CRUD de inscripciones |
| WF07 | Reasignación desde lista de espera |
| WF08 | Recordatorios |
| WF09 | Notificaciones |
| WF10 | Asistente de EventPass |
| WF11 | Check-in digital |

Importa los JSON de `n8n/` en la instancia de n8n, revisa las credenciales de cada cuenta y activa los workflows después de validar sus webhooks. El repositorio no activa ni publica workflows remotamente.

## API documentada

El contrato del check-in digital y del estado de vinculación de Telegram está en [docs/api.md](docs/api.md). El endpoint de check-in es:

```text
POST /webhook/eventpass/checkin
```

Requiere `inscripcion_id` y `evento_id`. Para un ingreso exitoso, la inscripción debe estar en estado `CONFIRMADA`; un segundo intento se responde como duplicado.

## Datos de ejemplo

Los archivos de `docs/EventPass/` son exportaciones de hojas utilizadas durante el desarrollo y pueden contener información personal, hashes o tokens de sesión. No los uses como mecanismo de distribución de credenciales ni compartas datos reales sin sanitizarlos previamente.

## Flujo Git

El desarrollo normal se realiza en `develop` y los cambios preparados se integran a `main` mediante revisión. Antes de publicar cambios, ejecuta las pruebas y revisa que no se incluyan secretos ni exportaciones sensibles.
