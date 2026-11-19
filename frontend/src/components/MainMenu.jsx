import { useState } from 'react';
import { BookOpen, Check, ChevronRight, Coffee, MonitorCog, Sparkles, Wallet, Zap } from 'lucide-react';
import VillageBackdrop from './game/VillageBackdrop';
import BuRatnaCharacter from './game/BuRatnaCharacter';
import { RoleCharacter } from './game/ShopCharacters';
import { loadSkinPref, saveSkinPref } from '../lib/api';
import SoundToggle from './game/SoundToggle';
import { useGameAudio } from './game/useGameAudio';
import { CARD, WOOD_BG } from './game/theme';

const VISITED_KEY = 'insthink.menu.visited';

const STEPS = [
  {
    key: 'materi',
    step: 1,
    title: '1. Kenalan Blok Python',
    desc: 'Pendahuluan materi terilustrasi untuk memahami cara kerja blok kode: variabel, input(), print(), dan teman-temannya.',
    cta: 'Mulai Belajar',
    icon: BookOpen,
    iconBg: 'bg-[#a5d68f]',
  },
  {
    key: 'quiz',
    step: 2,
    title: '2. Pemanasan (Quiz)',
    desc: 'Tantangan kilat tebak blok kode sebelum kedai dibuka. Singkat, seru, dan bikin otak siap!',
    cta: 'Mulai Quiz',
    icon: Zap,
    iconBg: 'bg-[#f4a582]',
  },
  {
    key: 'tracker',
    step: 3,
    title: '3. Praktik Money Tracker',
    desc: 'Hands-on ala online compiler: tulis program pencatat pengeluaran kedai dengan instruksi dan hint Bu Ratna.',
    cta: 'Mulai Praktik',
    icon: Wallet,
    iconBg: 'bg-[#ffd23f]',
    primary: true,
  },
];

/** Minigame co-op kedai, terpisah dari alur belajar Langkah 1–3. */
const BONUS = {
  key: 'game',
  title: 'Bonus: Minigame Kedai',
  desc: 'Co-op 2 pemain: buat atau gabung ruangan, lalu jalankan kedai Bu Ratna sebagai Kasir dan Stok Gudang.',
  cta: 'Buka Kedai!',
  icon: Coffee,
  iconBg: 'bg-[#c4b5fd]',
};

