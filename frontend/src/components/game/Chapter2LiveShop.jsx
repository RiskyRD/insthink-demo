import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Banknote, BellRing, CheckCircle2, ChefHat, Clock, Coins, Loader2, Lock, PackageCheck, PackagePlus,
  Receipt, ShoppingBag, Snowflake, Store, Target, TrendingDown, TrendingUp, Trophy, Users, Warehouse,
} from 'lucide-react';
import BuRatnaCharacter from './BuRatnaCharacter';
import HintBanner from './HintBanner';
import VillagerAvatar from './VillagerAvatar';
import { CashierCharacter, WarehouseCharacter } from './ShopCharacters';
import IngredientIcon from './chapter2/IngredientIcon';
import { useGameAudio } from './useGameAudio';
import { CARD, TACTILE, WOOD_BG } from './theme';
import {
  LOW_CASH, LOW_STOCK, PACK_SIZE, QUEUE_LENGTH, SHOP_MENU, SUPPLIES, SUPPLY_KEYS, TOTAL_CUSTOMERS, TOTAL_WAVES, WAVE_SIZE,
  changeOptions, idleStockValue, queueFrom, stockEfficiency,
} from './chapter2/shopData';
import { api, formatDuration, formatRupiah } from '../../lib/api';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function useAnimatedNumber(value, duration = 700) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return undefined;
    if (prefersReducedMotion()) {
      fromRef.current = value;
      setDisplay(value);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const v = Math.round(from + (value - from) * (1 - (1 - p) ** 3));
      fromRef.current = v;
      setDisplay(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const supplyName = (key) => SUPPLIES[key]?.short ?? key;

/** Status stok: hijau aman, kuning menipis (<= 2), merah habis (0). */
function stockTone(stock) {
  if (stock <= 0) return { bar: 'bg-rose-500', chip: 'bg-rose-500 text-white', label: 'Habis' };
  if (stock <= LOW_STOCK) return { bar: 'bg-amber-400', chip: 'bg-amber-300 text-amber-950', label: 'Menipis' };
  return { bar: 'bg-emerald-500', chip: 'bg-emerald-400 text-emerald-950', label: 'Aman' };
}

/**
 * Chapter 2: kedai berjalan live. Semua angka kas/stok berasal dari server
 * (`shop`), diperbarui lewat event shop.updated dan respons HTTP aksi sendiri.
 *
 * @param {(state: object, action: object) => void} onActionDone  respons serve/restock milik pemain ini
 */
export default function Chapter2LiveShop({ me, room, partner, shop, catalog, token, realtime, hints = [], onDismissHint, ledger, onActionDone }) {
  const served = shop.customers_served;
  const queue = useMemo(() => queueFrom(room.room_code, served), [room.room_code, served]);
  const wavesDone = served >= TOTAL_CUSTOMERS;

  if (wavesDone) {
    return <ShopResultScreen variant="evaluation" me={me} partner={partner} room={room} shop={shop} ledger={ledger} />;
  }

  const sendPing = (kind, title, content) =>
    realtime.sendHint?.({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, title, content, from: me.name });

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <SharedHud shop={shop} served={served} />
      <HintBanner hints={hints} onDismiss={onDismissHint} />
      {me.role === 'cashier' ? (
        <CashierCounter me={me} partner={partner} room={room} shop={shop} catalog={catalog} token={token} queue={queue} realtime={realtime} sendPing={sendPing} onActionDone={onActionDone} />
      ) : (
        <WarehouseRoom me={me} partner={partner} room={room} shop={shop} catalog={catalog} token={token} queue={queue} realtime={realtime} sendPing={sendPing} onActionDone={onActionDone} />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// HUD bersama
// ----------------------------------------------------------------------
function SharedHud({ shop, served }) {
  const { playSuccess, playClick } = useGameAudio();
  const money = useAnimatedNumber(shop.shared_money);
  const prevRef = useRef(shop.shared_money);
  const [delta, setDelta] = useState(null);

  useEffect(() => {
    const diff = shop.shared_money - prevRef.current;
    prevRef.current = shop.shared_money;
    if (!diff) return undefined;
    if (diff > 0) playSuccess();
    else playClick();
    setDelta({ id: Date.now(), value: diff });
    const t = setTimeout(() => setDelta(null), 1600);
    return () => clearTimeout(t);
  }, [shop.shared_money, playSuccess, playClick]);

  const percent = Math.min(100, Math.round((shop.shared_money / shop.target_money) * 100));
  const lowCash = shop.shared_money < LOW_CASH;
  const wave = Math.min(TOTAL_WAVES, Math.floor(served / WAVE_SIZE) + 1);

  return (
    <section className={`${CARD} sticky top-[72px] z-20 grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center`} aria-label="Status kedai bersama">
      <div className={`relative rounded-xl border-2 border-slate-800 px-4 py-2 ${lowCash ? 'low-cash-pulse bg-rose-100' : 'bg-emerald-50'}`}>
        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600">
          <Coins className="h-3.5 w-3.5" aria-hidden /> Kas Usaha Bersama
        </p>
        <p className={`font-mono text-3xl font-black ${lowCash ? 'text-rose-600' : 'text-emerald-700'}`} aria-live="polite">{formatRupiah(money)}</p>
        {delta && (
          <span key={delta.id} className={`money-float absolute -top-3 right-2 rounded-full border-2 border-slate-800 px-2 font-mono text-sm font-black ${delta.value > 0 ? 'bg-[#ffd23f] text-slate-900' : 'bg-rose-400 text-white'}`}>
            {delta.value > 0 ? '+' : '−'}{formatRupiah(Math.abs(delta.value))}
          </span>
        )}
        {lowCash && (
          <p className="mt-0.5 flex items-center gap-1 text-xs font-black text-rose-700"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Kas menipis! Hemat belanja.</p>
        )}
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs font-black text-slate-700">
          <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" aria-hidden /> Target {formatRupiah(shop.target_money)}</span>
          <span>{percent}%</span>
        </div>
        <div className="h-6 overflow-hidden rounded-full border-2 border-slate-800 bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-400 to-[#ffd23f] transition-[width] duration-700" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="flex gap-2">
        <Stat icon={Users} label="Terlayani" value={served} />
        <Stat icon={Clock} label="Gelombang" value={`${wave}/${TOTAL_WAVES}`} />
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border-2 border-slate-800 bg-white px-3 py-1.5 text-center">
      <p className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500"><Icon className="h-3 w-3" aria-hidden /> {label}</p>
      <p className="font-mono text-xl font-black text-slate-900">{value}</p>
    </div>
  );
}

// ----------------------------------------------------------------------
// Antrean pelanggan (kesabaran dihitung lokal; tidak mengubah state server)
// ----------------------------------------------------------------------
function usePatience(queue) {
  const arrivals = useRef(new Map());
  const now = useNow(1000);
  queue.forEach((c) => {
    if (!arrivals.current.has(c.index)) arrivals.current.set(c.index, Date.now());
  });
  return (customer) => {
    const elapsed = (now - (arrivals.current.get(customer.index) ?? now)) / 1000;
    return Math.max(0, 1 - elapsed / customer.patienceSec);
  };
}

function PatienceBar({ ratio }) {
  const tone = ratio > 0.5 ? 'bg-emerald-500' : ratio > 0.2 ? 'bg-amber-400' : 'bg-rose-500';
  return (
    <div className="h-2.5 overflow-hidden rounded-full border-2 border-slate-800 bg-white" role="meter" aria-label="Kesabaran pelanggan" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full transition-[width] duration-1000 ease-linear ${tone}`} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

function RecipeIcons({ recipe, inventory, size = 'h-7 w-7' }) {
  return (
    <span className="flex items-center gap-1">
      {recipe.map((item, i) => {
        const empty = inventory && (inventory[item] ?? 0) <= 0;
        return (
          <span key={item} className="flex items-center gap-1">
            {i > 0 && <span className="text-xs font-black text-slate-400">+</span>}
            <span className={`relative rounded-lg border-2 ${empty ? 'border-rose-500 bg-rose-50' : 'border-slate-800 bg-white'} p-0.5`} title={supplyName(item)}>
              <IngredientIcon item={item} className={size} />
              {empty && <Lock className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full bg-rose-500 p-0.5 text-white" aria-label="stok habis" />}
            </span>
          </span>
        );
      })}
    </span>
  );
}

// ----------------------------------------------------------------------
// Kasir: antrean + meja racik + mesin kasir
// ----------------------------------------------------------------------
function CashierCounter({ me, partner, room, shop, catalog, token, queue, realtime, sendPing, onActionDone }) {
  const patience = usePatience(queue);
  const front = queue[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className={`${CARD} p-4`}>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800">
          <Users className="h-4 w-4 text-amber-700" aria-hidden /> Antrean Pelanggan
        </h3>
        <ol className="space-y-3">
          {queue.map((c, i) => {
            const menu = SHOP_MENU[c.menuKey];
            const ratio = patience(c);
            return (
              <li
                key={c.index}
                className={`customer-reveal rounded-xl border-2 border-slate-800 p-2.5 ${i === 0 ? 'bg-[#fff6c7] shadow-[3px_3px_0px_#1e293b]' : 'bg-white opacity-90'} ${ratio === 0 ? 'block-shake' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <VillagerAvatar index={c.avatar} className="h-11 w-11 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900">{c.name} {i === 0 && <span className="ml-1 rounded-full bg-emerald-500 px-1.5 text-[10px] text-white">DILAYANI</span>}</p>
                    <p className="truncate text-xs font-bold text-amber-800">{menu.name}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <RecipeIcons recipe={menu.recipe} inventory={shop.inventory} size="h-5 w-5" />
                  <span className="font-mono text-xs font-black text-slate-700">{formatRupiah(menu.price)}</span>
                </div>
                <div className="mt-2"><PatienceBar ratio={ratio} /></div>
                {ratio === 0 && <p className="mt-1 text-[11px] font-black text-rose-600">Pelanggan mulai kesal! Cepat layani.</p>}
              </li>
            );
          })}
        </ol>
      </aside>

      {front && (
        <CookingStation
          key={front.index}
          customer={front}
          me={me}
          partner={partner}
          room={room}
          shop={shop}
          catalog={catalog}
          token={token}
          realtime={realtime}
          sendPing={sendPing}
          onActionDone={onActionDone}
        />
      )}
    </div>
  );
}

function CookingStation({ customer, me, partner, room, shop, catalog, token, realtime, sendPing, onActionDone }) {
  const { playClick, playError, playCashRegister } = useGameAudio();
  const serverMenu = catalog?.menu?.find((m) => m.key === customer.menuKey);
  const menu = SHOP_MENU[customer.menuKey];
  const price = serverMenu?.price ?? menu.price;
  const recipe = serverMenu?.recipe?.map((r) => r.item_key) ?? menu.recipe;
  const options = useMemo(() => changeOptions(room.room_code, customer, price), [room.room_code, customer, price]);

  const [added, setAdded] = useState([]);
  const [wrong, setWrong] = useState(null);
  const [choice, setChoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [say, setSay] = useState(null);
  const [pinged, setPinged] = useState({});

  const cooked = added.length === recipe.length;
  const next = recipe[added.length];
  const correctChange = customer.cash - price;

  const addIngredient = (item) => {
    if (cooked) return;
    if (item !== next) {
      playError();
      setWrong({ item, id: Date.now() });
      setSay({
        mood: 'shocked',
        text: recipe.includes(item) && added.includes(item)
          ? `${supplyName(item)} sudah dimasukkan. Berikutnya: ${supplyName(next)}.`
          : recipe.includes(item)
            ? `Urutannya belum tepat! Masukkan ${supplyName(next)} dulu.`
            : `${supplyName(item)} tidak ada di resep ${menu.name}.`,
      });
      return;
    }
    playClick();
    const nextAdded = [...added, item];
    setAdded(nextAdded);
    setSay(nextAdded.length === recipe.length
      ? { mood: 'happy', text: `${menu.name} siap! ${customer.name} membayar ${formatRupiah(customer.cash)}. Berapa kembaliannya?` }
      : { mood: 'idle', text: `Bagus! Sekarang ${supplyName(recipe[nextAdded.length])}.` });
  };

  const requestRestock = (item) => {
    if (sendPing('restock', `Stok ${supplyName(item)} habis`, `${SUPPLIES[item].name}: 0 unit`) === false) return;
    playClick();
    setPinged((p) => ({ ...p, [item]: true }));
  };

  const finish = async () => {
    if (choice === null || submitting) return;
    if (choice !== correctChange) {
      playError();
      setSay({ mood: 'shocked', text: `Kembalian belum tepat. Ingat rumus Chapter 1: kembalian = uang_bayar - total_harga = ${formatRupiah(customer.cash)} - ${formatRupiah(price)}.` });
      setChoice(null);
      return;
    }
    setSubmitting(true);
    try {
      const state = await api(`/rooms/${room.room_code}/serve-order`, { method: 'POST', token, body: { menu_key: customer.menuKey } });
      playCashRegister();
      onActionDone(state, {
        type: 'serve',
        money_delta: price,
        inventory_delta: Object.fromEntries(recipe.map((k) => [k, -1])),
      });
    } catch (err) {
      playError();
      setSay({ mood: 'shocked', text: err.message });
      setSubmitting(false);
    }
  };

  const mood = say?.mood ?? 'idle';
  const isDrink = menu.kind === 'drink';

  return (
    <section className={`${CARD} p-4`} aria-labelledby="cook-title">
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] flex-1">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-700"><ChefHat className="h-4 w-4" aria-hidden /> Meja Racik</p>
          <h2 id="cook-title" className="text-2xl font-black text-slate-900">{menu.name}</h2>
          <p className="text-sm font-semibold text-slate-600">Pesanan {customer.name} · {formatRupiah(price)}</p>
        </div>
        <div className="flex items-end gap-2">
          <CashierCharacter mood={submitting ? 'thinking' : mood} size={90} caption={`${me.name} (Kamu)`} />
          <WarehouseCharacter mood={!partner || !realtime.partnerOnline ? 'offline' : 'idle'} size={72} caption={partner?.name ?? 'Gudang'} dim />
        </div>
      </div>

      <div className="mb-4 rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-[#e3f4fb] to-[#fff6dc] p-3">
        <BuRatnaCharacter
          mood={mood === 'idle' ? 'talking' : mood}
          size={80}
          title="Pemilik Kedai"
          dialogue={say?.text ?? `Klik bahan sesuai urutan resep: ${recipe.map(supplyName).join(' → ')}.`}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
        {/* Rak bahan di meja racik */}
        <div>
          <ol className="mb-3 flex flex-wrap items-center gap-2" aria-label="Urutan resep">
            {recipe.map((item, i) => (
              <li key={item} className={`flex items-center gap-1 rounded-full border-2 border-slate-800 px-2 py-0.5 text-xs font-black ${i < added.length ? 'bg-emerald-400 text-white' : i === added.length ? 'hud-pulse bg-[#ffd23f]' : 'bg-white text-slate-500'}`}>
                {i < added.length ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <span>{i + 1}</span>} {supplyName(item)}
              </li>
            ))}
          </ol>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SUPPLY_KEYS.map((item) => {
              const stock = shop.inventory?.[item] ?? 0;
              const empty = stock <= 0;
              const isNext = item === next && !cooked;
              return (
                <div key={item} className="relative">
                  <button
                    type="button"
                    onClick={() => addIngredient(item)}
                    disabled={empty || cooked || submitting}
                    className={`${TACTILE} ${isNext ? 'tutorial-glow' : ''} ${wrong?.item === item ? 'block-shake' : ''} flex w-full flex-col items-center rounded-xl px-2 py-2 ${empty ? 'cursor-not-allowed bg-rose-100' : 'bg-white hover:bg-amber-50'} disabled:active:translate-x-0 disabled:active:translate-y-0`}
                    key={wrong?.item === item ? wrong.id : item}
                    aria-label={`${SUPPLIES[item].name}, stok ${stock}`}
                  >
                    <IngredientIcon item={item} className={`h-11 w-11 ${empty ? 'opacity-40 grayscale' : ''}`} />
                    <span className="text-xs font-black text-slate-800">{supplyName(item)}</span>
                    <span className={`font-mono text-[11px] font-bold ${empty ? 'text-rose-600' : 'text-slate-500'}`}>stok {stock}</span>
                  </button>
                  {empty && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-rose-600 bg-rose-500/90 p-1 text-center">
                      <span className="flex items-center gap-1 text-[11px] font-black leading-tight text-white"><Lock className="h-3.5 w-3.5" aria-hidden /> STOK HABIS! Minta Gudang Restock!</span>
                      <button
                        type="button"
                        onClick={() => requestRestock(item)}
                        disabled={pinged[item] || !realtime.partnerOnline}
                        className="rounded-full border-2 border-slate-800 bg-white px-2 text-[10px] font-black text-slate-900 disabled:opacity-60"
                      >
                        {pinged[item] ? 'Terkirim!' : 'Kirim ping'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Gelas / kotak racikan */}
        <div className="flex flex-col items-center">
          <div
            className={`relative h-44 w-36 overflow-hidden border-[3px] border-slate-800 ${isDrink ? 'bg-sky-50/80' : 'rounded-xl bg-[#e8cfa4]'}`}
            style={isDrink ? { clipPath: 'polygon(6% 0, 94% 0, 82% 100%, 18% 100%)', borderRadius: 0 } : undefined}
            aria-label={`Racikan ${added.length} dari ${recipe.length} bahan`}
          >
            <div className="absolute inset-x-0 bottom-0 flex flex-col-reverse">
              {added.map((item) => (
                <div
                  key={item}
                  className="ingredient-drop border-t-2 border-slate-800/30"
                  style={{ height: `${(170 / recipe.length) * 0.85}px`, background: SUPPLIES[item].color }}
                />
              ))}
            </div>
            {isDrink && <div className="absolute inset-y-0 left-3 w-2 rounded-full bg-white/60" aria-hidden />}
          </div>
          {isDrink && <div className="h-2 w-24 rounded-b-lg border-2 border-t-0 border-slate-800 bg-slate-300" aria-hidden />}
          <div className="mt-3 w-full">
            <p className="mb-1 flex justify-between text-xs font-black text-slate-700"><span>Peracikan</span><span>{added.length}/{recipe.length}</span></p>
            <div className="h-4 overflow-hidden rounded-full border-2 border-slate-800 bg-white">
              <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-[width] duration-300" style={{ width: `${(added.length / recipe.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {cooked && (
        <div className="customer-reveal mt-5 rounded-2xl border-2 border-slate-800 bg-[#fffdf5] p-4 shadow-[4px_4px_0px_#1e293b]">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><Receipt className="h-4 w-4 text-amber-700" aria-hidden /> Mesin Kasir</h3>
          <div className="mb-3 flex flex-wrap items-center gap-3 font-mono text-sm">
            <span className="rounded-lg border-2 border-slate-800 bg-white px-3 py-1">total_harga = <b>{formatRupiah(price)}</b></span>
            <span className="flex items-center gap-1 rounded-lg border-2 border-slate-800 bg-emerald-100 px-3 py-1"><Banknote className="h-4 w-4" aria-hidden /> uang_bayar = <b>{formatRupiah(customer.cash)}</b></span>
            <span className="rounded-lg border-2 border-dashed border-slate-500 px-3 py-1 text-slate-600">kembalian = uang_bayar - total_harga</span>
          </div>
          <p className="mb-2 text-sm font-bold text-slate-700">Pilih nominal kembalian yang benar:</p>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {options.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => { playClick(); setChoice(value); }}
                aria-pressed={choice === value}
                className={`${TACTILE} rounded-xl px-3 py-2 font-mono text-base font-black ${choice === value ? 'bg-[#ffd23f] text-slate-900' : 'bg-white text-slate-800 hover:bg-amber-50'}`}
              >
                {formatRupiah(value)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={finish}
            disabled={choice === null || submitting}
            className={`${TACTILE} flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-lg font-black text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {submitting ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : <ShoppingBag className="h-6 w-6" aria-hidden />}
            Selesaikan Transaksi
          </button>
        </div>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------
// Stok Gudang: rak + prediksi antrean + restock
// ----------------------------------------------------------------------
function WarehouseRoom({ me, partner, room, shop, catalog, token, queue, realtime, sendPing, onActionDone }) {
  const { playError } = useGameAudio();
  const [busy, setBusy] = useState(null);
  const [say, setSay] = useState(null);
  const [announced, setAnnounced] = useState(false);
  const maxStock = shop.max_stock ?? 8;
  const packPrice = (key) => catalog?.supplies?.find((s) => s.key === key)?.pack_price ?? SUPPLIES[key].packPrice;

  // Kebutuhan bahan untuk seluruh antrean yang terlihat.
  const demand = useMemo(() => {
    const d = {};
    queue.forEach((c) => SHOP_MENU[c.menuKey].recipe.forEach((k) => { d[k] = (d[k] ?? 0) + 1; }));
    return d;
  }, [queue]);
  const shortages = SUPPLY_KEYS.filter((k) => (demand[k] ?? 0) > (shop.inventory?.[k] ?? 0));

  const restock = async (key) => {
    if (busy) return;
    setBusy(key);
    const cost = packPrice(key);
    try {
      const state = await api(`/rooms/${room.room_code}/restock`, { method: 'POST', token, body: { item_key: key, qty: PACK_SIZE } });
      setSay({ mood: 'happy', text: `${SUPPLIES[key].name} bertambah 3 unit. Kas berkurang ${formatRupiah(cost)}.` });
      setAnnounced(false);
      onActionDone(state, { type: 'restock', money_delta: -cost, inventory_delta: { [key]: PACK_SIZE } });
    } catch (err) {
      playError();
      setSay({ mood: 'shocked', text: err.message });
    } finally {
      setBusy(null);
    }
  };

  const announce = () => {
    if (sendPing('stock_ready', 'Bahan sudah datang!', 'Rak gudang sudah diisi ulang. Silakan lanjut meracik.') === false) return;
    setAnnounced(true);
  };

  let dialogue = say?.text;
  if (!dialogue) {
    dialogue = shortages.length
      ? `Antrean butuh lebih banyak ${shortages.map(supplyName).join(', ')} daripada stok kita. Restock sebelum Kasir kehabisan!`
      : 'Stok cukup untuk antrean saat ini. Jangan belanja berlebihan, uang yang tertahan di rak tidak bisa dipakai.';
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className={`${CARD} p-4`} aria-labelledby="shelf-title">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-700"><Warehouse className="h-4 w-4" aria-hidden /> Gudang Kedai</p>
            <h2 id="shelf-title" className="text-2xl font-black text-slate-900">Rak Bahan Baku</h2>
            <p className="text-sm font-semibold text-slate-600">Maksimal {maxStock} unit per bahan · paket kulakan +{PACK_SIZE} unit</p>
          </div>
          <div className="flex items-end gap-2">
            <WarehouseCharacter mood={busy ? 'thinking' : say?.mood ?? (shortages.length ? 'shocked' : 'idle')} size={90} caption={`${me.name} (Kamu)`} />
            <CashierCharacter mood={!partner || !realtime.partnerOnline ? 'offline' : 'idle'} size={72} caption={partner?.name ?? 'Kasir'} dim />
          </div>
        </div>

        <div className="mb-4 rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-[#e3f4fb] to-[#fff6dc] p-3">
          <BuRatnaCharacter mood={say?.mood === 'shocked' || shortages.length ? 'shocked' : 'talking'} size={80} title="Pemilik Kedai" dialogue={dialogue} />
        </div>

        <div className="rounded-2xl border-2 border-slate-800 p-3" style={WOOD_BG}>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SUPPLY_KEYS.map((key) => {
              const stock = shop.inventory?.[key] ?? 0;
              const cost = packPrice(key);
              const tone = stockTone(stock);
              const overstock = stock + PACK_SIZE > maxStock;
              const broke = shop.shared_money < cost;
              const need = demand[key] ?? 0;
              return (
                <li key={key} className="rounded-xl border-2 border-slate-800 bg-[#fffaf0] p-3">
                  <div className="flex items-center gap-2">
                    <IngredientIcon item={key} className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">{SUPPLIES[key].name}</p>
                      <span className={`rounded-full border-2 border-slate-800 px-1.5 text-[10px] font-black ${tone.chip}`}>{tone.label}</span>
                      {need > 0 && <span className="ml-1 text-[10px] font-bold text-slate-500">antrean butuh {need}</span>}
                    </div>
                    <span className="font-mono text-lg font-black text-slate-900">{stock}/{maxStock}</span>
                  </div>
                  <div className="mt-2 flex h-4 gap-0.5 rounded-md border-2 border-slate-800 bg-white p-0.5" aria-hidden>
                    {Array.from({ length: maxStock }, (_, i) => (
                      <span key={i} className={`flex-1 rounded-sm transition-colors duration-300 ${i < stock ? tone.bar : 'bg-slate-100'}`} />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => restock(key)}
                    disabled={overstock || broke || Boolean(busy)}
                    className={`${TACTILE} mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#ffd23f] px-2 py-1.5 text-sm font-black text-slate-900 hover:bg-[#ffdc5e] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:active:translate-x-0 disabled:active:translate-y-0`}
                  >
                    {busy === key ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <PackagePlus className="h-4 w-4" aria-hidden />}
                    Beli Restock (+3 unit) · {formatRupiah(cost)}
                  </button>
                  {overstock && (
                    <p className="mt-1 flex items-start gap-1 text-[11px] font-bold text-sky-800">
                      <Snowflake className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Rak hampir penuh: {stock} + 3 = {stock + 3} melebihi {maxStock}. Overstock membekukan modal!
                    </p>
                  )}
                  {!overstock && broke && (
                    <p className="mt-1 flex items-start gap-1 text-[11px] font-bold text-rose-700">
                      <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Kas tidak cukup ({formatRupiah(shop.shared_money)}). Tunggu Kasir menjual dulu.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 p-3 text-sm text-sky-900">
          <Snowflake className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p><b>Ingat bahaya overstock:</b> setiap rupiah yang dipakai kulakan bahan yang belum terjual menjadi modal yang "membeku" di rak. Kas bisa habis padahal pelanggan butuh bahan lain. Belilah sesuai kebutuhan antrean.</p>
        </div>
      </section>

      <aside className="space-y-5">
        <div className={`${CARD} p-4`}>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><Store className="h-4 w-4 text-amber-700" aria-hidden /> Prediksi Antrean Pelanggan</h3>
          <p className="mb-3 text-xs font-semibold text-slate-500">Pesanan yang sedang menunggu di meja Kasir ({QUEUE_LENGTH} terdepan).</p>
          <ol className="space-y-2.5">
            {queue.map((c, i) => {
              const menu = SHOP_MENU[c.menuKey];
              return (
                <li key={c.index} className={`customer-reveal rounded-xl border-2 border-slate-800 p-2.5 ${i === 0 ? 'bg-[#fff6c7]' : 'bg-white'}`}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <VillagerAvatar index={c.avatar} className="h-9 w-9 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900">{c.name}{i === 0 && <span className="ml-1 text-[10px] text-emerald-700">· sedang dilayani</span>}</p>
                      <p className="truncate text-xs font-bold text-amber-800">{menu.name}</p>
                    </div>
                  </div>
                  <RecipeIcons recipe={menu.recipe} inventory={shop.inventory} size="h-6 w-6" />
                </li>
              );
            })}
          </ol>
          {shortages.length > 0 && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg border-2 border-rose-300 bg-rose-50 p-2 text-xs font-bold text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Kurang untuk antrean: {shortages.map((k) => `${supplyName(k)} (butuh ${demand[k]}, stok ${shop.inventory?.[k] ?? 0})`).join(', ')}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={announce}
          disabled={announced || !realtime.partnerOnline}
          className={`${TACTILE} flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-60 ${announced ? 'bg-emerald-500 text-white' : 'bg-white text-slate-800 hover:bg-amber-50'}`}
        >
          {announced ? <PackageCheck className="h-5 w-5" aria-hidden /> : <BellRing className="h-5 w-5" aria-hidden />}
          {announced ? 'Kasir sudah dikabari' : 'Kabari Kasir: Bahan Sudah Datang!'}
        </button>
      </aside>
    </div>
  );
}

// ----------------------------------------------------------------------
// Layar akhir: kemenangan (target tercapai) atau evaluasi (6 gelombang habis)
// ----------------------------------------------------------------------
export function ShopResultScreen({ variant = 'victory', me, partner, room, shop, ending, ledger }) {
  const victory = variant === 'victory';
  const [frozenNow] = useState(() => Date.now());
  const endAt = room.completed_at ? Date.parse(room.completed_at) : frozenNow;
  const chapter2Seconds = ledger?.chapter2StartedAt ? Math.max(0, Math.round((endAt - Date.parse(ledger.chapter2StartedAt)) / 1000)) : null;
  const totalSeconds = ending?.total_duration_seconds
    ?? (room.started_at ? Math.max(0, Math.round((endAt - Date.parse(room.started_at)) / 1000)) : null);
  const efficiency = stockEfficiency(ledger);
  const names = { [me.role]: me.name, ...(partner ? { [partner.role]: partner.name } : {}) };

  return (
    <section className="relative mx-auto max-w-4xl overflow-hidden" aria-labelledby="result-title">
      {victory && Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className="coin-fall flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-800 bg-[#ffd23f] text-[10px] font-black text-amber-900"
          style={{ left: `${(i * 41) % 100}%`, animationDuration: `${3 + (i % 4)}s`, animationDelay: `${(i % 5) * 0.5}s` }}
          aria-hidden
        >
          Rp
        </span>
      ))}

      <div className={`${CARD} celebration-pop relative p-6 text-center`}>
        {victory ? <Trophy className="trophy-bounce mx-auto h-14 w-14 text-amber-500" aria-hidden /> : <Clock className="mx-auto h-14 w-14 text-sky-600" aria-hidden />}
        <h2 id="result-title" className="mt-2 text-3xl font-black text-slate-900">
          {victory ? 'Target Tercapai! Kedai Sukses!' : 'Semua Gelombang Pelanggan Selesai'}
        </h2>
        <p className="mx-auto mt-1 max-w-xl text-slate-600">
          {victory
            ? ending?.message ?? 'Kerja sama Kasir dan Stok Gudang membuat kedai desa semakin maju.'
            : `Kas akhir ${formatRupiah(shop.shared_money)} dari target ${formatRupiah(shop.target_money)}. Ayo evaluasi: di mana uang paling banyak keluar?`}
        </p>

        <div className="mt-4 flex items-end justify-center gap-2">
          <CashierCharacter mood={victory ? 'happy' : 'thinking'} size={100} caption={names.cashier ?? 'Kasir'} />
          <BuRatnaCharacter mood={victory ? 'happy' : 'thinking'} size={110} />
          <WarehouseCharacter mood={victory ? 'happy' : 'thinking'} size={100} caption={names.warehouse ?? 'Penjaga Gudang'} />
        </div>

        <dl className="mt-6 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          <ResultStat icon={TrendingUp} tone="bg-emerald-50" label="Total Pendapatan" value={formatRupiah(ledger.revenue)} note={`${ledger.orders} pesanan terjual`} />
          <ResultStat icon={PackagePlus} tone="bg-amber-50" label="Pengeluaran Restock" value={formatRupiah(ledger.restockCost)} note={`${ledger.restocks}× kulakan, ${ledger.unitsBought} unit`} />
          <ResultStat icon={Snowflake} tone="bg-sky-50" label="Efisiensi Stok" value={`${efficiency}%`} note={`Modal membeku di rak: ${formatRupiah(idleStockValue(shop.inventory))}`} />
          <ResultStat icon={Clock} tone="bg-violet-50" label="Waktu Penyelesaian" value={formatDuration(chapter2Seconds ?? totalSeconds)} note={totalSeconds != null ? `Total sesi ${formatDuration(totalSeconds)}` : null} />
        </dl>
        <p className="mt-4 text-sm font-bold text-slate-700">
          Laba bersih kedai: <span className={shop.shared_money - 50000 >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatRupiah(shop.shared_money - 50000)}</span> · {shop.customers_served} pelanggan terlayani
        </p>
      </div>
    </section>
  );
}

function ResultStat({ icon: Icon, label, value, note, tone }) {
  return (
    <div className={`rounded-xl border-2 border-slate-800 p-3 shadow-[3px_3px_0px_#1e293b] ${tone}`}>
      <dt className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600"><Icon className="h-4 w-4" aria-hidden /> {label}</dt>
      <dd className="font-mono text-2xl font-black text-slate-900">{value}</dd>
      {note && <dd className="text-xs font-semibold text-slate-500">{note}</dd>}
    </div>
  );
}
