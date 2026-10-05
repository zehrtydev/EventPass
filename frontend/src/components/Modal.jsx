import { useEffect, useRef } from 'react';
import Icon from './Icon';

export default function Modal({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => { dialog.close(); trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}><div className="section-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Cerrar ventana" onClick={onClose} disabled={busy}><Icon name="close" /></button></div>{children}</dialog>;
}
