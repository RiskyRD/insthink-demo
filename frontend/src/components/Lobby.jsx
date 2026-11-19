import { useState } from 'react';
import { ArrowLeft, Coffee, Loader2, LogIn, Package, PlusCircle, Sprout } from 'lucide-react';
import { api, ROLE_LABEL } from '../lib/api';

const ROLE_INFO = {
  cashier: { icon: Coffee, desc: 'Melayani pelanggan, meracik menu, dan memastikan kembalian tidak salah hitung.' },
  warehouse: { icon: Package, desc: 'Memantau 6 bahan baku, restock tepat waktu, dan menjaga kas agar tidak overstock.' },
};

/** Membuat ruangan baru atau bergabung dengan kode 6 karakter. */
export default function Lobby({ onEnter, onBack }) {
  const [mode, setMode] = useState('create');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [role, setRole] = useState('cashier');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body = { player_name: name.trim(), role: mode === 'create' ? role : role || undefined };
      if (mode === 'join') body.room_code = roomCode.trim().toUpperCase();
      const state = await api('/rooms', { method: 'POST', body });
      onEnter(state);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        {onBack && (
          <button type="button" onClick={onBack} className="mb-2 flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-emerald-700">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Menu Utama
          </button>
        )}
        <div className="mb-6 text-center">
          <Sprout className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
          <h1 className="mt-2 text-2xl font-bold text-slate-900">INSTHINK</h1>
          <p className="text-sm text-slate-500">Kedai Kopi &amp; Camilan Desa</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {[['create', 'Buat Ruangan', PlusCircle], ['join', 'Gabung Ruangan', LogIn]].map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setMode(key); setRole(key === 'create' ? 'cashier' : ''); }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium ${mode === key ? 'bg-white text-emerald-700 shadow' : 'text-slate-600'}`}
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </button>
          ))}
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Nama kamu</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={50}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </label>

        {mode === 'join' && (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Kode ruangan</span>
            <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} required minLength={6} maxLength={6}
              placeholder="contoh: K7QH2M"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase tracking-widest focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </label>
        )}

        <fieldset className="mb-5">
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Pilih peran {mode === 'join' && <span className="font-normal text-slate-400">(kosongkan untuk peran yang tersisa)</span>}
          </legend>
          <div className="grid gap-2">
            {Object.entries(ROLE_INFO).map(([key, { icon: Icon, desc }]) => (
              <button key={key} type="button" onClick={() => setRole(mode === 'join' && role === key ? '' : key)}
                className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left ${role === key ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                aria-pressed={role === key}>
                <Icon className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden />
                <span>
                  <span className="block font-semibold text-slate-900">{ROLE_LABEL[key]}</span>
                  <span className="text-xs text-slate-500">{desc}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}

        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
          {mode === 'create' ? 'Buat Ruangan' : 'Masuk ke Ruangan'}
        </button>
      </form>
    </div>
  );
}
