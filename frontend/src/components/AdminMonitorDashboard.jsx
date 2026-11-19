import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, Bug, Clock, Coffee, KeyRound, Loader2, Lock, LogOut, Package, RefreshCw,
  Search, ShoppingBag, Trash2, Users, Wallet, Wifi, WifiOff,
} from 'lucide-react';
import { api, formatRupiah } from '../lib/api';
import { createEcho } from '../lib/echo';
import { CARD, TACTILE } from './game/theme';

const PIN_KEY = 'insthink.admin.passcode';
const POLL_FALLBACK_MS = 5000; // Reverb tidak tersambung
const POLL_LIVE_MS = 30000; // jaring pengaman saat Reverb tersambung
const PULSE_DEBOUNCE_MS = 700;
const DEFAULT_THRESHOLDS = { failed_attempts: 4, idle_seconds: 240 };
const STARTING_MONEY = 50000;

const PHASE = {
  prolog: { label: 'Prolog', cls: 'bg-[#f4a582]' },
  chapter1: { label: 'Bab 1: Blok Kode', cls: 'bg-[#8ec5ff]' },
  chapter2: { label: 'Bab 2: Kedai Live', cls: 'bg-[#ffd23f]' },
  finished: { label: 'Selesai', cls: 'bg-[#a5d68f]' },
};

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'help', label: 'Butuh Bantuan' },
  { key: 'playing', label: 'Sedang Bermain' },
  { key: 'done', label: 'Selesai' },
];

function readPin() {
  try {
    return sessionStorage.getItem(PIN_KEY) ?? '';
  } catch {
    return '';
  }
}

function writePin(pin) {
  try {
    if (pin) sessionStorage.setItem(PIN_KEY, pin);
    else sessionStorage.removeItem(PIN_KEY);
  } catch {
    /* penyimpanan sesi tidak tersedia: PIN hanya bertahan sampai halaman ditutup */
  }
}

function fetchRooms(pin) {
  return api('/admin/rooms', { headers: { 'X-Admin-Passcode': pin } });
}

/**
 * Dashboard Mode Fasilitator: memantau semua tim secara real-time.
 * Data lengkap diambil lewat GET /api/admin/rooms (header X-Admin-Passcode).
 * Channel publik Reverb `admin.monitor` hanya memberi sinyal "ada perubahan",
 * dengan polling 5 detik sebagai cadangan saat Reverb tidak tersambung.
 */
export default function AdminMonitorDashboard({ onExit }) {
  const [pin, setPin] = useState(readPin);
  const [initial, setInitial] = useState(null);

  const lock = useCallback(() => {
    writePin('');
    setPin('');
    setInitial(null);
  }, []);

  if (!pin) {
    return (
      <PinGate
        onExit={onExit}
        onUnlock={(validPin, data) => {
          writePin(validPin);
          setInitial(data);
          setPin(validPin);
        }}
      />
    );
  }

  return <Monitor pin={pin} initial={initial} onLock={lock} onExit={onExit} />;
}

/* ---------- Layar kunci PIN ---------- */

