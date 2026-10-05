import Icon from './Icon';

export function LoadingSpinner({ label = 'Cargando…' }) {
  return <div className="loading" role="status"><span className="spinner" />{label}</div>;
}
export function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  return <div className="message error" role="alert"><Icon name="info" /><div>{error.message || error}{onRetry && <button className="text-button" onClick={onRetry}>Volver a intentar <Icon name="refresh" size={15} /></button>}</div></div>;
}
export function SuccessMessage({ children }) {
  return children ? <div className="message success" role="status"><Icon name="check" /><div>{children}</div></div> : null;
}
export function EmptyState({ icon = 'ticket', title, children, action }) {
  return <div className="empty-state"><span className="icon-tile"><Icon name={icon} size={28} /></span><h3>{title}</h3><p>{children}</p>{action}</div>;
}
export function MutationFeedback({ mutation }) {
  return <><ErrorMessage error={mutation.error} /><SuccessMessage>{mutation.success}</SuccessMessage></>;
}