function readVisited() {
  try {
    return JSON.parse(localStorage.getItem(VISITED_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveVisited(list) {
  try {
    localStorage.setItem(VISITED_KEY, JSON.stringify(list));
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
}

/**
 * Layar pembuka INSTHINK: papan judul kayu ukir Bali, tiga karakter penyambut,
 * dan tiga kartu tahap belajar yang boleh dibuka bebas maupun berurutan.
 *
 * @param {(stage: 'materi'|'quiz'|'tracker'|'game') => void} onSelect
 * @param {() => void} [onOpenAdmin]  membuka dashboard Mode Fasilitator (/admin)
 */
export default function MainMenu({ onSelect, onOpenAdmin }) {
  const { playClick } = useGameAudio();
  const [visited, setVisited] = useState(readVisited);
  const nextStep = STEPS.find((s) => !visited.includes(s.key))?.key;

  const choose = (key) => {
    playClick();
    if (!visited.includes(key)) {
      const next = [...visited, key];
      setVisited(next);
      saveVisited(next);
    }
    onSelect(key);
  };

  return (
    <VillageBackdrop>
      <div className="flex justify-end px-4 pt-4">
        <SoundToggle />
      </div>

      <main className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-10">
        <TitleBoard />

        <p className="mt-4 max-w-full rounded-full border-2 border-slate-800 bg-[#fff7e0] px-4 py-1.5 text-center text-sm font-bold italic text-slate-800 shadow-[3px_3px_0px_#1e293b]">
          Explore AI, Start Coding — Baksos TI Universitas Udayana
        </p>

        <WelcomeStage onToggle={playClick} />

        <section aria-label="Pilih tahap belajar" className="mt-8 grid w-full gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map(({ key, ...s }, i) => (
            <MenuCard
              key={key}
              {...s}
              done={visited.includes(key)}
              suggested={key === nextStep}
              delay={i * 0.12}
              onClick={() => choose(key)}
            />
          ))}
          <MenuCard
            {...BONUS}
            bonus
            done={visited.includes(BONUS.key)}
            delay={STEPS.length * 0.12}
            onClick={() => choose(BONUS.key)}
          />
        </section>

        <p className="mt-6 rounded-xl border-2 border-slate-800 bg-[#fffaf0]/90 px-4 py-2 text-center text-xs font-semibold text-slate-700">
          Tips: ikuti Langkah 1 → 2 → 3 agar lebih siap. Minigame Kedai adalah bonus, boleh dimainkan bersama partner kapan saja.
        </p>
      </main>

      {onOpenAdmin && (
        <button
          type="button"
          onClick={() => { playClick(); onOpenAdmin(); }}
          className="fixed bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full border-2 border-slate-800 bg-[#fffaf0]/90 px-3 py-1 text-[11px] font-bold text-slate-600 opacity-70 shadow-[2px_2px_0px_#1e293b] transition-opacity hover:opacity-100 focus-visible:opacity-100"
        >
          <MonitorCog className="h-3.5 w-3.5" aria-hidden /> Mode Fasilitator
        </button>
      )}
    </VillageBackdrop>
  );
}

/** Papan judul kayu dengan ukiran patra emas di keempat sudut. */
function TitleBoard() {
  return (
    <div className="relative mt-2 w-full max-w-3xl">
      {/* Tali gantungan papan */}
      <div className="absolute -top-4 left-[18%] h-6 w-1.5 rounded-full border border-slate-800 bg-[#8b5a2b]" aria-hidden="true" />
      <div className="absolute -top-4 right-[18%] h-6 w-1.5 rounded-full border border-slate-800 bg-[#8b5a2b]" aria-hidden="true" />

      <div
        className="relative rounded-3xl border-2 border-slate-800 px-8 py-5 text-center shadow-[6px_6px_0px_#1e293b] sm:px-14"
        style={WOOD_BG}
      >
        <div className="pointer-events-none absolute inset-2 rounded-2xl border-2 border-dashed border-[#e9b949]/70" aria-hidden="true" />
        {['left-1 top-1', 'right-1 top-1 rotate-90', 'bottom-1 right-1 rotate-180', 'bottom-1 left-1 -rotate-90'].map((pos) => (
          <PatraCorner key={pos} className={`absolute h-9 w-9 ${pos}`} />
        ))}

        <h1 className="relative">
          <span
            className="block text-5xl font-black tracking-wide text-[#ffd23f] sm:text-7xl"
            style={{ WebkitTextStroke: '2px #1e293b', textShadow: '4px 4px 0 #1e293b' }}
          >
            INSTHINK<span className="sr-only">:</span>
          </span>
          <span
            className="mt-1 block text-xl font-black text-[#fff7e0] sm:text-3xl"
            style={{ textShadow: '2px 2px 0 #1e293b' }}
          >
            Kedai Kopi &amp; Camilan Desa
          </span>
        </h1>
      </div>
    </div>
  );
}

function PatraCorner({ className }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" fill="none" strokeLinecap="round">
      <path d="M4 34 Q4 4 34 4" stroke="#1e293b" strokeWidth="6" />
      <path d="M4 34 Q4 4 34 4" stroke="#e9b949" strokeWidth="3" />
      <path d="M12 30 Q10 12 28 12 Q20 16 20 22 Q20 28 12 30 Z" fill="#e9b949" stroke="#1e293b" strokeWidth="2" />
      <circle cx="30" cy="22" r="3" fill="#c4562f" stroke="#1e293b" strokeWidth="2" />
    </svg>
  );
}

/** Bu Ratna, Kasir, dan Penjaga Gudang berdiri di teras kedai menyambut pemain. */
function WelcomeStage({ onToggle }) {
  const [gender, setGender] = useState(loadSkinPref);
  const choose = (next) => {
    onToggle?.();
    setGender(next);
    saveSkinPref(next);
  };

  return (
    <section aria-label="Para tokoh kedai" className="relative mt-6 w-full max-w-3xl">
      <div className="flex items-end justify-center gap-1 sm:gap-6">
        <div className="prolog-slide-in w-[78px] shrink-0 sm:w-[120px]">
          <RoleCharacter key={`k-${gender}`} role="cashier" gender={gender} mood="happy" size="100%" />
        </div>
        <BuRatnaCharacter
          mood="idle"
          size={150}
          bubblePosition="top"
          title="Bu Ratna"
          dialogue="Om Swastyastu! Belajar dulu, ikut Quiz sebentar, lalu bantu Ibu membuat Money Tracker. Mau main kedai bersama teman? Ada minigame bonusnya!"
        />
        <div className="prolog-slide-in w-[78px] shrink-0 sm:w-[120px]" style={{ animationDelay: '0.15s' }}>
          <RoleCharacter key={`g-${gender}`} role="warehouse" gender={gender} mood="happy" size="100%" caption="Gudang" />
        </div>
      </div>
      {/* Lantai teras kayu */}
      <div className="-mt-3 h-5 w-full rounded-full border-2 border-slate-800 shadow-[3px_3px_0px_#1e293b]" style={WOOD_BG} aria-hidden="true" />

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Ganti tampilan karakter Kasir dan Gudang">
        <span className="rounded-full bg-[#fffaf0]/90 px-2 text-xs font-bold text-slate-700">Ganti Tampilan Karakter:</span>
        <div className="flex rounded-full border-2 border-slate-800 bg-white p-0.5 shadow-[2px_2px_0px_#1e293b]">
          {[['male', 'Cowok'], ['female', 'Cewek']].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => choose(key)}
              aria-pressed={gender === key}
              className={`rounded-full px-3 py-1 text-xs font-black transition-all active:scale-95 ${gender === key ? 'bg-[#ffd23f] text-slate-900' : 'text-slate-600 hover:bg-[#fff1c1]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function MenuCard({ step, title, desc, cta, icon: Icon, iconBg, primary, bonus, done, suggested, delay, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
      className={`${CARD} prolog-slide-in group relative flex flex-col p-5 pt-7 text-left transition-all duration-150 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#1e293b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9b949] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1e293b] ${
        primary ? '!bg-[#fff1c1] xl:-translate-y-2' : ''
      } ${bonus ? '!border-dashed !bg-[#f3efff]' : ''}`}
    >
      {bonus ? (
        <span className="absolute -top-3.5 left-4 flex items-center gap-1 rounded-full border-2 border-slate-800 bg-[#7c5cc4] px-3 py-0.5 text-xs font-black text-white shadow-[2px_2px_0px_#1e293b]">
          <Sparkles className="h-3 w-3" aria-hidden /> Bonus
        </span>
      ) : (
        <span className="absolute -top-3.5 left-4 rounded-full border-2 border-slate-800 bg-[#c4562f] px-3 py-0.5 text-xs font-black text-white shadow-[2px_2px_0px_#1e293b]">
          Langkah {step}
          {primary && ' — Utama'}
        </span>
      )}

      {done ? (
        <span className="absolute -top-3.5 right-4 flex items-center gap-1 rounded-full border-2 border-slate-800 bg-[#a5d68f] px-2 py-0.5 text-[11px] font-bold text-slate-900">
          <Check className="h-3 w-3" aria-hidden /> Sudah dibuka
        </span>
      ) : (
        suggested && (
          <span className="absolute -top-3.5 right-4 rounded-full border-2 border-slate-800 bg-[#ffd23f] px-2 py-0.5 text-[11px] font-bold text-slate-900">
            Disarankan
          </span>
        )
      )}

      <span className="flex items-center gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-slate-800 shadow-[2px_2px_0px_#1e293b] ${iconBg}`}>
          <Icon className="h-6 w-6 text-slate-900" aria-hidden />
        </span>
        <span className="text-lg font-black leading-tight text-slate-900">{title}</span>
      </span>

      <span className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">{desc}</span>

      <span
        className={`mt-4 flex items-center justify-center gap-1 rounded-xl border-2 border-slate-800 py-2.5 font-black shadow-[3px_3px_0px_#1e293b] transition-all group-active:shadow-[1px_1px_0px_#1e293b] ${
          primary ? 'prolog-cta-pulse bg-[#ffd23f] text-slate-900' : bonus ? 'bg-[#7c5cc4] text-white' : 'bg-[#4f8f3a] text-white'
        }`}
      >
        {cta} <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
      </span>
    </button>
  );
}
