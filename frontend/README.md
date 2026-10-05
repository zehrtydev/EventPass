# EventPass — frontend

Cliente académico de eventos con temática Comic Con. Implementado con React, Vite, JavaScript y React Router. Toda la información de usuarios, catálogo, sesiones, vinculación e inscripciones se consulta mediante los endpoints HTTP de n8n. No accede directamente a Google Sheets, WhatsApp, Telegram, Gmail ni a modelos de IA.

## Ejecutar en el VPS

Requiere Node.js 22.12 o superior.

```bash
cd /home/vpsadmin/dev/active/eventpass/frontend
npm ci
npm run dev
```

Vite escucha en el puerto 5173. Para acceder desde tu computador mediante SSH:

```bash
ssh -L 5173:localhost:5173 vpsadmin@TU_VPS
```

Abre `http://localhost:5173` en tu computador. El stack se ejecuta en el VPS.

```bash
npm test
npm run build
npm run preview
```

`npm test` usa el ejecutor nativo de Node para probar el cliente HTTP, manejo de errores, timeout, persistencia mínima de sesión y formatos de presentación. No realiza operaciones reales en n8n.

### Pruebas de navegador

`tests/browser.mjs` valida los flujos completos con respuestas HTTP controladas. Playwright es una herramienta externa opcional y no se incorpora a las dependencias del proyecto. Con Playwright y Chromium disponibles:

```bash
PLAYWRIGHT_MODULE_PATH=/ruta/a/playwright/index.mjs node tests/browser.mjs
```

El servidor debe estar iniciado. `EVENTPASS_TEST_URL` permite cambiar `http://localhost:5173`. La instalación de pruebas autorizada en este VPS se aisló en `/tmp`; mientras exista, se puede repetir con:

```bash
FONTCONFIG_FILE=/tmp/eventpass-browser/fonts.conf \
LD_LIBRARY_PATH=/tmp/eventpass-browser/libs/extracted/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=/tmp/eventpass-browser/browsers \
PLAYWRIGHT_MODULE_PATH=/tmp/eventpass-browser/node_modules/playwright/index.mjs \
node tests/browser.mjs
```

El entorno de pruebas necesita bibliotecas gráficas y fuentes de sistema incluso en modo headless. En esta validación se extrajeron en `/tmp`; no se instalaron paquetes en el sistema.

## Configuración

`.env.example` documenta las dos variables públicas. Los valores predeterminados permiten ejecutar el proyecto sin crear un archivo `.env`:

```dotenv
VITE_N8N_BASE_URL=https://zehrty.app.n8n.cloud
VITE_EVENTPASS_CHAT_URL=https://zehrty.app.n8n.cloud/webhook/5ebbcae5-e6e5-44d4-800a-77330877ba2b/chat
```

Para cambiar de instancia, crea `frontend/.env.local` con los valores correspondientes. Reinicia Vite o vuelve a compilar. **Las variables `VITE_` son públicas: nunca contienen secretos.**

## Estructura

```text
frontend/
  .env.example
  index.html
  package.json / package-lock.json
  vite.config.js / vercel.json
  public/favicon.svg
  src/
    main.jsx / App.jsx
    assets/                  # Ilustraciones originales decorativas
    components/              # Navegación, tarjetas, modal y estados reutilizables
    contexts/AuthContext.jsx # Sesión, validación, perfil mínimo y cierre
    hooks/useRequest.js      # Consultas cancelables y estados de operaciones
    pages/                   # Pantallas públicas y protegidas
    services/api.js          # Único cliente HTTP
    services/session.js      # Persistencia de campos permitidos
    services/presentation.js # Formato de fechas, categorías e imágenes
    styles/global.css        # Diseño y puntos de adaptación responsive
  tests/                     # Pruebas sin datos personales reales
```

## Rutas y comportamiento

| Ruta | Función |
| --- | --- |
| `/` | Portada, catálogo, filtros y accesos personales |
| `/eventos` | Catálogo completo |
| `/eventos/:id` | Detalle, disponibilidad e inscripción |
| `/registro` | Creación de usuario |
| `/login` | Inicio de sesión y retorno a la ruta solicitada |
| `/cuenta` | Perfil, actualización y desactivación confirmada |
| `/inscripciones` | Consulta, edición y cancelación confirmada |
| `/vinculacion` | Código e instrucciones para WhatsApp o Telegram |
| `/asistente` | Acceso al chat público existente |
| Cualquier otra | Página 404 |

`/cuenta`, `/inscripciones` y `/vinculacion` requieren validación de sesión. El registro no inicia sesión automáticamente: después de crear la cuenta se dirige al login.

Los filtros de categoría se obtienen de `LISTADO` y consultan `FILTRO`. La búsqueda de texto, fecha y lugar filtra únicamente los eventos recibidos. La disponibilidad y la asignación de estados proceden de n8n; no se calculan cupos ni posiciones en React. Después de editar o cancelar se consulta de nuevo `LIST`.

La portada muestra las inscripciones reales si existe sesión y un acceso al login en caso contrario. El panel de canales explica las notificaciones, sin simular un buzón: no hay un endpoint público para listar notificaciones.

Cuando `imagen_url` contiene una URL HTTPS válida, se muestra la imagen del evento. En su ausencia o si falla, se utiliza una ilustración decorativa de categoría. No se incluyen eventos, usuarios ni inscripciones ficticios en la aplicación. Las ilustraciones no representan invitados reales ni identidad oficial de convenciones.

