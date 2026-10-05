import { useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryStyle, formatDate, safeImageUrl } from '../services/presentation';
import Icon from './Icon';

export function CategoryBadge({ category }) {
  const { tone, icon, label } = categoryStyle(category);
  return <span className={`category-badge ${tone}`}><Icon name={icon} size={16} />{label}</span>;
}
export function AvailabilityBadge({ event }) {
  if (typeof event.disponible !== 'boolean') return <span className="status neutral">Por consultar</span>;
  return <span className={`status ${event.disponible ? 'available' : 'waiting'}`}><span className="status-dot" />{event.disponible ? 'Disponible' : 'Lista de espera'}</span>;
}
export function EventArtwork({ event, className = '' }) {
  const [failed, setFailed] = useState(false);
  const url = safeImageUrl(event.imagen_url);
  const style = categoryStyle(event.categoria);
  return <div className={`event-art ${style.tone} ${className}`}>{url && !failed ? <img src={url} alt={event.nombre} onError={() => setFailed(true)} loading="lazy" /> : <><div className="art-orbit" /><Icon name={style.icon} size={76} /><span className="art-caption">{style.label} / EventPass</span></>}</div>;
}
export default function EventCard({ event }) {
  return <article className="event-card"><Link to={`/eventos/${encodeURIComponent(event.evento_id)}`} className="event-image-link" aria-label={`Ver ${event.nombre}`} tabIndex={-1}><EventArtwork event={event} /><div className="card-badges"><CategoryBadge category={event.categoria} /><AvailabilityBadge event={event} /></div></Link><div className="event-body"><h3><Link to={`/eventos/${encodeURIComponent(event.evento_id)}`}>{event.nombre}</Link></h3><p>{event.descripcion || 'Descubre todos los detalles de esta experiencia.'}</p><div className="event-meta"><span><Icon name="calendar" size={15} />{formatDate(event.fecha)}</span><span><Icon name="clock" size={15} />{event.hora || 'Por confirmar'}</span></div><div className="event-place"><Icon name="pin" size={15} /><span>{event.lugar || 'Lugar por confirmar'}</span></div><Link className="card-link" to={`/eventos/${encodeURIComponent(event.evento_id)}`}>Ver detalle <Icon name="arrow" size={17} /></Link></div></article>;
}
