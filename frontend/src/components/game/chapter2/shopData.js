/**
 * Data & logika klien Chapter 2 "Kedai Kopi & Camilan Desa".
 *
 * Server tetap sumber kebenaran untuk harga, resep, kas, dan stok (ShopCatalog).
 * Salinan menu di sini dipakai untuk menyusun antrean pelanggan yang SAMA di
 * kedua layar tanpa endpoint baru: antrean dihitung deterministik dari
 * room_code + customers_served (yang disinkronkan server lewat shop.updated).
 */

/** Cermin backend App\Game\ShopCatalog::MENU — jaga agar tetap sama. */
export const SHOP_MENU = {
  es_kopi_aren: { name: 'Es Kopi Gula Aren', price: 18000, kind: 'drink', recipe: ['kopi', 'susu', 'gula_aren'] },
  pisang_krispi: { name: 'Pisang Krispi Cokelat', price: 15000, kind: 'snack', recipe: ['pisang', 'cokelat', 'kemasan'] },
  kopi_susu_spesial: { name: 'Kopi Susu Spesial', price: 16000, kind: 'drink', recipe: ['kopi', 'susu', 'kemasan'] },
  kopi_tubruk: { name: 'Kopi Tubruk Gula Aren', price: 9000, kind: 'drink', recipe: ['kopi', 'gula_aren', 'kemasan'] },
  pisang_goreng: { name: 'Pisang Goreng', price: 7000, kind: 'snack', recipe: ['pisang', 'kemasan'] },
};

/** Peluang muncul tiap menu (menu andalan lebih sering dipesan). */
const MENU_WEIGHTS = [
  ['es_kopi_aren', 3], ['pisang_krispi', 3], ['kopi_susu_spesial', 3], ['kopi_tubruk', 1], ['pisang_goreng', 1],
];

/** Cermin backend ShopCatalog::SUPPLIES (nama & harga kulakan per paket 3 unit). */
export const SUPPLIES = {
  kopi: { name: 'Bubuk Kopi', short: 'Kopi', packPrice: 9000, color: '#6b3f1d' },
  susu: { name: 'Susu Segar', short: 'Susu', packPrice: 7500, color: '#e0f2fe' },
  gula_aren: { name: 'Gula Aren', short: 'Gula Aren', packPrice: 6000, color: '#b5651d' },
  pisang: { name: 'Pisang Kepok', short: 'Pisang', packPrice: 4500, color: '#f4d35e' },
  cokelat: { name: 'Cokelat Batang', short: 'Cokelat', packPrice: 9000, color: '#4a2c1a' },
  kemasan: { name: 'Kemasan Daun & Gelas', short: 'Kemasan', packPrice: 3000, color: '#8fbc8f' },
};
export const SUPPLY_KEYS = Object.keys(SUPPLIES);

export const STARTING_UNITS = 16; // 3+3+2+3+2+3
export const PACK_SIZE = 3;
export const LOW_CASH = 10000;
export const LOW_STOCK = 2;
export const WAVE_SIZE = 3;
export const TOTAL_WAVES = 6;
export const TOTAL_CUSTOMERS = WAVE_SIZE * TOTAL_WAVES;
export const QUEUE_LENGTH = 3;

export const CUSTOMER_NAMES = [
  'Pak Darto', 'Bu Sumi', 'Dik Bayu', 'Mbah Karso', 'Mbak Laras', 'Pak Kades', 'Bu Wati', 'Mas Joko',
];

// ----------------------------------------------------------------------
// Antrean deterministik
// ----------------------------------------------------------------------
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG mulberry32: angka acak yang sama untuk seed yang sama di semua browser. */
function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(random, pairs) {
  const total = pairs.reduce((sum, [, w]) => sum + w, 0);
  let roll = random() * total;
  for (const [value, w] of pairs) {
    roll -= w;
    if (roll < 0) return value;
  }
  return pairs[0][0];
}