function PinGate({ onUnlock, onExit }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const candidate = value.trim();
    if (!candidate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRooms(candidate);
      onUnlock(candidate, data);
    } catch (err) {
      setError(err.message);
      setValue('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6ecd6] p-4">
      <form onSubmit={submit} className={`${CARD} w-full max-w-sm p-6`} aria-labelledby="pin-title">
        <button type="button" onClick={onExit} className="mb-3 flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Menu Utama
        </button>
        <div className="mb-5 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border-2 border-slate-800 bg-[#ffd23f] shadow-[3px_3px_0px_#1e293b]">
            <Lock className="h-7 w-7 text-slate-900" aria-hidden />
          </span>
          <h1 id="pin-title" className="mt-3 text-2xl font-black text-slate-900">Mode Fasilitator</h1>
          <p className="mt-1 text-sm text-slate-600">Khusus panitia. Masukkan PIN Fasilitator untuk memantau semua tim.</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-bold text-slate-700">PIN Fasilitator</span>
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            autoComplete="off"
            maxLength={100}
            className="w-full rounded-xl border-2 border-slate-800 bg-white px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] focus:outline-none focus:ring-4 focus:ring-[#e9b949]"
          />
        </label>

        {error && <p className="mt-3 rounded-lg border-2 border-rose-300 bg-rose-50 p-2 text-sm font-semibold text-rose-700" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={loading || !value.trim()}
          className={`${TACTILE} mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4f8f3a] py-3 font-black text-white disabled:opacity-60`}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <KeyRound className="h-5 w-5" aria-hidden />}
          Buka Dashboard
        </button>
      </form>
    </div>
  );
}

/* ---------- Dashboard ---------- */

function Monitor({ pin, initial, onLock, onExit }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [live, setLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => (initial ? Date.now() : null));
  const [clockOffset, setClockOffset] = useState(() => (initial ? Date.parse(initial.server_time) - Date.now() : 0));
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [confirmRoom, setConfirmRoom] = useState(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const next = await fetchRooms(pin);
      setData(next);
      setClockOffset(Date.parse(next.server_time) - Date.now());
      setLastUpdated(Date.now());
      setError(null);
    } catch (err) {
      if (err.status === 401 || err.status === 503) {
        onLock();
        return;
      }
      setError(err.message);
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [pin, onLock]);

  // Muat awal (jika belum dibawa dari layar PIN, mis. setelah refresh).
  useEffect(() => {
    if (!initial) load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reverb: sinyal perubahan → ambil ulang data (di-debounce).
  useEffect(() => {
    let echo;
    let timer;
    try {
      echo = createEcho(null);
      const connection = echo.connector?.pusher?.connection;
      connection?.bind('state_change', ({ current }) => setLive(current === 'connected'));
      setLive(connection?.state === 'connected');
      echo.channel('admin.monitor').listen('.admin.room_changed', () => {
        clearTimeout(timer);
        timer = setTimeout(load, PULSE_DEBOUNCE_MS);
      });
    } catch {
      setLive(false);
    }
    return () => {
      clearTimeout(timer);
      try {
        echo?.leave('admin.monitor');
        echo?.disconnect();
      } catch {
        /* abaikan */
      }
    };
  }, [load]);

  // Polling cadangan: 5 detik jika Reverb putus, 30 detik jika tersambung.
  useEffect(() => {
    const id = setInterval(load, live ? POLL_LIVE_MS : POLL_FALLBACK_MS);
    return () => clearInterval(id);
  }, [load, live]);

  // Jam lokal untuk durasi & deteksi diam (tanpa menunggu polling).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const thresholds = data?.thresholds ?? DEFAULT_THRESHOLDS;
  const serverNow = now + clockOffset;

  const teams = useMemo(
    () => (data?.rooms ?? []).map((room) => analyzeRoom(room, serverNow, thresholds)),
    [data, serverNow, thresholds],
  );

  const metrics = useMemo(() => ({
    active: teams.filter((t) => t.phase !== 'finished').length,
    early: teams.filter((t) => t.phase === 'prolog' || t.phase === 'chapter1').length,
    shop: teams.filter((t) => t.phase === 'chapter2').length,
    done: teams.filter((t) => t.phase === 'finished').length,
    help: teams.filter((t) => t.needsHelp).length,
  }), [teams]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teams
      .filter((t) => {
        if (filter === 'help') return t.needsHelp;
        if (filter === 'playing') return t.phase !== 'finished';
        if (filter === 'done') return t.phase === 'finished';
        return true;
      })
      .filter((t) => !q || t.room_code.toLowerCase().includes(q) || t.players.some((p) => p.name.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.needsHelp) - Number(a.needsHelp) || Number(a.phase === 'finished') - Number(b.phase === 'finished'));
  }, [teams, filter, query]);

  const filterCount = { all: teams.length, help: metrics.help, playing: metrics.active, done: metrics.done };

  const deleteRoom = async (code) => {
    await api(`/admin/rooms/${code}`, { method: 'DELETE', headers: { 'X-Admin-Passcode': pin } });
    setData((d) => d && { ...d, rooms: d.rooms.filter((r) => r.room_code !== code) });
    load();
  };

  return (
    <div className="min-h-screen bg-[#f6ecd6]">
      <header className="sticky top-0 z-30 border-b-2 border-slate-800 bg-[#fffaf0]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
          <button type="button" onClick={onExit} className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-slate-900`}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Menu Utama</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#c4562f]">Mode Fasilitator</p>
            <h1 className="truncate text-lg font-black text-slate-900">Pantauan Kelas INSTHINK</h1>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full border-2 border-slate-800 px-2.5 py-1 text-xs font-bold ${live ? 'bg-[#a5d68f] text-slate-900' : 'bg-white text-slate-700'}`}
            title={live ? 'Terhubung ke Reverb, data diperbarui saat ada perubahan.' : 'Reverb tidak tersambung, data diambil ulang tiap 5 detik.'}
          >
            {live ? <Wifi className="h-3.5 w-3.5" aria-hidden /> : <WifiOff className="h-3.5 w-3.5" aria-hidden />}
            {live ? 'Live' : 'Polling 5 dtk'}
          </span>
          <button
            type="button"
            onClick={load}
            className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-slate-900`}
            aria-label="Muat ulang data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            <span className="hidden md:inline">{lastUpdated ? `${Math.max(0, Math.round((now - lastUpdated) / 1000))} dtk lalu` : 'Muat'}</span>
          </button>
          <button type="button" onClick={onLock} className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-[#fff1c1] px-3 py-1.5 text-sm font-bold text-slate-900`}>
            <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Kunci</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <p className="mb-4 rounded-xl border-2 border-rose-400 bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">
            Gagal memuat data terbaru: {error}
          </p>
        )}

        <section aria-label="Ringkasan kelas" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard icon={Users} label="Total Tim Aktif" value={metrics.active} tone="bg-[#fff1c1]" note={metrics.help ? `${metrics.help} butuh pendampingan` : 'Semua lancar'} alert={metrics.help > 0} />
          <MetricCard icon={Bug} label="Prolog & Bab 1 (Merakit Kode)" value={metrics.early} tone="bg-[#dbeafe]" />
          <MetricCard icon={Coffee} label="Bab 2 (Simulasi Kedai Live)" value={metrics.shop} tone="bg-[#fde68a]" />
          <MetricCard icon={ShoppingBag} label="Tim Selesai" value={metrics.done} tone="bg-[#d9f0c9]" />
        </section>

        <section aria-label="Filter tim" className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 rounded-full border-2 border-slate-800 px-3 py-1.5 text-sm font-bold shadow-[2px_2px_0px_#1e293b] transition-all active:translate-y-[1px] active:shadow-none ${
                  filter === f.key ? (f.key === 'help' ? 'bg-[#c4562f] text-white' : 'bg-[#ffd23f] text-slate-900') : 'bg-white text-slate-700 hover:bg-[#fff1c1]'
                }`}
              >
                {f.label}
                <span className={`rounded-full px-1.5 text-xs ${filter === f.key ? 'bg-white/80 text-slate-900' : 'bg-slate-100'}`}>{filterCount[f.key]}</span>
              </button>
            ))}
          </div>
          <label className="relative md:ml-auto md:w-80">
            <span className="sr-only">Cari nama siswa atau kode room</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama siswa atau kode room…"
              className="w-full rounded-xl border-2 border-slate-800 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#e9b949]"
            />
          </label>
        </section>

        {!data ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Memuat data kelas…
          </p>
        ) : visible.length === 0 ? (
          <p className={`${CARD} mt-6 p-8 text-center font-semibold text-slate-600`}>
            {teams.length === 0 ? 'Belum ada ruangan. Tim yang membuat ruangan akan muncul di sini.' : 'Tidak ada tim yang cocok dengan filter atau pencarian.'}
          </p>
        ) : (
          <section aria-label="Daftar tim" className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((team) => (
              <TeamCard key={team.room_code} team={team} thresholds={thresholds} onDelete={() => setConfirmRoom(team.room_code)} />
            ))}
          </section>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Badge “Butuh Pendampingan” muncul jika tim gagal uji kode ≥ {thresholds.failed_attempts} kali
          atau tidak ada aktivitas lebih dari {Math.round(thresholds.idle_seconds / 60)} menit pada fase aktif.
        </p>
      </main>

      {confirmRoom && <ConfirmDelete code={confirmRoom} onCancel={() => setConfirmRoom(null)} onConfirm={deleteRoom} />}
    </div>
  );
}

/* ---------- Analisis tim ---------- */

function secondsSince(iso, serverNow) {
  if (!iso) return null;
  return Math.max(0, Math.floor((serverNow - Date.parse(iso)) / 1000));
}

function progressOf(room) {
  const players = room.players;
  switch (room.phase) {
    case 'prolog':
      return 5 + players.filter((p) => p.is_prolog_ready).length * 5;
    case 'chapter1':
      return 20 + players.filter((p) => p.is_chapter1_done).length * 10;
    case 'chapter2': {
      const span = Math.max(1, room.target_money - STARTING_MONEY);
      const ratio = Math.min(1, Math.max(0, (room.shared_money - STARTING_MONEY) / span));
      return Math.round(45 + ratio * 54);
    }
    case 'finished':
      return 100;
    default:
      return 0;
  }
}

function analyzeRoom(room, serverNow, thresholds) {
  const isActive = room.phase !== 'finished';
  const idleSeconds = secondsSince(room.last_activity_at, serverNow);
  const reasons = [];
  if (isActive && room.failed_attempts >= thresholds.failed_attempts) {
    reasons.push(`Gagal uji kode ${room.failed_attempts}×`);
  }
  if (isActive && idleSeconds != null && idleSeconds > thresholds.idle_seconds) {
    reasons.push(`Tidak ada aktivitas ${Math.floor(idleSeconds / 60)} menit`);
  }

  const start = room.started_at ?? room.created_at;
  const end = room.completed_at ? Date.parse(room.completed_at) : serverNow;
  const durationSeconds = start ? Math.max(0, Math.floor((end - Date.parse(start)) / 1000)) : null;

  return { ...room, idleSeconds, durationSeconds, reasons, needsHelp: reasons.length > 0, progress: progressOf(room) };
}

function clock(seconds) {
  if (seconds == null) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function ago(seconds) {
  if (seconds == null) return '-';
  if (seconds < 60) return `${seconds} dtk lalu`;
  return `${Math.floor(seconds / 60)} mnt lalu`;
}

/* ---------- Komponen tampilan ---------- */

function MetricCard({ icon: Icon, label, value, tone, note, alert }) {
  return (
    <div className={`${CARD} flex items-center gap-3 p-4 ${tone}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-slate-800 bg-white shadow-[2px_2px_0px_#1e293b]">
        <Icon className="h-5 w-5 text-slate-900" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-3xl font-black leading-none text-slate-900">{value}</p>
        <p className="mt-1 text-xs font-bold leading-tight text-slate-700">{label}</p>
        {note && <p className={`mt-0.5 text-[11px] font-bold ${alert ? 'text-[#c4562f]' : 'text-slate-500'}`}>{note}</p>}
      </div>
    </div>
  );
}

