import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

/**
 * Koneksi Laravel Reverb. Host default = host halaman, sehingga
 * di jaringan lab cukup membuka http://<ip-server>:5173.
 *
 * Tanpa token (mis. dashboard fasilitator) hanya channel publik yang bisa dipakai.
 */
export function createEcho(token) {
  const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'http';
  const port = Number(import.meta.env.VITE_REVERB_PORT ?? 8080);

  return new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/api/broadcasting/auth',
    auth: {
      headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' },
    },
  });
}
