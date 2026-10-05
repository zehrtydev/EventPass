import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQuery } from '../hooks/useRequest';
import { catalogoRequest, inscripcionesRequest, requireList } from '../services/api';
import { formatDate } from '../services/presentation';
import { EmptyState, ErrorMessage, LoadingSpinner, MutationFeedback, SuccessMessage } from '../components/Feedback';
import Icon from '../components/Icon';
import Modal from '../components/Modal';

export function RegistrationStatus({ state }) {
  const labels = { CONFIRMADA: ['available', 'Confirmada'], LISTA_ESPERA: ['waiting', 'Lista de espera'], CANCELADA: ['cancelled', 'Cancelada'] };
  const [tone, label] = labels[state] || ['neutral', state || 'Por confirmar'];
  return <span className={`status ${tone}`}><span className="status-dot" />{label}</span>;
}

function RegistrationModal({ item, mode, onClose, onSaved }) {
  const { session } = useAuth();
  const mutation = useMutation();
  const submit = async event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const data = await mutation.run(() => inscripcionesRequest({ action: mode === 'edit' ? 'UPDATE' : 'CANCEL', inscripcion_id: item.inscripcion_id, ...(mode === 'edit' ? { nombre_acreditacion: fields.nombre_acreditacion.trim(), observaciones: fields.observaciones.trim() } : {}) }, { token: session.session_token }));
    if (data) onSaved(data.mensaje || 'Operación completada.');
  };
  return <Modal title={mode === 'edit' ? 'Edita tu acreditación' : '¿Cancelar tu inscripción?'} onClose={onClose} busy={mutation.loading}><form className="form-stack" onSubmit={submit}><fieldset disabled={mutation.loading}>{mode === 'edit' ? <><label>Nombre de acreditación<input name="nombre_acreditacion" defaultValue={item.nombre_acreditacion} required maxLength={150} /></label><label>Observaciones <span className="muted">(opcional)</span><textarea name="observaciones" defaultValue={item.observaciones} rows={4} maxLength={1000} /></label></> : <><p>Cancelarás la inscripción de <strong>{item.nombre_acreditacion}</strong> al evento <strong>{item.evento_id}</strong>.</p><p>Perderás tu cupo o tu posición en la lista de espera. Esta acción no se puede deshacer.</p></>}<MutationFeedback mutation={mutation} /><div className="button-row"><button type="button" className="button secondary" onClick={onClose}>{mode === 'edit' ? 'Volver' : 'Conservar inscripción'}</button><button type="submit" className={`button ${mode === 'edit' ? 'primary' : 'danger'}`}>{mutation.loading ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Sí, cancelar inscripción'}</button></div></fieldset></form></Modal>;
}

export default function RegistrationsPage() {
  const { session } = useAuth();
  const query = useQuery(signal => inscripcionesRequest({ action: 'LIST' }, { token: session.session_token, signal }).then(data => requireList(data, 'inscripciones')), session.session_token);
  const catalog = useQuery(signal => catalogoRequest({ action: 'LISTADO' }, { signal }).then(data => requireList(data, 'eventos')));
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');
  const items = (query.data || []).filter(item => !filter || item.estado === filter);
  return <div className="page"><div className="page-heading"><span className="eyebrow cyan-text">TUS PASES, TUS HISTORIAS</span><h1>Mis inscripciones</h1><p>Gestiona tu acreditación y consulta el estado de cada aventura.</p></div><div className="section-heading registration-toolbar"><div className="category-filters">{[['', 'Todas'], ['CONFIRMADA', 'Confirmadas'], ['LISTA_ESPERA', 'En espera'], ['CANCELADA', 'Canceladas']].map(([value, label]) => <button key={value} className={`category-filter all ${value === filter ? 'selected' : ''}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><button className="text-button" onClick={query.reload} disabled={query.loading}><Icon name="refresh" size={16} />Actualizar</button></div><SuccessMessage>{message}</SuccessMessage>{query.loading ? <LoadingSpinner label="Consultando tus inscripciones…" /> : query.error ? <ErrorMessage error={query.error} onRetry={query.reload} /> : !items.length ? <EmptyState title={filter ? 'No hay inscripciones con este estado' : 'Tu próxima historia aún está por escribir'} action={<Link className="button primary" to="/eventos">Explorar eventos <Icon name="arrow" size={17} /></Link>}>Cuando te inscribas en un evento, encontrarás aquí todos los detalles de tu pase.</EmptyState> : <div className="registrations-list">{items.map(item => {
    const event = catalog.data?.find(event => event.evento_id === item.evento_id);
    const editable = ['CONFIRMADA', 'LISTA_ESPERA'].includes(item.estado);
    return <article className="panel registration-card" key={item.inscripcion_id}><div className="registration-card-top"><span className="icon-tile"><Icon name="ticket" size={26} /></span><div><p className="eyebrow">PASE EVENTPASS</p><h2><Link to={`/eventos/${encodeURIComponent(item.evento_id)}`}>{event?.nombre || item.evento_id}</Link></h2></div><RegistrationStatus state={item.estado} /></div><dl className="registration-facts"><div><dt>Acreditación</dt><dd>{item.nombre_acreditacion || 'Sin nombre'}</dd></div><div><dt>Fecha de inscripción</dt><dd>{formatDate(item.fecha_inscripcion, true)}</dd></div><div><dt>Identificador del evento</dt><dd className="mono">{item.evento_id}</dd></div>{item.orden_espera != null && item.estado === 'LISTA_ESPERA' && <div><dt>Posición en lista de espera</dt><dd>{item.orden_espera}</dd></div>}<div className="observations"><dt>Observaciones</dt><dd>{item.observaciones || 'Sin observaciones'}</dd></div></dl>{editable && <div className="button-row"><button className="button secondary small" onClick={() => { setMessage(''); setModal({ item, mode: 'edit' }); }}>Editar acreditación</button><button className="text-button danger-text" onClick={() => { setMessage(''); setModal({ item, mode: 'cancel' }); }}>Cancelar inscripción</button></div>}</article>;
  })}</div>}{modal && <RegistrationModal {...modal} onClose={() => setModal(null)} onSaved={text => { setModal(null); setMessage(text); query.reload(); }} />}</div>;
}
