import { useEffect, useState } from 'react';
import AdminMonitorDashboard from './components/AdminMonitorDashboard';
import { Loader2 } from 'lucide-react';
import Lobby from './components/Lobby';
import MainMenu from './components/MainMenu';
import PlayPage from './components/PlayPage';
import PythonMateriModule from './components/PythonMateriModule';
import IcebreakingMiniGame from './components/IcebreakingMiniGame';
import { api, clearSession, loadSession, saveSession } from './lib/api';

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [state, setState] = useState(null);
  const [restoring, setRestoring] = useState(Boolean(session));
  const [notice, setNotice] = useState(null);
  // Tahap klien: 'menu' | 'materi' | 'icebreaking' | 'game' (lobby → ruangan co-op).
  const [stage, setStage] = useState('menu');
  // Mode Fasilitator di rute /admin, terpisah dari sesi pemain.
  const [adminMode, setAdminMode] = useState(() => isAdminPath());

  useEffect(() => {
    const onPop = () => setAdminMode(isAdminPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openAdmin = () => {
    window.history.pushState(null, '', '/admin');
    setAdminMode(true);
  };
  const closeAdmin = () => {
    window.history.pushState(null, '', '/');
    setAdminMode(false);
  };

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

  if (adminMode) {
    return <AdminMonitorDashboard onExit={closeAdmin} />;
  }

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
      {stage === 'menu' && <MainMenu onSelect={setStage} onOpenAdmin={openAdmin} />}
      {stage === 'materi' && <PythonMateriModule onBack={() => setStage('menu')} onNext={() => setStage('icebreaking')} />}
      {stage === 'icebreaking' && <IcebreakingMiniGame onBack={() => setStage('menu')} onStartGame={() => setStage('game')} />}
      {stage === 'game' && <Lobby onEnter={handleEnter} onBack={() => setStage('menu')} />}
    </>
  );
}

function isAdminPath() {
  return window.location.pathname.replace(/\/+$/, '') === '/admin';
}
