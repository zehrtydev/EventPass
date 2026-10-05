import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authRequest, ApiError } from '../services/api';
import { normalizeSession, readSession, sessionKey, writeSession } from '../services/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const sessionRef = useRef(session);
  const [status, setStatus] = useState(session ? 'checking' : 'anonymous');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const save = useCallback(value => {
    sessionRef.current = value;
    setSession(value);
    writeSession(value);
  }, []);
  const clear = useCallback(() => { save(null); setStatus('anonymous'); setError(null); }, [save]);
  const validate = useCallback(async (candidate = sessionRef.current) => {
    if (!candidate) { clear(); return; }
    setStatus('checking');
    setError(null);
    try {
      const data = await authRequest({ action: 'validate' }, { token: candidate.session_token });
      if (sessionRef.current?.session_token !== candidate.session_token) return;
      if (data.valid !== true) throw new ApiError('Tu sesión ha expirado. Inicia sesión nuevamente.', 401);
      save(normalizeSession(data, candidate));
      setStatus('authenticated');
    } catch (cause) {
      if (sessionRef.current?.session_token !== candidate.session_token) return;
      if ([401, 403].includes(cause.status)) { clear(); setNotice('Tu sesión ya no es válida. Inicia sesión nuevamente.'); }
      else { setError(cause); setStatus('error'); }
    }
  }, [clear, save]);
  useEffect(() => { validate(); }, [validate]);
  useEffect(() => {
    const expired = event => {
      if (event.detail.token === sessionRef.current?.session_token) {
        clear(); setNotice('Tu sesión ha expirado. Inicia sesión nuevamente.');
      }
    };
    const sync = event => {
      if (event.key === sessionKey || event.key === null) {
        const candidate = readSession();
        sessionRef.current = candidate;
        setSession(candidate);
        validate(candidate);
      }
    };
    window.addEventListener('eventpass:session-expired', expired);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('eventpass:session-expired', expired); window.removeEventListener('storage', sync); };
  }, [clear, validate]);
  const login = async credentials => {
    const data = await authRequest({ action: 'login', ...credentials });
    save(normalizeSession(data));
    setStatus('authenticated');
    setNotice('');
    setError(null);
  };
  const logout = async (successMessage = 'Has cerrado sesión correctamente.') => {
    const token = sessionRef.current?.session_token;
    let message = successMessage;
    try {
      if (token) await authRequest({ action: 'logout' }, { token });
    }
    catch (cause) {
      if (cause.status !== 401) message = `${successMessage} No pudimos confirmar el cierre de sesión en el servidor.`;
    } finally {
      clear();
      setNotice(message);
    }
  };
  const updateUser = user => save(normalizeSession({ usuario: user }, sessionRef.current));
  return <AuthContext.Provider value={{ session, status, error, notice, login, logout, validate, updateUser, clear, authenticated: status === 'authenticated' }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
