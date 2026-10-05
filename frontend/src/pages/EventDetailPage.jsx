import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQuery } from '../hooks/useRequest';
import { catalogoRequest, inscripcionesRequest, requireObject } from '../services/api';
import { formatDate } from '../services/presentation';
import { AvailabilityBadge, CategoryBadge, EventArtwork } from '../components/EventCard';
import { ErrorMessage, LoadingSpinner, MutationFeedback, SuccessMessage } from '../components/Feedback';
import Icon from '../components/Icon';
import { RegistrationStatus } from './RegistrationsPage';

export default function EventDetailPage() {
  const { id } = useParams();
  const auth = useAuth();
  const query = useQuery(signal => catalogoRequest({ action: 'DETALLE', evento_id: id }, { signal }).then(data => requireObject(data, 'evento')), id);
  const availability = useMutation();
  const registration = useMutation();
  const [latest, setLatest] = useState(null);
  const [result, setResult] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const event = query.data;
  const refreshAvailability = async () => {
    const data = await availability.run(() => catalogoRequest({ action: 'DISPONIBILIDAD', evento_id: id }), 'Disponibilidad actualizada.');
    if (data) setLatest(data);
  };
  const submit = async e => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const data = await registration.run(() => inscripcionesRequest({ action: 'CREATE', evento_id: id, nombre_acreditacion: values.nombre_acreditacion.trim(), observaciones: values.observaciones.trim(), origen: 'WEB' }, { token: auth.session.session_token }).then(value => { requireObject(value, 'inscripcion'); return value; }));
    if (data) { setResult(data.inscripcion); setShowForm(false); refreshAvailability(); }
  };
  if (query.loading) return <LoadingSpinner label="Abriendo tu próxima experiencia…" />;
  if (query.error) return <div className="page"><Link to="/eventos" className="back-link">← Todos los eventos</Link><ErrorMessage error={query.error} onRetry={query.reload} /></div>;
  const current = latest || event;
  return <div className="page"><Link to="/eventos" className="back-link">← Todos los eventos</Link><div className="detail-grid"><article className="detail-content"><EventArtwork key={id} event={event} className="detail-art" /><div className="detail-title"><CategoryBadge category={event.categoria} /><h1>{event.nombre}</h1><p className="detail-description">{event.descripcion || 'El organizador compartirá más información próximamente.'}</p></div><dl className="detail-facts">{[['calendar', 'Fecha', formatDate(event.fecha)], ['clock', 'Hora', event.hora], ['pin', 'Lugar', event.lugar], ['user', 'Organizador', event.organizador], ['ticket', 'Capacidad', event.capacidad == null ? null : `${event.capacidad} personas`]].map(([icon, label, value]) => <div key={label}><Icon name={icon} /><dt>{label}</dt><dd>{value ?? 'Por confirmar'}</dd></div>)}</dl></article><aside className="panel booking-panel"><span className="eyebrow cyan-text">TU PASE A LA EXPERIENCIA</span><h2>Haz parte del evento</h2><AvailabilityBadge event={current} />{current.cupos_disponibles != null && <p className="availability-number"><strong>{current.cupos_disponibles}</strong> cupos disponibles</p>}<p className="muted">La asignación de tu inscripción se confirma al enviarla. Si no quedan cupos, podrás entrar en lista de espera.</p><button className="text-button" onClick={refreshAvailability} disabled={availability.loading}><Icon name="refresh" size={16} />{availability.loading ? 'Consultando…' : 'Consultar disponibilidad'}</button><MutationFeedback mutation={availability} /><hr />{result ? <><SuccessMessage>{result.estado === 'CONFIRMADA' ? '¡Ya tienes tu lugar en esta aventura!' : 'Tu inscripción fue recibida.'}</SuccessMessage><RegistrationStatus state={result.estado} />{result.orden_espera && <p>Posición en lista de espera: {result.orden_espera}</p>}<Link to="/inscripciones" className="button primary full-width">Ver mis inscripciones <Icon name="arrow" size={16} /></Link></> : auth.authenticated ? <><p className="booking-tip"><Icon name="send" size={18} /><span>Antes de inscribirte, <Link to="/vinculacion">vincula WhatsApp o Telegram</Link> para recibir confirmaciones.</span></p>{!showForm ? <button className="button primary full-width" onClick={() => setShowForm(true)}>Inscribirme <Icon name="ticket" size={18} /></button> : <form className="form-stack" onSubmit={submit}><fieldset disabled={registration.loading}><label>Nombre de acreditación<input name="nombre_acreditacion" defaultValue={auth.session.nombre} required maxLength={150} autoComplete="name" /></label><label>Observaciones <span className="muted">(opcional)</span><textarea name="observaciones" maxLength={1000} rows={3} placeholder="¿Algo que debamos saber?" /></label><MutationFeedback mutation={registration} /><button className="button primary full-width">{registration.loading ? 'Enviando inscripción…' : 'Confirmar inscripción'}</button><button type="button" className="text-button" onClick={() => { setShowForm(false); registration.clear(); }}>Volver</button></fieldset></form>}</> : <Link to="/login" state={{ from: `/eventos/${id}` }} className="button primary full-width">Iniciar sesión para inscribirse <Icon name="arrow" size={17} /></Link>}<div className="auth-note"><Icon name="shield" size={17} />Gestiona tu pase desde Mis inscripciones.</div></aside></div></div>;
}
