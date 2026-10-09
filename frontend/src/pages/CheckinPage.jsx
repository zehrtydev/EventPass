import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMutation } from '../hooks/useRequest';
import { checkinRequest } from '../services/api';
import { formatDate } from '../services/presentation';
import { ErrorMessage } from '../components/Feedback';
import Icon from '../components/Icon';

export default function CheckinPage() {
  const { session } = useAuth();
  const mutation = useMutation();
  const inputRef = useRef(null);
  const [eventId, setEventId] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [result, setResult] = useState(null);
  const duplicate = mutation.error?.status === 409 && mutation.error?.resultado === 'DUPLICADO';
  const rejected = mutation.error?.status === 400 && mutation.error?.resultado === 'RECHAZADO';
  const finished = Boolean(result || duplicate);

  const submit = async event => {
    event.preventDefault();
    if (finished || mutation.loading || !eventId.trim() || !registrationId.trim()) return;
    const response = await mutation.run(() => checkinRequest({
      evento_id: eventId.trim(),
      inscripcion_id: registrationId.trim(),
    }, { token: session.session_token }));
    if (response) setResult(response);
  };

  const next = () => {
    setResult(null);
    mutation.clear();
    setRegistrationId('');
    inputRef.current?.focus();
  };

  return <div className="page narrow checkin-page">
    <Link to="/inscripciones" className="back-link">Mis inscripciones</Link>
    <div className="page-heading">
      <span className="eyebrow cyan-text">ACCESO AL EVENTO</span>
      <h1>Check-in digital</h1>
    </div>
    <form className="form-stack" onSubmit={submit} aria-busy={mutation.loading}>
      <fieldset disabled={mutation.loading}>
        <label>Identificador del evento
          <input name="evento_id" value={eventId} readOnly={finished} required maxLength={200} autoComplete="off" spellCheck={false}
            onChange={event => { setEventId(event.target.value); mutation.clear(); }} />
        </label>
        <label>Identificador de inscripción
          <input ref={inputRef} name="inscripcion_id" value={registrationId} readOnly={finished} required maxLength={200} autoComplete="off" spellCheck={false}
            onChange={event => { setRegistrationId(event.target.value); mutation.clear(); }} />
        </label>
        {!finished && <button className="button primary" type="submit" disabled={!eventId.trim() || !registrationId.trim()}>
          <Icon name="check" size={18} />{mutation.loading ? 'Registrando ingreso…' : 'Registrar ingreso'}
        </button>}
      </fieldset>
    </form>
    {result && <section className="checkin-result" role="status" aria-label="Resultado del check-in">
      <div className="message success"><Icon name="check" /><div><h2>Ingreso registrado</h2><p>{result.mensaje || 'Check-in realizado correctamente.'}</p></div></div>
      <dl><div><dt>Comprobante</dt><dd className="mono">{result.checkin_id}</dd></div><div><dt>Fecha de ingreso</dt><dd>{formatDate(result.fecha_checkin, true)}</dd></div></dl>
    </section>}
    {duplicate ? <div className="message info" role="status"><Icon name="info" /><div><h2>Ingreso ya registrado</h2><p>{mutation.error.message}</p></div></div>
      : mutation.error && <div>{rejected && <h2 className="checkin-error-title">Ingreso rechazado</h2>}<ErrorMessage error={mutation.error} /></div>}
    {finished && <button type="button" className="button secondary" onClick={next}>Siguiente inscripción <Icon name="arrow" size={18} /></button>}
  </div>;
}
