import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

export default function NotFoundPage() {
  return <div className="page not-found"><span className="gradient-text error-code">404</span><h1>Este universo aún no existe</h1><p>La página que buscas se ha perdido en otra dimensión.</p><Link className="button primary" to="/">Volver a mi universo <Icon name="arrow" size={18} /></Link></div>;
}
