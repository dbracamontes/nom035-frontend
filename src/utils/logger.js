// Lightweight UI logger for components.
// Enable with: window.NOM035_UI_LOG=true or localStorage.setItem('nom035_uilog','1')
// Optionally ship to backend: window.NOM035_UI_REMOTE !== false (default true)

const shouldLog = () => {
  if (typeof window === 'undefined') return false;
  const enabled = window.NOM035_UI_LOG === true || localStorage.getItem('nom035_uilog') === '1';
  // Auto-enable in development if not explicitly disabled
  if (!enabled && process.env.NODE_ENV === 'development' && window.NOM035_UI_AUTO !== false) {
    try { localStorage.setItem('nom035_uilog','1'); return true; } catch(_) {}
  }
  return enabled;
};

const remoteEnabled = () => {
  if (typeof window === 'undefined') return false;
  if (window.NOM035_UI_REMOTE === false) return false;
  return true;
};

function shipRemote(entry) {
  try {
    const base = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    fetch(base + '/api/public/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: [entry] })
    }).catch(() => {});
  } catch (_) {}
}

function now() { return new Date().toISOString(); }

export function getLogger(scope = 'UI') {
  const common = { scope };
  const emit = (level, msg, extra) => {
    if (!shouldLog()) return;
    const payload = { level, ts: now(), msg, ...common, ...extra };
    try {
      // eslint-disable-next-line no-console
      (level === 'error' || level === 'warn' ? console.warn : console.debug)(`[${scope}] ${msg}`, extra || '');
    } catch(_) {}
    if (remoteEnabled()) shipRemote(payload);
  };
  return {
    debug: (msg, extra) => emit('debug', msg, extra),
    info: (msg, extra) => emit('info', msg, extra),
    warn: (msg, extra) => emit('warn', msg, extra),
    error: (msg, extra) => emit('error', msg, extra)
  };
}

// Expose helpers in window for quick toggling
if (typeof window !== 'undefined') {
  window.__NOM035_UILOG_HELP = {
    enable: () => localStorage.setItem('nom035_uilog','1'),
    disable: () => localStorage.removeItem('nom035_uilog')
  };
}