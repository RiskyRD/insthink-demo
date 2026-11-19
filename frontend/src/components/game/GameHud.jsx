import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Lock, LogOut, Sprout, Wifi, WifiOff } from 'lucide-react';
import { AvatarHead } from './ShopCharacters';
import SoundToggle from './SoundToggle';
import { useGameAudio } from './useGameAudio';
import { ROLE_LABEL } from '../../lib/api';
import { WOOD_BG } from './theme';

/** Bar atas bergaya HUD game: pos misi berbentuk bintang, papan kayu kode ruang, dan kontrol audio. */
export default function GameHud({ room, me, partner, realtime, onLeave }) {
  const { playClick } = useGameAudio();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copyCode = () => {
    playClick();
    navigator.clipboard?.writeText(room.room_code).then(() => {
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };

  return (
    <header className="sticky top-0 z-30 border-b-2 border-slate-800 bg-[#fffaf0]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-2.5">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-800 bg-emerald-500 shadow-[2px_2px_0px_#1e293b]">
            <Sprout className="h-6 w-6 text-white" aria-hidden />
          </span>
          <div>
            <p className="text-lg font-black leading-none tracking-tight text-slate-900">INSTHINK</p>
            <p className="text-[11px] font-semibold text-emerald-800">Kedai Kopi &amp; Camilan Desa</p>
          </div>
        </div>

        <MissionPosts current={PHASES.indexOf(room.phase) + 1} total={PHASES.length} completed={room.phase === 'finished'} />

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {/* Papan kayu kode ruang */}
          <div className="relative">
            <span className="absolute -top-2 left-2 z-10 rounded bg-slate-800 px-1.5 text-[9px] font-bold uppercase tracking-wider text-[#ffd23f]">Kode Ruang</span>
            <button
              type="button"
              onClick={copyCode}
              title="Salin kode ruangan"
              style={WOOD_BG}
              className="relative flex items-center gap-2 rounded-lg border-2 border-slate-800 px-3 pb-1 pt-2 font-mono text-lg font-black tracking-[0.25em] text-[#fff3d6] shadow-[3px_3px_0px_#1e293b] transition-all duration-100 [text-shadow:1px_1px_0_#3e2210] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1e293b]"
            >
              <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-slate-800/70" aria-hidden />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-slate-800/70" aria-hidden />
              {room.room_code}
              {copied ? <Check className="h-4 w-4 text-emerald-300" aria-hidden /> : <Copy className="h-4 w-4 opacity-80" aria-hidden />}
            </button>
            {copied && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold text-emerald-700">Tersalin!</span>}
          </div>

          {/* Lencana peran */}
          <span className={`flex items-center gap-2 rounded-full border-2 border-slate-800 py-1 pl-1 pr-3 text-sm font-bold shadow-[2px_2px_0px_#1e293b] ${me.role === 'cashier' ? 'bg-[#ffe8a3]' : 'bg-[#f3dfc6]'}`}>
            <AvatarHead role={me.role} gender={me.avatar_skin} size={30} />
            <span className="leading-tight">
              {me.name}
              <span className="block text-[10px] font-semibold text-slate-600">{ROLE_LABEL[me.role]}</span>
            </span>
          </span>

          {/* Status pasangan */}
          <span
            className={`flex items-center gap-1.5 rounded-full border-2 border-slate-800 px-2.5 py-1 text-xs font-bold ${realtime.isConnected && realtime.partnerOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}
            title={realtime.isConnected ? 'Terhubung ke server' : 'Tidak terhubung ke server'}
          >
            {partner && <AvatarHead role={partner.role} gender={partner.avatar_skin} size={22} className={realtime.partnerOnline ? '' : 'grayscale'} />}
            {realtime.isConnected ? <Wifi className="h-3.5 w-3.5" aria-hidden /> : <WifiOff className="h-3.5 w-3.5 text-rose-500" aria-hidden />}
            {partner ? `${partner.name} ${realtime.partnerOnline ? 'online' : 'offline'}` : 'Menunggu pasangan'}
          </span>

          <SoundToggle />

          <button
            type="button"
            onClick={() => { playClick(); onLeave(); }}
            title="Keluar dari ruangan"
            className="flex items-center gap-1 rounded-xl border-2 border-slate-800 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-700 shadow-[3px_3px_0px_#1e293b] transition-all duration-100 hover:bg-rose-50 hover:text-rose-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1e293b]"
          >
            <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}

const PHASES = ['prolog', 'chapter1', 'bonus', 'chapter3'];
const PHASE_LABEL = ['Prolog', 'Bab 1: Blok Kode', 'Bab Bonus: Kedai Live', 'Bab 3: Money Tracker'];

const STAR = 'M24 3 L29.6 16.3 L44 17.5 L33 27 L36.4 41 L24 33.5 L11.6 41 L15 27 L4 17.5 L18.4 16.3 Z';

/** Pos fase berbentuk bintang yang dihubungkan jalan setapak putus-putus. */
function MissionPosts({ current, total, completed }) {
  return (
    <ol className="flex items-center" aria-label="Kemajuan permainan">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = completed || n < current;
        const active = !completed && n === current;
        return (
          <li key={n} className="flex items-center">
            {i > 0 && (
              <span className={`mx-1 h-0 w-6 border-t-[3px] border-dashed sm:w-10 ${done || active ? 'border-[#8b5a2b]' : 'border-slate-300'}`} aria-hidden />
            )}
            <div className="flex flex-col items-center" aria-current={active ? 'step' : undefined}>
              <div className={`relative h-10 w-10 ${active ? 'hud-pulse' : ''}`}>
                <svg viewBox="0 0 48 46" className="h-full w-full" aria-hidden>
                  <path
                    d={STAR}
                    fill={done ? '#ffd23f' : active ? '#fff' : '#e2e8f0'}
                    stroke={done || active ? '#1e293b' : '#94a3b8'}
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  {active && <path d={STAR} fill="none" stroke="#ffd23f" strokeWidth="2" strokeLinejoin="round" transform="translate(24 23) scale(0.62) translate(-24 -23)" />}
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center pt-1 text-xs font-black ${done ? 'text-slate-900' : active ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={4} aria-hidden /> : !active ? <Lock className="h-3 w-3" aria-hidden /> : n}
                </span>
              </div>
              <span className={`max-w-[76px] text-center text-[9px] font-bold uppercase leading-tight sm:max-w-[96px] sm:text-[10px] ${active ? 'text-emerald-800' : 'text-slate-500'}`}>{PHASE_LABEL[i]}</span>
              <span className="sr-only">{done ? 'selesai' : active ? 'sedang dikerjakan' : 'terkunci'}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