/** Uang tunai pelanggan: pas, kelipatan 5.000, kelipatan 10.000, atau Rp50.000. */
function cashFor(price, random) {
  const roll = random();
  if (roll < 0.15) return price;
  if (roll < 0.5) return Math.ceil((price + 1) / 5000) * 5000;
  if (roll < 0.85) return Math.ceil((price + 1) / 10000) * 10000;
  return 50000;
}

/** Pelanggan ke-`index` (0-based) di ruangan ini — identik di layar Kasir dan Gudang. */
export function customerAt(roomCode, index) {
  const random = rng(hash(`${roomCode}:${index}`));
  const menuKey = pickWeighted(random, MENU_WEIGHTS);
  const menu = SHOP_MENU[menuKey];
  return {
    index,
    wave: Math.floor(index / WAVE_SIZE) + 1,
    name: CUSTOMER_NAMES[Math.floor(random() * CUSTOMER_NAMES.length)],
    avatar: Math.floor(random() * 4),
    menuKey,
    cash: cashFor(menu.price, random),
    patienceSec: 45 + Math.floor(random() * 26),
  };
}

export function queueFrom(roomCode, served) {
  const out = [];
  for (let i = served; i < Math.min(served + QUEUE_LENGTH, TOTAL_CUSTOMERS); i++) out.push(customerAt(roomCode, i));
  return out;
}

/** Pilihan nominal kembalian (1 benar + pengecoh), urutannya tetap per pelanggan. */
export function changeOptions(roomCode, customer, price) {
  const correct = customer.cash - price;
  const candidates = [correct + 1000, correct + 5000, Math.abs(correct - 1000), customer.cash + price, price, correct + 2000];
  const options = [correct];
  for (const c of candidates) {
    if (options.length >= 4) break;
    if (c >= 0 && !options.includes(c)) options.push(c);
  }
  const random = rng(hash(`${roomCode}:change:${customer.index}`));
  return options
    .map((value) => ({ value, sort: random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((o) => o.value);
}

// ----------------------------------------------------------------------
// Buku kas klien (ringkasan performa tim)
// ----------------------------------------------------------------------
const ledgerKey = (roomCode) => `insthink.ledger.${roomCode}`;

export const emptyLedger = () => ({
  revenue: 0, restockCost: 0, unitsBought: 0, unitsUsed: 0, orders: 0, restocks: 0, chapter2StartedAt: null,
});

export function loadLedger(roomCode) {
  try {
    return { ...emptyLedger(), ...JSON.parse(localStorage.getItem(ledgerKey(roomCode)) ?? '{}') };
  } catch {
    return emptyLedger();
  }
}

export function saveLedger(roomCode, ledger) {
  try {
    localStorage.setItem(ledgerKey(roomCode), JSON.stringify(ledger));
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
}

/** Catat satu aksi kedai: { type: 'serve'|'restock', money_delta, inventory_delta }. */
export function recordAction(ledger, action) {
  if (!action) return ledger;
  const units = Object.values(action.inventory_delta ?? {}).reduce((sum, n) => sum + Math.abs(Number(n) || 0), 0);
  if (action.type === 'serve') {
    return { ...ledger, revenue: ledger.revenue + Math.abs(action.money_delta), unitsUsed: ledger.unitsUsed + units, orders: ledger.orders + 1 };
  }
  if (action.type === 'restock') {
    return { ...ledger, restockCost: ledger.restockCost + Math.abs(action.money_delta), unitsBought: ledger.unitsBought + units, restocks: ledger.restocks + 1 };
  }
  return ledger;
}

/** Persentase bahan yang benar-benar terjual dibanding seluruh bahan yang tersedia. */
export function stockEfficiency(ledger) {
  const available = STARTING_UNITS + ledger.unitsBought;
  return available ? Math.round((ledger.unitsUsed / available) * 100) : 0;
}

/** Nilai modal yang "membeku" di rak (stok tersisa × harga kulakan per unit). */
export function idleStockValue(inventory) {
  return SUPPLY_KEYS.reduce((sum, key) => sum + (Number(inventory?.[key]) || 0) * Math.round(SUPPLIES[key].packPrice / PACK_SIZE), 0);
}
