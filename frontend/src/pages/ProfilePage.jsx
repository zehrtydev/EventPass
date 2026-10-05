import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQuery } from '../hooks/useRequest';
import { usuariosRequest, requireObject } from '../services/api';
import { ErrorMessage, LoadingSpinner, MutationFeedback } from '../components/Feedback';
import Modal from '../components/Modal';
import Icon from '../components/Icon';

export default function ProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const mutation = useMutation();
  const deactivate = useMutation();
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const query = useQuery(signal => usuariosRequest({ action: 'profile', usuario_id: auth.session.usuario_id }, { token: auth.session.session_token, signal }).then(data => requireObject(data, 'usuario')), auth.session.usuario_id);
  const submit = async event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const data = await mutation.run(async () => {
      const response = await usuariosRequest({ action: 'update', usuario_id: auth.session.usuario_id, nombre: fields.nombre.trim(), email: fields.email.trim() }, { token: auth.session.session_token });
      auth.updateUser(requireObject(response, 'usuario'));
      return response;
    }, 'Tu perfil se actualizó correctamente.');
    if (data) query.reload();
  };
  const disableAccount = async event => {
    event.preventDefault();
    if (confirmation !== 'DESACTIVAR') return;
    const response = await deactivate.run(() => usuariosRequest({ action: 'deactivate', usuario_id: auth.session.usuario_id }, { token: auth.session.session_token }));
    if (response) { await auth.logout('Tu cuenta quedó desactivada y cerramos la sesión.'); navigate('/login', { replace: true }); }
  };
  return <div className="page profile-page"><div className="page-heading"><span className="eyebrow cyan-text">TU IDENTIDAD EN ESTE UNIVERSO</span><h1>Mi cuenta</h1><p>Tu perfil, preparado para la próxima experiencia.</p></div>{query.loading ? <LoadingSpinner /> : query.error ? <ErrorMessage error={query.error} onRetry={query.reload} /> : <div className="profile-grid"><section className="panel profile-form"><div className="profile-avatar">{(query.data.nombre || 'E').slice(0, 1).toUpperCase()}</div><h2>Datos personales</h2>{query.data.estado && <span className="status neutral">{query.data.estado}</span>}<form className="form-stack" onSubmit={submit}><fieldset disabled={mutation.loading}><label>Nombre<input name="nombre" defaultValue={query.data.nombre} required autoComplete="name" maxLength={150} /></label><label>Correo electrónico<input name="email" type="email" defaultValue={query.data.email} required autoComplete="email" maxLength={254} /></label><MutationFeedback mutation={mutation} /><button className="button primary">{mutation.loading ? 'Guardando…' : 'Guardar cambios'}<Icon name="check" size={18} /></button></fieldset></form></section><aside><section className="panel profile-connect"><span className="icon-tile cyan"><Icon name="send" size={28} /></span><h2>Conecta con tu aventura</h2><p>Vincula Telegram para recibir las confirmaciones y los recordatorios de tus eventos.</p><Link to="/vinculacion" className="button secondary">Vincular Telegram <Icon name="arrow" size={17} /></Link></section><section className="danger-zone"><h2>Desactivar cuenta</h2><p>Tu cuenta quedará inactiva y no podrás iniciar sesión. Se conservan los registros del proyecto mediante borrado lógico.</p><button className="text-button danger-text" disabled={mutation.loading} onClick={() => { deactivate.clear(); setConfirmation(''); setConfirming(true); }}>Desactivar mi cuenta</button></section></aside></div>}{confirming && <Modal title="Desactivar tu cuenta" busy={deactivate.loading} onClose={() => setConfirming(false)}><p>Se desactivará tu acceso a EventPass. Tus datos se conservarán mediante borrado lógico. Tus inscripciones no se cancelan desde esta pantalla.</p><p>Si necesitas cancelar un pase, hazlo primero en <Link to="/inscripciones">Mis inscripciones</Link>.</p><form className="form-stack" onSubmit={disableAccount}><fieldset disabled={deactivate.loading}><label>Escribe DESACTIVAR para confirmar<input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" required /></label><MutationFeedback mutation={deactivate} /><div className="button-row"><button type="button" className="button secondary" onClick={() => setConfirming(false)}>Conservar cuenta</button><button type="submit" className="button danger" disabled={confirmation !== 'DESACTIVAR'}>{deactivate.loading ? 'Desactivando…' : 'Desactivar cuenta'}</button></div></fieldset></form></Modal>}</div>;
}
