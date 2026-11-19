import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BellRing, Check, ChevronLeft, ChevronRight, Coins, Hourglass, Loader2, Receipt, Rocket, Timer, UserCheck, WifiOff,
} from 'lucide-react';
import BuRatnaCharacter from './BuRatnaCharacter';
import { RoleCharacter } from './ShopCharacters';
import { useGameAudio } from './useGameAudio';
import { CARD, TACTILE, WOOD_BG } from './theme';
import { api, formatRupiah } from '../../lib/api';

const TYPE_SPEED_MS = 22;
const NUDGE_COOLDOWN_MS = 5000;
const NOTICE_MS = 5000;

const SUPPLY_FALLBACK = {
  kopi: 'Bubuk Kopi', susu: 'Susu Segar', gula_aren: 'Gula Aren', pisang: 'Pisang Kepok', cokelat: 'Cokelat Batang', kemasan: 'Kemasan Daun & Gelas',
};
const SUPPLY_COLOR = {
  kopi: '#6b3f1d', susu: '#f8fafc', gula_aren: '#b5651d', pisang: '#f4d35e', cokelat: '#4a2c1a', kemasan: '#8fbc8f',
};
const FALLBACK_MENU = [
  { key: 'pisang_krispi', name: 'Pisang Krispi Cokelat', price: 15000, recipe: ['pisang', 'cokelat', 'kemasan'].map((k) => ({ item_key: k, name: SUPPLY_FALLBACK[k], qty: 1 })) },
  { key: 'es_kopi_aren', name: 'Es Kopi Gula Aren', price: 18000, recipe: ['kopi', 'susu', 'gula_aren'].map((k) => ({ item_key: k, name: SUPPLY_FALLBACK[k], qty: 1 })) },
  { key: 'pisang_goreng', name: 'Pisang Goreng', price: 7000, recipe: ['pisang', 'kemasan'].map((k) => ({ item_key: k, name: SUPPLY_FALLBACK[k], qty: 1 })) },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Teks muncul huruf demi huruf; `skip()` menampilkan semuanya sekaligus. */
function useTypewriter(text) {
  const [state, setState] = useState({ text, count: 0 });
  const count = state.text === text ? state.count : 0;

  useEffect(() => {
    if (prefersReducedMotion()) {
      setState({ text, count: text.length });
      return undefined;
    }
    setState({ text, count: 0 });
    const id = setInterval(() => {
      setState((s) => (s.text !== text || s.count >= text.length ? s : { text, count: s.count + 1 }));
    }, TYPE_SPEED_MS);
    const stop = setTimeout(() => clearInterval(id), (text.length + 2) * TYPE_SPEED_MS + 100);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [text]);

  return {
    shown: text.slice(0, count),
    typing: count < text.length,
    skip: () => setState({ text, count: text.length }),
  };
}

/** Naskah 3 slide, berbeda fokus untuk Kasir dan Penjaga Gudang. */
function buildSlides(role, { money, target, partnerName, maxStock }) {
  const opening = {
    kicker: 'Bagian 1 · Awal Usaha',
    title: `Modal Patungan ${money}`,
    speaker: 'ratna',
    lines: [
      `Selamat datang di Kedai Kopi & Camilan Desa! Mulai hari ini, kamu dan ${partnerName} merintis kedai ini bersama.`,
      `Kalian sudah patungan modal awal ${money}. Uang itu disimpan di satu kas bersama, jadi setiap rupiah harus dijaga baik-baik.`,
      role === 'cashier'
        ? `Target kita mengumpulkan ${target}. Kamu bertugas sebagai Kasir di meja depan. Klik koin di samping, lalu kenali tugasmu!`
        : `Target kita mengumpulkan ${target}. Kamu bertugas sebagai Penjaga Gudang di belakang kedai. Klik koin di samping, lalu kenali tugasmu!`,
    ],
  };

  if (role === 'cashier') {
    return [
      opening,
      {
        kicker: 'Bagian 2 · Tugas Kasir',
        title: 'Meracik Menu Tepat Waktu',
        speaker: 'self',
        lines: [
          'Halo! Aku Kasir. Setiap pelanggan desa yang datang akan memesan menu dari papan tulis di samping.',
          'Satu menu bisa membutuhkan beberapa bahan sekaligus. Kalau satu bahan saja kurang, pesanan tidak bisa dibuat.',
          'Pelanggan tidak suka menunggu lama, jadi racik pesanan dengan cepat dan tepat. Coba klik menu untuk melihat resepnya!',
        ],
      },
      {
        kicker: 'Bagian 3 · Mesin Kasir',
        title: 'Jangan Salah Hitung Kembalian',
        speaker: 'self',
        lines: [
          'Setelah pesanan jadi, pelanggan membayar. Di sinilah mesin kasir kita bekerja.',
          'Kalau kembalian salah hitung, kas bersama bisa rugi atau pelanggan kecewa. Nanti kita merakit sistem kasirnya dengan Python!',
          'Ayo pemanasan dulu: jawab soal kembalian di samping, lalu tekan tombol siap.',
        ],
      },
    ];
  }

  return [
    opening,
    {
      kicker: 'Bagian 2 · Tugas Penjaga Gudang',
      title: 'Pantau 6 Bahan Baku',
      speaker: 'self',
      lines: [
        'Halo! Aku Penjaga Gudang. Di rak ini ada 6 bahan baku: kopi, susu, gula aren, pisang, cokelat, dan kemasan.',
        'Setiap kali Kasir menjual menu, stok bahan berkurang. Kalau satu bahan habis, menu yang memakainya tidak bisa dijual.',
        'Tugasku melakukan restock sebelum bahan habis. Klik setiap toples di rak untuk memeriksa stoknya!',
      ],
    },
    {
      kicker: 'Bagian 3 · Kas Bersama',
      title: 'Jangan Sampai Overstock!',
      speaker: 'self',
      lines: [
        'Bahan dibeli per paket isi 3 unit, dan uangnya diambil dari kas bersama.',
        `Gudang kita hanya muat ${maxStock} unit per bahan. Belanja berlebihan membuat bahan menumpuk dan kas bisa bangkrut.`,
        'Ayo latihan memilih belanjaan yang tepat di samping, lalu tekan tombol siap.',
      ],
    },
  ];
}

/**
 * Prolog 3 slide sebelum Chapter 1. Ditampilkan saat room.phase === 'prolog'.
 *
 * @param {object}   me, room, partner, shop, catalog  state dari server (RoleProjector)
 * @param {string}   token          token sesi pemain
 * @param {object}   realtime       hasil useRoomRealtime (partnerOnline, sendNudge)
 * @param {{id: string, from: string}|null} nudge  colekan terakhir dari partner
 * @param {(state: object) => void} onStateChange  dipanggil dengan state baru dari POST prolog-ready
 */
export default function PrologBriefing({ me, room, partner, shop, catalog, token, realtime, nudge, onStateChange }) {
  const { playClick, playSuccess, playError, playPing, playCashRegister } = useGameAudio();
  const role = me.role;
  const [slide, setSlide] = useState(0);
  const [line, setLine] = useState(0);
  const [reaction, setReaction] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const noticeTimerRef = useRef(null);

  const money = shop?.shared_money ?? 50000;
  const target = shop?.target_money ?? 120000;
  const maxStock = shop?.max_stock ?? catalog?.max_stock ?? 8;
  const partnerName = partner?.name ?? 'partnermu';

  const slides = buildSlides(role, {
    money: formatRupiah(money), target: formatRupiah(target), partnerName, maxStock,
  });
  const current = slides[slide];
  const isLast = slide === slides.length - 1;
  const text = reaction ? reaction.text : current.lines[line];
  const { shown, typing, skip } = useTypewriter(text);
  const linesDone = line >= current.lines.length - 1 && !typing;

  const showNotice = useCallback((value) => {
    setNotice(value);
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);
  useEffect(() => () => clearTimeout(noticeTimerRef.current), []);

  // Partner baru saja menekan "siap" → beri tahu dengan lonceng.
  const partnerReady = Boolean(partner?.is_prolog_ready);
  const prevPartnerReadyRef = useRef(partnerReady);
  useEffect(() => {
    if (partnerReady && !prevPartnerReadyRef.current) {
      playPing();
      showNotice({ tone: 'ready', text: `${partnerName} sudah siap merakit sistem!` });
    }
    prevPartnerReadyRef.current = partnerReady;
  }, [partnerReady, partnerName, playPing, showNotice]);

  // Colekan dari partner lewat whisper.
  useEffect(() => {
    if (!nudge) return;
    playPing();
    showNotice({ tone: 'nudge', text: `${nudge.from || partnerName} sudah siap dan mencolekmu! Selesaikan ceritanya, ya.` });
  }, [nudge]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (index) => {
    if (index < 0 || index >= slides.length) return;
    playClick();
    setSlide(index);
    setLine(0);
    setReaction(null);
  };

  const handleBubbleClick = () => {
    if (typing) return skip();
    if (reaction) return setReaction(null);
    if (line < current.lines.length - 1) {
      playClick();
      setLine((l) => l + 1);
    }
    return undefined;
  };

  /** Properti interaktif membuat pembicara bereaksi di balon percakapan. */
  const react = useCallback((value, mood = 'happy', sfx = 'click') => {
    ({ click: playClick, success: playSuccess, error: playError, cash: playCashRegister })[sfx]?.();
    setReaction({ id: Date.now(), text: value, mood });
  }, [playClick, playSuccess, playError, playCashRegister]);

  const markReady = async () => {
    if (submitting || me.is_prolog_ready) return;
    playClick();
    setSubmitting(true);
    setError(null);
    try {
      const state = await api(`/rooms/${room.room_code}/prolog-ready`, { method: 'POST', token });
      playSuccess();
      onStateChange(state);
    } catch (err) {
      playError();
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Ekspresi: berbicara saat teks diketik, lalu mengikuti reaksi terakhir.
  const speakerMood = typing ? 'talking' : reaction?.mood ?? 'idle';
  let partnerMood = 'idle';
  if (!partner || (!realtime.partnerOnline && !partnerReady)) partnerMood = 'offline';
  else if (partnerReady) partnerMood = 'happy';

  const speakerLabel = current.speaker === 'ratna' ? 'Bu Ratna · Pemilik Kedai' : role === 'cashier' ? 'Kasir' : 'Penjaga Gudang';

  return (
    <section className={`${CARD} relative mx-auto max-w-6xl p-4 sm:p-6`} aria-labelledby="prolog-title">
      {notice && (
        <div
          role="status"
          className={`prolog-nudge absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border-2 border-slate-800 px-4 py-1.5 text-sm font-bold shadow-[3px_3px_0px_#1e293b] ${notice.tone === 'ready' ? 'bg-emerald-200 text-emerald-900' : 'bg-[#ffd23f] text-slate-900'}`}
        >
          <BellRing className="h-4 w-4" aria-hidden /> {notice.text}
        </div>
      )}

      {/* Kepala: judul dan penanda slide */}
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Prolog · Kedai Kopi &amp; Camilan Desa</p>
          <h2 id="prolog-title" className="text-2xl font-black text-slate-900">{current.title}</h2>
          <p className="text-sm font-semibold text-amber-800">{current.kicker}</p>
        </div>
        <ol className="flex items-center gap-2" aria-label="Kemajuan prolog">
          {slides.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === slide ? 'step' : undefined}
                aria-label={`Bagian ${i + 1}: ${s.title}`}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-800 text-sm font-black shadow-[2px_2px_0px_#1e293b] transition-all duration-100 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${i === slide ? 'bg-[#ffd23f] text-slate-900' : i < slide ? 'bg-emerald-400 text-white' : 'bg-white text-slate-500'}`}
              >
                {i < slide ? <Check className="h-4 w-4" strokeWidth={4} aria-hidden /> : i + 1}
              </button>
            </li>
          ))}
        </ol>
      </header>

      <div key={slide} className="prolog-slide-in grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Panggung karakter */}
        <div className="relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-[#e3f4fb] via-[#fff6dc] to-[#fff1cf]">
          <div className="p-4 pb-0">
            <SpeechBubble
              key={reaction?.id ?? `${slide}-${line}`}
              label={speakerLabel}
              shown={shown}
              fullText={text}
              typing={typing}
              footer={reaction ? 'Klik balon untuk kembali ke cerita' : `${line + 1}/${current.lines.length}${line < current.lines.length - 1 ? ' · Klik balon untuk lanjut' : ''}`}
              onClick={handleBubbleClick}
            />
          </div>

          <div className="mt-auto flex items-end justify-center gap-1 px-2 sm:gap-4">
            <RoleFigure
              variant="cashier"
              isMe={role === 'cashier'}
              speaking={current.speaker === 'self' && role === 'cashier'}
              meName={me.name}
              partnerName={partner?.name}
              meSkin={me.avatar_skin}
              partnerSkin={partner?.avatar_skin}
              speakerMood={speakerMood}
              partnerMood={partnerMood}
              ratnaSpeaks={current.speaker === 'ratna'}
            />
            {current.speaker === 'ratna' && (
              <div className="shrink-0">
                <BuRatnaCharacter mood={speakerMood} size={130} />
              </div>
            )}
            <RoleFigure
              variant="warehouse"
              isMe={role === 'warehouse'}
              speaking={current.speaker === 'self' && role === 'warehouse'}
              meName={me.name}
              partnerName={partner?.name}
              meSkin={me.avatar_skin}
              partnerSkin={partner?.avatar_skin}
              speakerMood={speakerMood}
              partnerMood={partnerMood}
              ratnaSpeaks={current.speaker === 'ratna'}
            />
          </div>
          <div className="h-5 border-t-2 border-slate-800" style={WOOD_BG} aria-hidden />
        </div>

        {/* Properti interaktif */}
        <div className="flex flex-col gap-4">
          {slide === 0 && <ModalJar money={money} target={target} meName={me.name} partnerName={partnerName} onReact={react} />}
          {slide === 1 && role === 'cashier' && <MenuBoard menu={catalog?.menu?.length ? catalog.menu : FALLBACK_MENU} onReact={react} />}
          {slide === 1 && role === 'warehouse' && (
            <StockShelf inventory={shop?.inventory ?? {}} supplies={catalog?.supplies} maxStock={maxStock} onReact={react} />
          )}
          {slide === 2 && role === 'cashier' && <ChangeQuiz menu={catalog?.menu} onReact={react} />}
          {slide === 2 && role === 'warehouse' && <RestockQuiz supplies={catalog?.supplies} maxStock={maxStock} onReact={react} />}

          {isLast && (
            <ReadyPanel
              me={me}
              partner={partner}
              roomCode={room.room_code}
              realtime={realtime}
              submitting={submitting}
              error={error}
              onReady={markReady}
            />
          )}
        </div>
      </div>

      {/* Navigasi */}
      <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Navigasi prolog">
        <button
          type="button"
          onClick={() => goTo(slide - 1)}
          disabled={slide === 0}
          className={`${TACTILE} inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2 font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-x-0 disabled:active:translate-y-0`}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden /> Sebelumnya
        </button>
        <span className="text-xs font-bold text-slate-500">Bagian {slide + 1} dari {slides.length}</span>
        {!isLast ? (
          <button
            type="button"
            onClick={() => goTo(slide + 1)}
            className={`${TACTILE} ${linesDone ? 'prolog-cta-pulse' : ''} inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-4 py-2 font-bold text-white hover:bg-emerald-600`}
          >
            Lanjut <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <span className="w-[120px]" aria-hidden />
        )}
      </nav>
    </section>
  );
}

// ----------------------------------------------------------------------
// Panggung
// ----------------------------------------------------------------------
function SpeechBubble({ label, shown, fullText, typing, footer, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="prolog-bubble-pop relative block w-full cursor-pointer rounded-2xl border-2 border-slate-800 bg-white px-4 py-3 text-left shadow-[4px_4px_0px_#1e293b]"
    >
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-emerald-700">{label}</span>
      <span className="block min-h-[4.5rem] text-[15px] leading-relaxed text-slate-800" aria-hidden="true">
        {shown}
        {typing && <span className="ml-0.5 inline-block w-2 animate-pulse">▍</span>}
      </span>
      <span className="sr-only" aria-live="polite">{fullText}</span>
      <span className="mt-1 block text-right text-[11px] font-bold text-slate-400">{typing ? 'Klik untuk tampilkan semua' : footer}</span>
      <span aria-hidden="true" className="absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-slate-800 bg-white" />
    </button>
  );
}

function RoleFigure({ variant, isMe, speaking, meName, partnerName, meSkin, partnerSkin, speakerMood, partnerMood, ratnaSpeaks }) {
  const roleName = variant === 'cashier' ? 'Kasir' : 'Gudang';
  let mood = isMe ? 'idle' : partnerMood;
  if (speaking) mood = speakerMood;
  const caption = isMe ? `${meName} (Kamu)` : partnerName ? `${partnerName} · ${roleName}` : `Menunggu ${roleName}`;

  return (
    <RoleCharacter
      role={variant}
      gender={isMe ? meSkin : partnerSkin}
      mood={mood}
      size={speaking ? 170 : ratnaSpeaks ? 95 : 125}
      caption={caption}
      dim={!speaking && !isMe}
      className="mb-1 transition-[width] duration-300"
    />
  );
}

// ----------------------------------------------------------------------
// Properti interaktif per slide
// ----------------------------------------------------------------------
function PropCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`rounded-2xl border-2 border-slate-800 bg-white p-4 shadow-[4px_4px_0px_#1e293b] ${className}`}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800">
        {Icon && <Icon className="h-4 w-4 text-amber-700" aria-hidden />} {title}
      </h3>
      {children}
    </div>
  );
}

function ModalJar({ money, target, meName, partnerName, onReact }) {
  const half = Math.round(money / 2);
  const percent = Math.min(100, Math.round((money / target) * 100));

  const coins = [
    { who: `${meName} (kamu)`, text: `Ini setoran modalmu: ${formatRupiah(half)}. Bersama setoran ${partnerName}, terkumpul ${formatRupiah(money)} di kas bersama.` },
    { who: partnerName, text: `${partnerName} juga menyetor ${formatRupiah(half)}. Kalian satu tim: untung dan rugi ditanggung bersama!` },
  ];

  return (
    <PropCard title="Celengan Kas Bersama" icon={Coins}>
      <div className="grid grid-cols-2 gap-3">
        {coins.map((c) => (
          <button
            key={c.who}
            type="button"
            onClick={() => onReact(c.text, 'happy', 'cash')}
            className="group flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-3 transition-colors hover:bg-amber-100"
          >
            <span className={`${TACTILE} flex h-16 w-16 items-center justify-center rounded-full bg-[#ffd23f] text-lg font-black text-amber-900 group-hover:rotate-12`}>Rp</span>
            <span className="text-base font-black text-slate-900">{formatRupiah(half)}</span>
            <span className="max-w-full truncate text-xs font-semibold text-slate-600">{c.who}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onReact(`Untuk mencapai target ${formatRupiah(target)}, kas bersama masih perlu bertambah ${formatRupiah(Math.max(0, target - money))}. Kita bisa!`, 'thinking')}
        className="mt-4 block w-full text-left"
      >
        <span className="mb-1 flex justify-between text-xs font-bold text-slate-700">
          <span>Kas: {formatRupiah(money)}</span>
          <span>Target: {formatRupiah(target)}</span>
        </span>
        <span className="block h-5 overflow-hidden rounded-full border-2 border-slate-800 bg-slate-100">
          <span className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#ffd23f] transition-[width] duration-700" style={{ width: `${percent}%` }} />
        </span>
        <span className="mt-1 block text-[11px] font-semibold text-slate-500">Klik bilah ini untuk melihat sisa target.</span>
      </button>
    </PropCard>
  );
}

function MenuBoard({ menu, onReact }) {
  const [selected, setSelected] = useState(null);

  const pick = (item) => {
    setSelected(item.key);
    const bahan = item.recipe.map((r) => (r.qty > 1 ? `${r.qty} ${r.name}` : r.name)).join(', ');
    onReact(
      `${item.name} (${formatRupiah(item.price)}) butuh ${item.recipe.length} bahan: ${bahan}. Kalau satu saja habis, pesanan gagal dibuat!`,
      item.recipe.length >= 3 ? 'thinking' : 'happy',
    );
  };

  return (
    <div className="rounded-2xl border-[6px] border-[#8b5a2b] bg-[#2f4f3a] p-4 shadow-[4px_4px_0px_#1e293b] outline outline-2 outline-slate-800">
      <h3 className="mb-1 text-center text-lg font-black tracking-wide text-[#fff3d6]">Papan Menu Kedai</h3>
      <p className="mb-3 flex items-center justify-center gap-1 text-xs font-semibold text-emerald-200">
        <Timer className="h-3.5 w-3.5" aria-hidden /> Setiap pelanggan punya batas sabar. Layani tepat waktu!
      </p>
      <ul className="grid gap-2">
        {menu.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => pick(item)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border-2 px-3 py-2 text-left transition-all duration-100 active:scale-[0.98] ${selected === item.key ? 'border-[#ffd23f] bg-white/15' : 'border-white/20 hover:border-white/50'}`}
            >
              <span>
                <span className="block font-bold text-[#fff3d6]">{item.name}</span>
                <span className="text-[11px] text-emerald-200">{item.recipe.length} bahan</span>
              </span>
              <span className="whitespace-nowrap font-mono font-black text-[#ffd23f]">{formatRupiah(item.price)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StockShelf({ inventory, supplies, maxStock, onReact }) {
  const items = (supplies?.length ? supplies : Object.entries(SUPPLY_FALLBACK).map(([key, name]) => ({ key, name })))
    .map((s) => ({ ...s, stock: Number(inventory[s.key] ?? 0) }));

  const check = (item) => {
    if (item.stock <= 2) {
      onReact(`${item.name} tinggal ${item.stock} unit! Segera restock sebelum habis, supaya Kasir tetap bisa berjualan.`, 'shocked', 'error');
    } else {
      onReact(`${item.name} masih ${item.stock} dari maksimal ${maxStock} unit. Aman untuk sekarang, tapi tetap dipantau, ya.`, 'happy');
    }
  };

  return (
    <div className="rounded-2xl border-2 border-slate-800 p-3 shadow-[4px_4px_0px_#1e293b]" style={WOOD_BG}>
      <h3 className="mb-3 rounded-lg bg-[#fffaf0] px-3 py-1 text-center text-sm font-black uppercase tracking-wide text-slate-800">
        Rak Gudang · maks {maxStock} unit per bahan
      </h3>
      <ul className="grid grid-cols-3 gap-3">
        {items.map((item) => {
          const low = item.stock <= 2;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => check(item)}
                className="relative flex w-full flex-col items-center rounded-xl bg-[#fffaf0]/90 p-2 transition-transform duration-100 hover:-translate-y-0.5 active:scale-95"
                aria-label={`${item.name}: ${item.stock} dari ${maxStock} unit`}
              >
                {low && (
                  <span className="absolute -right-1 -top-2 rounded-full border-2 border-slate-800 bg-rose-400 px-1.5 text-[10px] font-black text-white">Menipis!</span>
                )}
                {/* Toples dengan isi sesuai stok */}
                <span className="relative block h-14 w-11 overflow-hidden rounded-b-xl rounded-t-md border-2 border-slate-800 bg-sky-50">
                  <span
                    className="absolute inset-x-0 bottom-0 border-t-2 border-slate-800/40 transition-[height] duration-500"
                    style={{ height: `${Math.min(100, (item.stock / maxStock) * 100)}%`, background: SUPPLY_COLOR[item.key] ?? '#d9a066' }}
                  />
                </span>
                <span className="mt-1 text-center text-[11px] font-bold leading-tight text-slate-800">{item.name}</span>
                <span className={`font-mono text-xs font-black ${low ? 'text-rose-600' : 'text-slate-600'}`}>{item.stock}/{maxStock}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function QuizOptions({ options, solved, onPick }) {
  return (
    <div className="grid gap-2">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onPick(o)}
          className={`${TACTILE} rounded-xl px-3 py-2 text-left text-sm font-bold ${solved && o.correct ? 'bg-emerald-300 text-emerald-950' : 'bg-white text-slate-800 hover:bg-amber-50'}`}
        >
          {solved && o.correct && <Check className="mr-1 inline h-4 w-4" strokeWidth={4} aria-hidden />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChangeQuiz({ menu, onReact }) {
  const [solved, setSolved] = useState(false);
  const item = menu?.find((m) => m.key === 'pisang_krispi') ?? FALLBACK_MENU[0];
  const price = item.price;
  const paid = Math.ceil((price + 1) / 10000) * 10000;
  const change = paid - price;

  const options = [
    { label: formatRupiah(paid + price), correct: false, text: `Waduh, kalau uangnya malah ditambah, kas kita tekor! Ingat: kembalian = uang dibayar − harga. Coba lagi!` },
    { label: formatRupiah(change), correct: true, text: `Tepat! ${formatRupiah(paid)} − ${formatRupiah(price)} = ${formatRupiah(change)}. Cring! Pelanggan pulang dengan senang.` },
    { label: formatRupiah(price), correct: false, text: `Hmm, itu harga menunya, bukan kembaliannya. Kembalian = uang dibayar − harga. Coba lagi!` },
  ];

  const pick = (o) => {
    if (o.correct) setSolved(true);
    onReact(o.text, o.correct ? 'happy' : 'shocked', o.correct ? 'cash' : 'error');
  };

  return (
    <PropCard title="Latihan Mesin Kasir" icon={Receipt}>
      <div className="mb-3 rounded-lg border-2 border-dashed border-slate-400 bg-[#fffdf5] p-3 font-mono text-sm text-slate-800">
        <p className="flex justify-between"><span>1× {item.name}</span><span>{formatRupiah(price)}</span></p>
        <p className="flex justify-between border-t border-dashed border-slate-300 pt-1"><span>Dibayar</span><span>{formatRupiah(paid)}</span></p>
        <p className="flex justify-between font-black"><span>Kembalian</span><span>?</span></p>
      </div>
      <p className="mb-2 text-sm font-semibold text-slate-700">Berapa kembalian yang harus diberikan?</p>
      <QuizOptions options={options} solved={solved} onPick={pick} />
    </PropCard>
  );
}

function RestockQuiz({ supplies, maxStock, onReact }) {
  const [solved, setSolved] = useState(false);
  const find = (key, price) => supplies?.find((s) => s.key === key) ?? { key, name: SUPPLY_FALLBACK[key], pack_price: price };
  const kopi = find('kopi', 9000);
  const aren = find('gula_aren', 6000);
  const cash = 20000;
  const stock = { kopi: 6, aren: 1 };

  const options = [
    {
      label: `Kulak 1 paket ${kopi.name} (${formatRupiah(kopi.pack_price)})`,
      correct: false,
      text: `Stop! ${kopi.name} ${stock.kopi} + 3 = ${stock.kopi + 3} unit, melebihi batas gudang ${maxStock} unit. Itu overstock!`,
    },
    {
      label: `Kulak 1 paket ${aren.name} (${formatRupiah(aren.pack_price)})`,
      correct: true,
      text: `Pas! ${aren.name} ${stock.aren} + 3 = ${stock.aren + 3} unit, masih di bawah ${maxStock}. Kas tersisa ${formatRupiah(cash - aren.pack_price)} untuk kebutuhan lain.`,
    },
    {
      label: `Kulak 3 paket ${aren.name} (${formatRupiah(aren.pack_price * 3)})`,
      correct: false,
      text: `Terlalu banyak! ${stock.aren} + 9 = ${stock.aren + 9} unit, melebihi ${maxStock}, dan kas tinggal ${formatRupiah(cash - aren.pack_price * 3)}. Belanja berlebihan bikin kedai bangkrut!`,
    },
  ];

  const pick = (o) => {
    if (o.correct) setSolved(true);
    onReact(o.text, o.correct ? 'happy' : 'shocked', o.correct ? 'cash' : 'error');
  };

  return (
    <PropCard title="Latihan Belanja Gudang" icon={Coins}>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
        <span className="rounded-lg border-2 border-slate-800 bg-emerald-100 p-2">Kas<br /><span className="font-mono text-sm">{formatRupiah(cash)}</span></span>
        <span className="rounded-lg border-2 border-slate-800 bg-amber-50 p-2">{kopi.name}<br /><span className="font-mono text-sm">{stock.kopi}/{maxStock}</span></span>
        <span className="rounded-lg border-2 border-slate-800 bg-rose-50 p-2">{aren.name}<br /><span className="font-mono text-sm text-rose-600">{stock.aren}/{maxStock}</span></span>
      </div>
      <p className="mb-2 text-sm font-semibold text-slate-700">Satu paket berisi 3 unit. Keputusan mana yang paling tepat?</p>
      <QuizOptions options={options} solved={solved} onPick={pick} />
    </PropCard>
  );
}

// ----------------------------------------------------------------------
// Tombol siap + status partner live
// ----------------------------------------------------------------------
function ReadyPanel({ me, partner, roomCode, realtime, submitting, error, onReady }) {
  const { playClick } = useGameAudio();
  const [nudged, setNudged] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const partnerReady = Boolean(partner?.is_prolog_ready);
  const canNudge = me.is_prolog_ready && partner && !partnerReady && realtime.partnerOnline;

  const nudge = () => {
    if (nudged) return;
    playClick();
    if (realtime.sendNudge?.({ from: me.name }) === false) return;
    setNudged(true);
    timerRef.current = setTimeout(() => setNudged(false), NUDGE_COOLDOWN_MS);
  };

  let status;
  if (!partner) {
    status = { icon: Hourglass, tone: 'bg-slate-100 text-slate-600', text: <>Partner belum bergabung. Bagikan kode <span className="font-mono tracking-widest">{roomCode}</span>.</> };
  } else if (partnerReady) {
    status = { icon: UserCheck, tone: 'bg-emerald-100 text-emerald-800', text: `${partner.name} sudah siap!` };
  } else if (!realtime.partnerOnline) {
    status = { icon: WifiOff, tone: 'bg-slate-100 text-slate-600', text: `${partner.name} sedang offline.` };
  } else {
    status = { icon: Hourglass, tone: 'bg-amber-100 text-amber-900', text: `${partner.name} masih membaca cerita…` };
  }
  const StatusIcon = status.icon;

  return (
    <div className="rounded-2xl border-2 border-slate-800 bg-[#fff6c7] p-4 shadow-[4px_4px_0px_#1e293b]">
      {me.is_prolog_ready ? (
        <p className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-800 bg-emerald-400 px-4 py-3 text-lg font-black text-white">
          <Check className="h-6 w-6" strokeWidth={4} aria-hidden /> Kamu sudah siap!
        </p>
      ) : (
        <button
          type="button"
          onClick={onReady}
          disabled={submitting}
          className={`${TACTILE} ${submitting ? '' : 'prolog-cta-pulse'} flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-4 py-3 text-lg font-black text-slate-900 hover:bg-[#ffdc5e] disabled:cursor-wait disabled:opacity-70`}
        >
          {submitting ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : <Rocket className="h-6 w-6" aria-hidden />}
          Saya Siap Merakit Sistem!
        </button>
      )}

      <div className={`mt-3 flex items-center gap-2 rounded-xl border-2 border-slate-800 px-3 py-2 text-sm font-bold ${status.tone}`} role="status" aria-live="polite">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {partner && realtime.partnerOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${partner && realtime.partnerOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        </span>
        <StatusIcon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0">{status.text}</span>
      </div>

      {canNudge && (
        <button
          type="button"
          onClick={nudge}
          disabled={nudged}
          className={`${TACTILE} mt-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${nudged ? 'bg-emerald-500 text-white' : 'bg-white text-slate-800 hover:bg-amber-50'}`}
        >
          {nudged ? <Check className="h-4 w-4" aria-hidden /> : <BellRing className="h-4 w-4" aria-hidden />}
          {nudged ? 'Colekan terkirim!' : `Colek ${partner.name}`}
        </button>
      )}

      <p className="mt-2 text-xs font-semibold text-slate-600">Chapter 1 dimulai otomatis setelah kalian berdua siap.</p>
      {error && <p className="mt-2 rounded-lg border-2 border-rose-300 bg-rose-50 p-2 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
    </div>
  );
}
