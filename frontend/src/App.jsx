import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Lobby from './components/Lobby';
import PlayPage from './components/PlayPage';
import { api, clearSession, loadSession, saveSession } from './lib/api';

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [state, setState] = useState(null);
  const [restoring, setRestoring] = useState(Boolean(session));
  const [notice, setNotice] = useState(null);

  // Pemulihan state setelah refresh: GET /api/rooms/{code}/state
  useEffect(() => {
    if (!session || state) return;
    let cancelled = false;
    api(`/rooms/${session.roomCode}/state`, { token: session.token })
      .then((s) => !cancelled && setState(s))
      .catch((err) => {
        if (cancelled) return;
        if ([401, 403, 404].includes(err.status)) {
          clearSession();
          setSession(null);
          setNotice('Sesi sebelumnya sudah tidak berlaku. Silakan masuk ke ruangan lagi.');
        } else {
          setNotice(err.message);
        }
      })
      .finally(() => !cancelled && setRestoring(false));
    return () => {
      cancelled = true;
    };
  }, [session, state]);

  const handleEnter = ({ session_token: token, ...initial }) => {
    const next = { token, roomCode: initial.room.room_code };
    saveSession(next);
    setSession(next);
    setState(initial);
    setNotice(null);
  };

  const handleLeave = () => {
    if (!window.confirm('Keluar dari ruangan ini? Kamu bisa masuk lagi dengan kode yang sama selama peranmu belum diambil orang lain.')) return;
    clearSession();
    setSession(null);
    setState(null);
  };

  if (restoring) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Memulihkan permainan…
      </div>
    );
  }

  if (session && state) {
    return <PlayPage session={session} initialState={state} onLeave={handleLeave} />;
  }

  return (
    <>
      {notice && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-amber-100 px-4 py-2 text-sm text-amber-900 shadow" role="status">
          {notice}
        </div>
      )}
      <Lobby onEnter={handleEnter} />
    </>
  );
}
