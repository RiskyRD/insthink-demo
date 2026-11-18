import { useEffect, useRef, useState } from 'react';
import { BellRing, Check } from 'lucide-react';

const COOLDOWN_MS = 3000;

/** Tombol taktil "Kirim Petunjuk Ini ke Teknisi" dengan jeda singkat agar tidak di-spam. */
export default function SendHintButton({
  onSend, disabled = false, disabledReason = 'Teknisi belum online', label = 'Kirim Petunjuk Ini ke Teknisi',
  sentLabel = 'Terkirim ke Teknisi!', className = '',
}) {
  const [sent, setSent] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleClick = () => {
    if (sent || disabled) return;
    if (onSend() === false) return;
    setSent(true);
    timerRef.current = setTimeout(() => setSent(false), COOLDOWN_MS);
  };

  let tone = 'bg-[#ffd23f] text-slate-900 hover:bg-[#ffdc5e]';
  if (sent) tone = 'bg-emerald-500 text-white';
  else if (disabled) tone = 'bg-slate-200 text-slate-500 cursor-not-allowed';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || sent}
      title={disabled && !sent ? disabledReason : undefined}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-slate-800 px-3 py-1.5 text-xs font-bold shadow-[3px_3px_0px_#1e293b] transition-all duration-100 enabled:active:translate-x-[2px] enabled:active:translate-y-[2px] enabled:active:shadow-[1px_1px_0px_#1e293b] ${tone} ${className}`}
    >
      {sent ? <Check className="h-4 w-4" aria-hidden /> : <BellRing className="h-4 w-4" aria-hidden />}
      {sent ? sentLabel : disabled ? disabledReason : label}
    </button>
  );
}