Las ilustraciones se sirven en WebP y se conservan los PNG originales como fuentes editables. Las tipografías Barlow se sirven desde los assets locales, con sus licencias OFL; la interfaz no depende de peticiones a Google Fonts.

## Contratos verificados

Contratos inspeccionados en los JSON existentes de `n8n/` y consultas públicas realizadas el 4 de octubre de 2026:

- WF01: respuestas de perfil y actualización en `usuario`.
- WF02: login con `session` y `usuario` separados. `validate` no vuelve a entregar `session_token`; el cliente conserva el token original después de validar.
- WF03: `codigo`, `expira_en` e instrucciones. No se dispone de un enlace público verificado al bot, por lo que no se inventa uno.
- WF05: `eventos` para listado/filtro, `evento` para detalle y disponibilidad en la raíz para `DISPONIBILIDAD`.
- WF06: `inscripcion` para operaciones y `inscripciones` para listado. Crear una inscripción exige WhatsApp o Telegram vinculado; un 403 por este motivo se muestra sin cerrar la sesión.
- WF10: el chat responde a GET, pero devuelve `X-Frame-Options: SAMEORIGIN`. Se abre la URL pública en nueva pestaña; no se crea un segundo chatbot.

El cliente maneja JSON inválido, HTTP fallido, errores de negocio, red, respuestas incompletas y timeout de 25 segundos. Las escrituras no tienen reintentos automáticos. Tras un timeout, consulta el estado antes de repetir una operación.

## Sesión y límites de seguridad

Se guardan únicamente `session_token`, `session_id`, `usuario_id`, `nombre`, `email` y `expira_en` bajo `eventpass.session` en `localStorage`, como exige el proyecto. Nunca se persiste la contraseña. El token se envía en el cuerpo del POST al backend configurado; no se coloca en URLs.

Se valida al iniciar, se limpian sesiones inválidas y se sincroniza el cierre entre pestañas. Una caída de red al validar permite reintentar sin borrar automáticamente las credenciales existentes. El cierre llama a WF02 y limpia la sesión local incluso si la red falla, avisando si no fue posible confirmar la revocación remota.

**Pendiente del backend antes de una publicación con usuarios reales:** en el JSON existente de WF01, las acciones `profile`, `update` y `deactivate` usan `usuario_id` y no validan sesión ni propiedad del usuario. El frontend envía el token, pero `ProtectedRoute` no constituye una barrera de seguridad del servidor. Debe corregirse la autorización en n8n en una tarea separada. No se han modificado los workflows.

## Preparación para Vercel

Configuración del proyecto:

- Root Directory: `frontend`.
- Framework: Vite.
- Install Command: `npm ci`.
- Build Command: `npm run build`.
- Output Directory: `dist`.
- Variables públicas: las documentadas arriba.

`vercel.json` contiene la reescritura para que las rutas funcionen al recargar y cabeceras de seguridad básicas. Se mantiene `emptyOutDir: false` en Vite para no borrar artefactos automáticamente; en CI el checkout limpio genera únicamente la compilación actual.

Esta tarea prepara los archivos, pero no crea un deployment, no modifica workflows de CI/CD y no realiza commit, push ni merge. La conexión del repositorio a Vercel debe respetar el flujo de publicación aprobado para el proyecto.

Referencias oficiales: [Vite](https://vite.dev/guide/), [React Router](https://reactrouter.com/start/declarative/installation), [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Validación manual de integración

Con una cuenta de prueba autorizada:

1. Crear cuenta, iniciar sesión, recargar y comprobar la validación.
2. Generar código, vincularlo con WhatsApp o el bot configurado de Telegram y esperar la confirmación real.
3. Inscribirse en un evento con cupo y en uno lleno, verificando los estados de n8n.
4. Editar acreditación, vaciar observaciones y cancelar con confirmación; comprobar que el listado se actualiza.
5. Actualizar perfil y verificar conflictos de email.
6. Desactivar únicamente una cuenta desechable de prueba y comprobar el cierre de sesión.
7. En el dominio final, verificar CORS para todos los endpoints, recargas de rutas y apertura del asistente.

Las comprobaciones reales realizadas en esta tarea son de catálogo y chat. Los flujos que escriben datos se validan mediante respuestas controladas; no se crean cuentas, inscripciones, códigos ni mensajes reales de prueba sin una cuenta de ensayo acordada.

## Estado de entrega

- `npm run build`: correcto.
- `npm test`: pruebas unitarias y de contrato de flujos n8n.
- `node tests/browser.mjs` con el entorno indicado: 16 grupos correctos; registro, sesión, perfil, canales, inscripción, edición, cancelación, desactivación, errores y rutas protegidas.
- Adaptación comprobada a 320, 375, 390, 768, 1024 y 1440 píxeles, incluyendo menú móvil y preferencia de movimiento reducido.
- Catálogo real renderizado en Chromium: cuatro eventos, búsqueda funcional y sin excepciones JavaScript.
- `npm audit`: cero vulnerabilidades conocidas reportadas en las dependencias instaladas.
- Configuración Vercel preparada; deployment y pruebas con cuentas reales pendientes.
- Rama de trabajo `develop`; sin commit, push ni PR creados por esta tarea.
