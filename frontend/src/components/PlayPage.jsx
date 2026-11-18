import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import VillageBackdrop from './game/VillageBackdrop';
import GameHud from './game/GameHud';
import PrologBriefing from './game/PrologBriefing';
import Chapter1BlockCoding, { ShopOpeningTransition } from './game/Chapter1BlockCoding';
import Chapter2LiveShop, { ShopResultScreen } from './game/Chapter2LiveShop';
import { loadLedger, recordAction, saveLedger } from './game/chapter2/shopData';
import { HINT_KINDS } from './game/HintBanner';
import { useGameAudio } from './game/useGameAudio';
import { useRoomRealtime } from '../hooks/useRoomRealtime';
import { PARTNER_ROLE, ROLE_LABEL } from '../lib/api';

const clip = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

/** Whisper datang langsung dari browser lain — validasi bentuknya sebelum ditampilkan. */
function sanitizeHint(payload) {
  if (!payload || !Object.hasOwn(HINT_KINDS, payload.kind)) return null;
  const content = clip(payload.content, 300);
  if (!content) return null;
  return {
    id: clip(String(payload.id ?? Date.now()), 40),
    kind: payload.kind,
    title: clip(payload.title, 80),
    content,
    detail: clip(payload.detail, 200),
    from: clip(payload.from, 50),
  };
}

// Transisi chapter1 → chapter2 ditampilkan lewat ShopOpeningTransition, bukan toast.
const PHASE_TOAST = {
  chapter1: 'Kalian berdua sudah siap. Chapter 1 dimulai!',
  finished: 'Target pendapatan tercapai. Selamat!',
};

/**
 * Halaman bermain. Konten dipilih berdasarkan `room.phase` dari server:
 * prolog → PrologBriefing, chapter1 → Chapter1BlockCoding, chapter2 → Chapter2LiveShop, finished → ShopResultScreen.
 */
