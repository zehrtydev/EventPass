import { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useQuery } from '../hooks/useRequest';
import { telegramStatusRequest } from '../services/api';

const TelegramContext = createContext(null);

export function TelegramProvider({ children }) {
  const { session, authenticated } = useAuth();
  const { pathname } = useLocation();
  const token = session?.session_token;
  const query = useQuery(async signal => ({
    ...await telegramStatusRequest({ token, signal }),
    token,
  }), `${token || ''}:${pathname}`, authenticated);
  const refresh = query.reload;

  useEffect(() => {
    if (!authenticated) return;
    const onReturn = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [authenticated, refresh]);

  // Un resultado de otra sesión nunca describe la cuenta actual.
  const linked = authenticated && query.data?.token === token ? query.data.vinculado : null;
  const label = linked === true ? 'Telegram vinculado' : linked === false ? 'Vincular Telegram' : 'Telegram';
  return <TelegramContext.Provider value={{ linked, label, loading: query.loading, error: query.error, refresh }}>{children}</TelegramContext.Provider>;
}

export const useTelegram = () => useContext(TelegramContext);
