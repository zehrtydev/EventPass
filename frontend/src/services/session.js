export const sessionKey = 'eventpass.session';

export function normalizeSession(data, previous = {}) {
  const session = data.session ?? {};
  const user = data.usuario ?? {};
  const result = {
    session_token: session.session_token ?? previous.session_token,
    session_id: session.session_id ?? previous.session_id,
    usuario_id: user.usuario_id ?? session.usuario_id ?? previous.usuario_id,
    nombre: user.nombre ?? previous.nombre,
    email: user.email ?? previous.email,
    expira_en: session.expira_en ?? previous.expira_en,
  };
  if (typeof result.session_token !== 'string' || !result.session_token || !result.usuario_id) {
    throw new Error('La respuesta de autenticación no contiene una sesión válida.');
  }
  return result;
}

export function readSession() {
  try {
    const value = JSON.parse(localStorage.getItem(sessionKey));
    return value ? normalizeSession({}, value) : null;
  } catch { return null; }
}

export function writeSession(value) {
  try {
    if (value) localStorage.setItem(sessionKey, JSON.stringify(normalizeSession({}, value)));
    else localStorage.removeItem(sessionKey);
  } catch { /* La sesión puede seguir en memoria si el navegador bloquea almacenamiento. */ }
}
