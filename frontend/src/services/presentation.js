export function categoryStyle(value = '') {
  const normalized = value.toUpperCase();
  if (normalized.includes('ANIME')) return { tone: 'pink', icon: 'anime', label: 'Anime' };
  if (normalized.includes('COSPLAY')) return { tone: 'purple', icon: 'mask', label: 'Cosplay' };
  if (normalized.includes('GAM')) return { tone: 'cyan', icon: 'game', label: 'Gaming' };
  if (normalized.includes('FICC') || normalized.includes('SCI')) return { tone: 'blue', icon: 'planet', label: 'Ciencia ficción' };
  return { tone: 'amber', icon: 'star', label: value.replaceAll('_', ' ') || 'Evento' };
}

export function formatDate(value, time = false) {
  if (!value) return 'Por confirmar';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(date);
}

export function safeImageUrl(value) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}
