// Lightweight axios network logger with optional remote shipping.
// Usage: set window.NOM035_NETWORK_LOG=true in dev console OR localStorage.setItem('nom035_netlog','1')
// To disable remote shipping: window.NOM035_NETWORK_REMOTE=false

import axios from 'axios';

const shouldLog = () => {
  return (typeof window !== 'undefined') && (
    window.NOM035_NETWORK_LOG === true ||
    localStorage.getItem('nom035_netlog') === '1'
  );
};

const remoteEnabled = () => {
  if (typeof window === 'undefined') return false;
  if (window.NOM035_NETWORK_REMOTE === false) return false;
  return true; // default on
};

function safeClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)); } catch { return obj; }
}

axios.interceptors.request.use(cfg => {
  if (shouldLog()) {
    const logObj = {
      phase: 'request',
      method: cfg.method?.toUpperCase(),
      url: cfg.baseURL ? cfg.baseURL + cfg.url : cfg.url,
      headers: cfg.headers,
      data: cfg.data,
      ts: new Date().toISOString()
    };
    // console output
    // eslint-disable-next-line no-console
    console.debug('[NET][REQ]', logObj);
    // remote ship (avoid recursion on our own log endpoint)
    if (remoteEnabled() && !/\/api\/public\/logs/.test(logObj.url)) {
      shipRemote(logObj);
    }
  }
  return cfg;
}, err => Promise.reject(err));

axios.interceptors.response.use(res => {
  if (shouldLog()) {
    const logObj = {
      phase: 'response',
      status: res.status,
      method: res.config?.method?.toUpperCase(),
      url: res.config?.baseURL ? res.config.baseURL + res.config.url : res.config?.url,
      data: safeClone(res.data),
      ts: new Date().toISOString()
    };
    // eslint-disable-next-line no-console
    console.debug('[NET][RES]', logObj);
    if (remoteEnabled() && !/\/api\/public\/logs/.test(logObj.url)) {
      shipRemote(logObj);
    }
  }
  return res;
}, err => {
  if (shouldLog()) {
    const res = err.response;
    const logObj = {
      phase: 'error',
      status: res?.status,
      method: res?.config?.method?.toUpperCase(),
      url: res?.config?.baseURL ? res.config.baseURL + res.config.url : res?.config?.url,
      data: safeClone(res?.data),
      message: err.message,
      ts: new Date().toISOString()
    };
    // eslint-disable-next-line no-console
    console.warn('[NET][ERR]', logObj);
    if (remoteEnabled()) {
      shipRemote(logObj);
    }
  }
  return Promise.reject(err);
});

let queue = [];
let flushing = false;

function shipRemote(entry) {
  queue.push(entry);
  if (!flushing) {
    flushing = true;
    setTimeout(flush, 500);
  }
}

function flush() {
  if (queue.length === 0) { flushing = false; return; }
  const batch = queue.splice(0, queue.length);
  const base = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  fetch(base + '/api/public/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch })
  }).catch(() => {/* swallow */}).finally(() => { flushing = false; });
}

// Expose helpers
if (typeof window !== 'undefined') {
  window.__NOM035_NETLOG_HELP = {
    enable: () => { localStorage.setItem('nom035_netlog','1'); },
    disable: () => { localStorage.removeItem('nom035_netlog'); }
  };
}