const ROLE_ROWS = [
  { role: 'cashier', label: 'Kasir', icon: Coffee },
  { role: 'warehouse', label: 'Stok Gudang', icon: Package },
];

function TeamCard({ team, thresholds, onDelete }) {
  const phase = PHASE[team.phase] ?? { label: team.phase, cls: 'bg-white' };
  const idleWarn = team.phase !== 'finished' && team.idleSeconds != null && team.idleSeconds > thresholds.idle_seconds;

  return (
    <article
      className={`${CARD} flex flex-col p-4 ${team.needsHelp ? '!border-[#c4562f] ring-4 ring-[#c4562f]/30' : ''}`}
      aria-label={`Tim ${team.room_code}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg border-2 border-slate-800 bg-white px-2 py-0.5 font-mono text-lg font-black tracking-widest text-slate-900">{team.room_code}</span>
        <span className={`rounded-full border-2 border-slate-800 px-2.5 py-0.5 text-xs font-black text-slate-900 ${phase.cls}`}>{phase.label}</span>
        {team.players.length < 2 && team.phase !== 'finished' && (
          <span className="rounded-full border-2 border-dashed border-slate-500 px-2 py-0.5 text-[11px] font-bold text-slate-600">Menunggu partner</span>
        )}
      </div>

      {team.needsHelp && (
        <div className="mt-3 animate-pulse rounded-xl border-2 border-slate-800 bg-[#c4562f] px-3 py-2 text-white shadow-[2px_2px_0px_#1e293b]" role="status">
          <p className="flex items-center gap-1.5 text-sm font-black">
            <AlertTriangle className="h-4 w-4" aria-hidden /> Butuh Pendampingan
          </p>
          <p className="text-xs font-semibold">{team.reasons.join(' · ')}</p>
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {ROLE_ROWS.map(({ role, label, icon: Icon }) => {
          const p = team.players.find((x) => x.role === role);
          return (
            <li key={role} className="flex items-center gap-2 rounded-xl border-2 border-slate-800 bg-white px-2.5 py-1.5">
              <Icon className="h-4 w-4 shrink-0 text-slate-700" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
                <span className={`block truncate text-sm font-bold ${p ? 'text-slate-900' : 'italic text-slate-400'}`}>{p ? p.name : 'Belum bergabung'}</span>
              </span>
              {p && (
                <span className="flex shrink-0 gap-1">
                  <ReadyChip on={p.is_prolog_ready} label="Prolog" />
                  <ReadyChip on={p.is_chapter1_done} label="Bab 1" />
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
          <span>Progres</span>
          <span>{team.progress}%</span>
        </div>
        <div className="h-3.5 overflow-hidden rounded-full border-2 border-slate-800 bg-white">
          <div
            className={`h-full transition-all duration-700 ${team.phase === 'finished' ? 'bg-[#4f8f3a]' : 'bg-[#e9b949]'}`}
            style={{ width: `${team.progress}%` }}
          />
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Stat icon={Wallet} label="Kas Bersama" value={formatRupiah(team.shared_money)} sub={`target ${formatRupiah(team.target_money)}`} />
        <Stat icon={ShoppingBag} label="Pelanggan" value={`${team.customers_served} terlayani`} />
        <Stat icon={Clock} label="Durasi" value={clock(team.durationSeconds)} sub={`aktif ${ago(team.idleSeconds)}`} warn={idleWarn} />
        <Stat icon={Bug} label="Gagal uji kode" value={`${team.failed_attempts}×`} warn={team.failed_attempts >= thresholds.failed_attempts && team.phase !== 'finished'} />
      </dl>

      <button
        type="button"
        onClick={onDelete}
        className={`${TACTILE} mt-4 flex items-center justify-center gap-1.5 self-end rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#c4562f] hover:bg-rose-50`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Hapus Room
      </button>
    </article>
  );
}

function ReadyChip({ on, label }) {
  return (
    <span
      className={`rounded-full border-2 px-1.5 text-[10px] font-black ${on ? 'border-slate-800 bg-[#a5d68f] text-slate-900' : 'border-slate-300 bg-slate-50 text-slate-400'}`}
      title={`${label}: ${on ? 'sudah' : 'belum'}`}
    >
      {on ? '✓' : '…'} {label}
    </span>
  );
}

function Stat({ icon: Icon, label, value, sub, warn }) {
  return (
    <div className={`rounded-xl border-2 px-2.5 py-1.5 ${warn ? 'border-[#c4562f] bg-rose-50' : 'border-slate-200 bg-[#fffdf7]'}`}>
      <dt className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
        <Icon className="h-3 w-3" aria-hidden /> {label}
      </dt>
      <dd className={`font-black ${warn ? 'text-[#c4562f]' : 'text-slate-900'}`}>{value}</dd>
      {sub && <dd className="text-[11px] text-slate-500">{sub}</dd>}
    </div>
  );
}

function ConfirmDelete({ code, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(code);
      onCancel();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className={`${CARD} celebration-pop w-full max-w-sm p-5`}>
        <h2 id="confirm-title" className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Trash2 className="h-5 w-5 text-[#c4562f]" aria-hidden /> Hapus room {code}?
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          Data pemain, progres, dan catatan kode tim ini akan dihapus permanen. Siswa di ruangan ini harus membuat ruangan baru.
        </p>
        {error && <p className="mt-3 rounded-lg border-2 border-rose-300 bg-rose-50 p-2 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className={`${TACTILE} rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900`}>
            Batal
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            autoFocus
            className={`${TACTILE} flex items-center gap-1.5 rounded-xl bg-[#c4562f] px-4 py-2 text-sm font-black text-white disabled:opacity-60`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
