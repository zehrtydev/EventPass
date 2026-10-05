import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMutation } from '../hooks/useRequest';
import { vinculacionRequest, ApiError } from '../services/api';
import { formatDate } from '../services/presentation';
import { MutationFeedback } from '../components/Feedback';
import Icon from '../components/Icon';

export default function TelegramLinkPage() {
  const { session } = useAuth();
  const mutation = useMutation();
  const clipboard = useMutation();
  const [code, setCode] = useState(null);
  const generate = async () => {
    const result = await mutation.run(async () => {
      const data = await vinculacionRequest({}, { token: session.session_token });
      if (typeof data.codigo !== 'string' || !data.codigo) throw new ApiError('El servicio no devolvió un código válido.');
      return data;
    });
    if (result) { setCode(result); clipboard.clear(); }
  };
  const channels = [
    ['Telegram', 'Abre el bot de EventPass y envía el comando.'],
    ['WhatsApp', 'Escríbele al número de EventPass y envía el mismo comando.'],
  ];

  return <div className="page telegram-page">
    <div className="page-heading centered">
      <span className="icon-tile cyan large"><Icon name="send" size={36} /></span>
      <span className="eyebrow cyan-text">TU AVENTURA, SIEMPRE CERCA</span>
      <h1>Conecta tus canales</h1>
      <p>Recibe confirmaciones y recordatorios por WhatsApp, Telegram o ambos.</p>
    </div>
    <div className="telegram-grid">
      <section className="panel code-panel">
        <h2>Tu conexión empieza aquí</h2>
        <p>Genera un código personal y envíalo por el canal que prefieras.</p>
        <MutationFeedback mutation={mutation} />
        {code && <div className="generated-code">
          <span className="eyebrow">CÓDIGO DE VINCULACIÓN</span>
          <strong>{code.codigo}</strong>
          {code.expira_en && <span>Válido hasta {formatDate(code.expira_en, true)}</span>}
          <div className="command">
            <code>/vincular {code.codigo}</code>
            <button className="icon-button" aria-label="Copiar comando de vinculación" disabled={clipboard.loading} onClick={() => clipboard.run(async () => {
              if (!navigator.clipboard) throw new Error('Copia manualmente el comando que aparece en pantalla.');
              await navigator.clipboard.writeText(`/vincular ${code.codigo}`);
            }, 'Comando copiado.')}><Icon name="copy" size={18} /></button>
          </div>
          <MutationFeedback mutation={clipboard} />
        </div>}
        <button className="button primary full-width" disabled={mutation.loading} onClick={generate}>{mutation.loading ? 'Generando tu código…' : code ? 'Generar un nuevo código' : 'Generar código de vinculación'}<Icon name="arrow" size={17} /></button>
        <p className="privacy-note"><Icon name="shield" size={16} />El código es personal. No lo compartas con otras personas.</p>
      </section>
      <section className="telegram-steps">
        <h2>Vincula WhatsApp o Telegram</h2>
        {channels.map(([channel, instructions], index) => <div className="telegram-step" key={channel}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div><h3>Abre {channel}</h3><p>{instructions}</p></div>
        </div>)}
        <div className="telegram-step"><span>03</span><div><h3>Envía tu código</h3><p>Escribe <code>/vincular</code>, un espacio y el código generado.</p></div></div>
        <div className="telegram-step"><span>04</span><div><h3>Espera la confirmación</h3><p>Podrás inscribirte cuando al menos uno de los canales quede vinculado.</p></div></div>
        <Link to="/eventos" className="subtle-link">Volver a explorar eventos <Icon name="arrow" size={17} /></Link>
      </section>
    </div>
  </div>;
}
