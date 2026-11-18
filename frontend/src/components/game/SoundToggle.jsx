import { Volume2, VolumeX } from 'lucide-react';
import { useGameAudio } from './useGameAudio';

/** Tombol bisu/suara untuk header (status disimpan di browser). */
export default function SoundToggle({ className = '' }) {
  const { muted, toggleMute, playClick } = useGameAudio();

  const handleClick = () => {
    const turningOn = muted;
    toggleMute();
    // Bunyi konfirmasi sekaligus "membangunkan" AudioContext dari interaksi pengguna.
    if (turningOn) playClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={!muted}
      aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
      title={muted ? 'Nyalakan suara' : 'Matikan suara'}
      className={`flex items-center gap-1.5 rounded-xl border-2 border-slate-800 px-2.5 py-1.5 text-sm font-bold shadow-[3px_3px_0px_#1e293b] transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1e293b] ${
        muted ? 'bg-slate-200 text-slate-600' : 'bg-[#ffd23f] text-slate-900'
      } ${className}`}
    >
      {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
      <span className="hidden sm:inline">{muted ? 'Suara mati' : 'Suara'}</span>
    </button>
  );
}
