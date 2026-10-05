import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMutation } from '../hooks/useRequest';
import { usuariosRequest } from '../services/api';
import { ErrorMessage, MutationFeedback, SuccessMessage } from '../components/Feedback';
import Icon from '../components/Icon';

export default function AuthPage({ register = false }) {
  const auth = useAuth();
  const mutation = useMutation();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from;
  const destination = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/cuenta';
  if (auth.authenticated) return <Navigate to={destination} replace />;
  const submit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (register && values.password !== values.confirmPassword) {
      form.elements.confirmPassword.setCustomValidity('Las contraseñas no coinciden.');
      form.elements.confirmPassword.reportValidity();
      return;
    }
    const result = await mutation.run(async () => {
      if (register) return usuariosRequest({ action: 'create', nombre: values.nombre.trim(), email: values.email.trim(), password: values.password });
      await auth.login({ email: values.email.trim(), password: values.password });
      return { ok: true };
    });
    if (result) {
      form.reset();
      navigate(register ? '/login' : destination, { replace: true, state: register ? { registered: true, from } : null });
    }
  };
  return <div className="auth-page"><aside className="auth-visual"><span className="eyebrow">TU COMUNIDAD TE ESPERA</span><h2>Un pase.<br /><span className="gradient-text">Mil historias.</span></h2><p>Los mejores momentos empiezan cuando encuentras a quienes comparten lo que te apasiona.</p><span className="auth-visual-caption"><Icon name="star" size={17} />Anime · Cosplay · Gaming · Ciencia ficción</span></aside><section className="auth-form-wrap"><Link to="/" className="back-link">← Volver al inicio</Link><span className="icon-tile"><Icon name={register ? 'ticket' : 'user'} size={26} /></span><h1>{register ? 'Tu universo empieza aquí' : 'Qué bueno verte de nuevo'}</h1><p>{register ? 'Crea tu cuenta y prepárate para tu próxima aventura.' : 'Inicia sesión y continúa tu experiencia EventPass.'}</p>{location.state?.registered && <SuccessMessage>Cuenta creada correctamente. Ya puedes iniciar sesión.</SuccessMessage>}{auth.notice && <div className="message info" role="status">{auth.notice}</div>}{auth.status === 'error' && <ErrorMessage error={auth.error} onRetry={() => auth.validate()} />}<form onSubmit={submit} className="form-stack"><fieldset disabled={mutation.loading || auth.status === 'checking'}>{register && <label>Nombre<input name="nombre" autoComplete="name" required maxLength={150} placeholder="¿Cómo te llamas?" /></label>}<label>Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="tu@correo.com" /></label><label>Contraseña<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required placeholder={register ? 'Crea una contraseña' : 'Tu contraseña'} /></label>{register && <label>Confirmar contraseña<input name="confirmPassword" type="password" autoComplete="new-password" required onInput={event => event.target.setCustomValidity('')} placeholder="Repite tu contraseña" /></label>}<MutationFeedback mutation={mutation} /><button type="submit" className="button primary full-width">{mutation.loading ? 'Un momento…' : auth.status === 'checking' ? 'Validando sesión…' : register ? 'Crear mi cuenta' : 'Iniciar sesión'}<Icon name="arrow" size={18} /></button></fieldset></form><p className="auth-switch">{register ? '¿Ya eres parte de la comunidad?' : '¿Aún no tienes cuenta?'} <Link to={register ? '/login' : '/registro'} state={{ from }}>{register ? 'Inicia sesión' : 'Crea tu cuenta'}</Link></p><div className="auth-note"><Icon name="shield" size={17} />Tu contraseña nunca se guarda en este dispositivo.</div></section></div>;
}
