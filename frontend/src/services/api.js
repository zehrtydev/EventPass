const env = import.meta.env ?? {};
export const baseUrl = (env.VITE_N8N_BASE_URL || 'https://manuamado.app.n8n.cloud').replace(/\/$/, '');
export const chatUrl = env.VITE_EVENTPASS_CHAT_URL || 'https://manuamado.app.n8n.cloud/webhook/5ebbcae5-e6e5-44d4-800a-77330877ba2b/chat';

export class ApiError extends Error {
  constructor(message, status = 0, resultado) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.resultado = resultado;
  }
}

export async function request(endpoint, payload = {}, { token, signal, timeout = 25000 } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${baseUrl}/webhook/eventpass/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // El token viaja únicamente al backend configurado; nunca se incluye en URLs.
      body: JSON.stringify({ ...payload, ...(token ? { session_token: token } : {}) }),
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
    });
    if (response.status === 401 && token && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eventpass:session-expired', { detail: { token } }));
    }
    let data;
    try { data = await response.json(); }
    catch { throw new ApiError('El servicio devolvió una respuesta que no pudimos interpretar. Inténtalo de nuevo.', response.status); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new ApiError('El servicio devolvió un formato inesperado.', response.status);
    }
    if (!response.ok || data.ok === false || data.success === false) {
      const message = [data.error, data.message, data.mensaje].find(value => typeof value === 'string');
      throw new ApiError(message || `No se pudo completar la solicitud (${response.status}).`, response.status, data.resultado);
    }
    if (data.ok !== true) throw new ApiError('El servicio no confirmó la operación. Revisa el estado antes de volver a intentarlo.', response.status);
    return data;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError('La solicitud tardó demasiado. Si estabas guardando datos, consulta su estado antes de repetirla.');
    throw new ApiError('No pudimos conectar con EventPass. Comprueba tu conexión e inténtalo de nuevo.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export const usuariosRequest = (data, options) => request('usuarios', data, options);
export const authRequest = (data, options) => request('auth', data, options);
export const catalogoRequest = (data, options) => request('catalogo', data, options);
export const vinculacionRequest = (data, options) => request('vinculacion/codigo', data, options);
export async function telegramStatusRequest(options) {
  const data = await request('vinculacion/estado', {}, options);
  if (typeof data.vinculado !== 'boolean') throw new ApiError('No pudimos confirmar el estado de Telegram. Inténtalo de nuevo.');
  return data;
}
export const inscripcionesRequest = (data, options) => request('inscripciones', data, options);

export async function checkinRequest(data, options) {
  const result = await request('checkin', data, options);
  if (result.resultado !== 'EXITOSO' || typeof result.checkin_id !== 'string' || !result.checkin_id.trim() ||
      typeof result.fecha_checkin !== 'string' || !Number.isFinite(Date.parse(result.fecha_checkin)) ||
      result.inscripcion_id !== data.inscripcion_id || result.evento_id !== data.evento_id) {
    throw new ApiError('No pudimos confirmar el ingreso. Consulta el estado de la inscripción antes de repetirlo.');
  }
  return result;
}

export function requireList(data, key) {
  if (!Array.isArray(data[key])) throw new ApiError('La respuesta recibida no contiene el listado esperado.');
  return data[key];
}

export function requireObject(data, key) {
  if (!data[key] || typeof data[key] !== 'object' || Array.isArray(data[key])) throw new ApiError('La respuesta recibida está incompleta.');
  return data[key];
}
