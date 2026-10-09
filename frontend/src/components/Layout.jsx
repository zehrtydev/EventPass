import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTelegram } from '../contexts/TelegramContext';
import Icon from './Icon';

export function Brand() { return <span className="brand">Event<span>Pass</span><i /></span>; }

export default function Layout() {
  const auth = useAuth();
  const telegram = useTelegram();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelector('main')?.focus({ preventScroll: true });
  }, [location.pathname]);
  const logout = async () => {
    setLoggingOut(true);
    await auth.logout();
    setLoggingOut(false);
    navigate('/login');
  };
  const links = [{ to: '/', label: 'Inicio', icon: 'home' }, { to: '/eventos', label: 'Eventos', icon: 'calendar' }, ...(auth.authenticated ? [{ to: '/inscripciones', label: 'Mis inscripciones', icon: 'ticket' }, { to: '/checkin', label: 'Check-in', icon: 'check' }, { to: '/vinculacion', label: telegram.label, icon: 'send' }] : []), { to: '/asistente', label: 'Assistant', icon: 'bot' }, ...(auth.authenticated ? [{ to: '/cuenta', label: 'Mi cuenta', icon: 'user' }] : [])];
  return <><a href="#main" className="skip-link">Saltar al contenido</a><header className="site-header"><div className="header-inner"><Link to="/" aria-label="EventPass, inicio"><Brand /></Link><button className="icon-button menu-toggle" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></button><nav id="main-navigation" className={open ? 'navigation open' : 'navigation'} aria-label="Navegación principal" onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); document.querySelector('.menu-toggle')?.focus(); } }}>{links.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'}><Icon name={link.icon} size={18} />{link.label}</NavLink>)}<div className="nav-actions">{auth.authenticated ? <button className="text-button logout" onClick={logout} disabled={loggingOut}><Icon name="logout" size={17} />{loggingOut ? 'Cerrando…' : 'Salir'}</button> : <><NavLink to="/login">Iniciar sesión</NavLink><Link to="/registro" className="button primary small">Crear cuenta <Icon name="arrow" size={16} /></Link></>}</div></nav></div></header><main id="main" tabIndex={-1}><Outlet /></main><footer className="site-footer"><div><Link to="/" aria-label="EventPass, inicio"><Brand /></Link><p>Tu comunidad. Más eventos. Más experiencias.</p></div><nav aria-label="Navegación del pie"><Link to="/eventos">Eventos</Link><Link to="/asistente">Assistant</Link><Link to="/vinculacion">Telegram</Link></nav><span>EventPass · Proyecto académico<br />Hecho para conectar universos.</span></footer></>;
}
