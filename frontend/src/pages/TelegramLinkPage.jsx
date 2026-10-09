import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTelegram } from '../contexts/TelegramContext';
import { useMutation } from '../hooks/useRequest';
import { vinculacionRequest, ApiError } from '../services/api';
import { formatDate } from '../services/presentation';
import { ErrorMessage, LoadingSpinner, MutationFeedback, SuccessMessage } from '../components/Feedback';
import Icon from '../components/Icon';

export default function TelegramLinkPage() {
  const { session } = useAuth();
  const telegram = useTelegram();
  const mutation = useMutation();
  const clipboard = useMutation();
  const [code, setCode] = useState(null);
  useEffect(() => {
    if (telegram.linked === true) { setCode(null); return; }
    if (!code || telegram.loading || telegram.error || Date.parse(code.expira_en) <= Date.now()) return;
    const timer = setTimeout(() => {
      if (document.visibilityState === 'visible') telegram.refresh();
    }, 10000);
    return () => clearTimeout(timer);
  }, [code, telegram.linked, telegram.loading, telegram.error, telegram.refresh]);
  const generate = async () => {
    if (telegram.linked !== false || telegram.loading) return;
    const result = await mutation.run(async () => {
      const data = await vinculacionRequest({}, { token: session.session_token });
      if (typeof data.codigo !== 'string' || !data.codigo) throw new ApiError('El servicio no devolvió un código válido.');
      return data;
    });
    if (result) { setCode(result); clipboard.clear(); }
  };
  return <div className="page telegram-page">
    <div className="page-heading centered">
      <span className="icon-tile cyan large"><Icon name={telegram.linked === true ? 'check' : 'send'} size={36} /></span>
      <span className="eyebrow cyan-text">TU AVENTURA, SIEMPRE CERCA</span>
      <h1>{telegram.linked === true ? 'Telegram conectado' : 'Tu cuenta de Telegram'}</h1>
    </div>
    {telegram.loading ? <LoadingSpinner label="Consultando tu conexión con Telegram…" />
      : telegram.error ? <ErrorMessage error={telegram.error} onRetry={telegram.refresh} />
      : telegram.linked === true ? <section className="centered">
        <SuccessMessage>Tu cuenta de Telegram ya está vinculada. Recibirás allí las confirmaciones y los recordatorios de tus eventos.</SuccessMessage>
        <Link to="/eventos" className="button primary">Explorar eventos <Icon name="arrow" size={17} /></Link>
      </section>
      : telegram.linked === false && <div className="telegram-grid">
        <section className="panel code-panel">
          <h2>Conecta tu Telegram</h2>
          <p>Genera un código personal y envíalo al bot de EventPass en Telegram.</p>
          <MutationFeedback mutation={mutation} />
          {code && <div className="generated-code">
            <span className="eyebrow">CÓDIGO DE VINCULACIÓN</span><strong>{code.codigo}</strong>
            {code.expira_en && <span>Válido hasta {formatDate(code.expira_en, true)}</span>}
            <div className="command"><code>/vincular {code.codigo}</code>
              <button className="icon-button" aria-label="Copiar comando de vinculación" disabled={clipboard.loading} onClick={() => clipboard.run(async () => {
                if (!navigator.clipboard) throw new Error('Copia manualmente el comando que aparece en pantalla.');
                await navigator.clipboard.writeText(`/vincular ${code.codigo}`);
              }, 'Comando copiado.')}><Icon name="copy" size={18} /></button>
            </div><MutationFeedback mutation={clipboard} />
          </div>}
          <button className="button primary full-width" disabled={mutation.loading} onClick={generate}>{mutation.loading ? 'Generando tu código…' : code ? 'Generar un nuevo código' : 'Generar código de vinculación'}<Icon name="arrow" size={17} /></button>
          {code && <button className="text-button" disabled={mutation.loading} onClick={telegram.refresh}><Icon name="refresh" size={17} />Comprobar vinculación</button>}
          <p className="privacy-note"><Icon name="shield" size={16} />El código es personal. No lo compartas con otras personas.</p>
        </section>
        <section className="telegram-steps"><h2>Solo cuatro pasos</h2>
          {[['Abre Telegram', 'Usa la aplicación en tu móvil o en tu computador.'], ['Encuentra al bot de EventPass', 'Abre el bot configurado para este proyecto. Si no tienes su enlace, solicítalo al organizador.'], ['Envía tu código', 'Escribe /vincular seguido de un espacio y el código generado.'], ['Espera la confirmación', 'El bot te confirmará la vinculación. Después, vuelve a EventPass para inscribirte.']].map(([title, text], index) => <div className="telegram-step" key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}
          <Link to="/eventos" className="subtle-link">Volver a explorar eventos <Icon name="arrow" size={17} /></Link>
        </section>
      </div>}
  </div>;
}
