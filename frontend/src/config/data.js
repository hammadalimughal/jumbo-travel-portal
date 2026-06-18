export const API_BASE = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
  window.location.port !== '6947'
    ? 'http://localhost:6947/api'
    : '/api';