export default function PlayPage({ session, initialState, onLeave }) {
  const [game, setGame] = useState(initialState);
  const [toast, setToast] = useState(null);
  const [nudge, setNudge] = useState(null);
  const [hints, setHints] = useState([]);
  const [shopOpening, setShopOpening] = useState(false);
  const { playSuccess, playPing } = useGameAudio();
  const toastTimerRef = useRef(null);

  const { me, room, shop, catalog } = game;
  const partner = room.players.find((p) => p.role !== me.role) ?? null;
  const roleRef = useRef(me.role);

  // Buku kas klien untuk ringkasan performa (server tidak menyimpan rincian transaksi).
  const [ledger, setLedger] = useState(() => loadLedger(initialState.room.room_code));
  const updateLedger = useCallback((fn) => {
    setLedger((current) => {
      const next = fn(current);
      saveLedger(initialState.room.room_code, next);
      return next;
    });
  }, [initialState.room.room_code]);

  useEffect(() => {
    if (room.phase === 'chapter2' && !ledger.chapter2StartedAt) {
      updateLedger((l) => ({ ...l, chapter2StartedAt: room.phase_started_at ?? new Date().toISOString() }));
    }
  }, [room.phase, room.phase_started_at, ledger.chapter2StartedAt, updateLedger]);

  // chapter1 → chapter2 lewat event Reverb ATAU respons HTTP pemain kedua → animasi "Toko Resmi Dibuka!".
  const prevPhaseRef = useRef(room.phase);
  useEffect(() => {
    if (prevPhaseRef.current === 'chapter1' && room.phase === 'chapter2') setShopOpening(true);
    prevPhaseRef.current = room.phase;
  }, [room.phase]);

  const showToast = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  /** State lengkap dari respons HTTP (mis. POST prolog-ready). */
  const applyState = useCallback((state) => setGame((g) => ({ ...g, ...state })), []);

  const handleRoomUpdated = useCallback(({ room: nextRoom, reason }) => {
    setGame((g) => ({ ...g, room: nextRoom }));
    if (reason === 'player_joined') showToast('Partnermu sudah bergabung!');
  }, [showToast]);

  const handlePhaseChanged = useCallback(({ phase, room: nextRoom, shop: nextShop }) => {
    setGame((g) => {
      const mine = nextRoom.players.find((p) => p.role === g.me.role);
      return { ...g, room: nextRoom, shop: nextShop, me: mine ? { ...g.me, ...mine, name: g.me.name } : g.me };
    });
    if (PHASE_TOAST[phase]) showToast(PHASE_TOAST[phase]);
    if (phase !== 'chapter2') playSuccess(); // chapter2 dibunyikan oleh ShopOpeningTransition
  }, [showToast, playSuccess]);

  const handleShopUpdated = useCallback(({ shop: nextShop, room: nextRoom, last_action: action }) => {
    setGame((g) => ({ ...g, shop: nextShop, room: nextRoom }));
    // Aksi sendiri sudah dicatat dari respons HTTP; event hanya untuk aksi partner.
    if (action && action.role !== roleRef.current) updateLedger((l) => recordAction(l, action));
  }, [updateLedger]);

  /** Respons HTTP serve-order / restock milik pemain ini. */
  const handleActionDone = useCallback((state, action) => {
    applyState(state);
    updateLedger((l) => recordAction(l, action));
  }, [applyState, updateLedger]);

  // Whisper datang langsung dari browser lain — validasi bentuknya.
  const handleNudge = useCallback((payload) => {
    setNudge({ id: `${Date.now()}`, from: clip(payload?.from, 50) });
  }, []);

  const handleHint = useCallback((payload) => {
    const clean = sanitizeHint(payload);
    if (!clean) return;
    setHints((list) => [clean, ...list.filter((h) => h.id !== clean.id)].slice(0, 5));
    playPing();
  }, [playPing]);
  const dismissHint = useCallback((id) => setHints((list) => list.filter((h) => h.id !== id)), []);

  const realtime = useRoomRealtime({
    token: session.token,
    roomCode: room.room_code,
    role: me.role,
    onRoomUpdated: handleRoomUpdated,
    onPhaseChanged: handlePhaseChanged,
    onShopUpdated: handleShopUpdated,
    onNudge: handleNudge,
    onHint: handleHint,
  });

  return (
    <VillageBackdrop>
      <GameHud room={room} me={me} partner={partner} realtime={realtime} onLeave={onLeave} />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {room.status === 'waiting' && (
          <div className="mx-auto mb-6 max-w-6xl rounded-2xl border-2 border-dashed border-slate-800 bg-[#fff6c7] p-4 text-amber-900 shadow-[4px_4px_0px_#1e293b]">
            <p className="font-black">Menunggu partner bergabung…</p>
            <p className="text-sm">
              Bagikan kode ruangan <span className="font-mono font-bold tracking-widest">{room.room_code}</span> kepada temanmu yang akan menjadi{' '}
              {ROLE_LABEL[PARTNER_ROLE[me.role]]}.
            </p>
          </div>
        )}

        {room.phase === 'prolog' && (
          <PrologBriefing
            me={me}
            room={room}
            partner={partner}
            shop={shop}
            catalog={catalog}
            token={session.token}
            realtime={realtime}
            nudge={nudge}
            onStateChange={applyState}
          />
        )}

        {room.phase === 'chapter1' && (
          <Chapter1BlockCoding
            me={me}
            room={room}
            partner={partner}
            token={session.token}
            realtime={realtime}
            hints={hints}
            onDismissHint={dismissHint}
            nudge={nudge}
            onStateChange={applyState}
          />
        )}

        {room.phase === 'chapter2' && (
          <Chapter2LiveShop
            me={me}
            room={room}
            partner={partner}
            shop={shop}
            catalog={catalog}
            token={session.token}
            realtime={realtime}
            hints={hints}
            onDismissHint={dismissHint}
            ledger={ledger}
            onActionDone={handleActionDone}
          />
        )}

        {room.phase === 'finished' && (
          <ShopResultScreen variant="victory" me={me} partner={partner} room={room} shop={shop} ending={game.ending} ledger={ledger} />
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border-2 border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[3px_3px_0px_#1e293b]" role="status">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden /> {toast}
        </div>
      )}

      <ShopOpeningTransition open={shopOpening} me={me} partner={partner} onClose={() => setShopOpening(false)} />
    </VillageBackdrop>
  );
}
