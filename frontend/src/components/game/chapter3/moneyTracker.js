/** Data & penilai Chapter 3: Money Tracker Kedai (sesuai materi Praktik Money Tracker). */

export const STARTER_CODE = `# Money Tracker Kedai Bu Ratna
# Langkah 1: minta modal kas harian, simpan di variabel uang_awal
#            (ingat: pakai int(input(...)) agar menjadi angka)


# Langkah 2: buat variabel total_pengeluaran yang dimulai dari 0


# Langkah 3: ulangi 3 kali dengan for i in range(3):
#            minta nominal pengeluaran (int(input(...))),
#            lalu tambahkan ke total_pengeluaran


# Langkah 4: hitung sisa_uang = uang_awal - total_pengeluaran,
#            lalu cetak dengan print("Total:", ...) dan print("Sisa uang:", ...)


# Langkah 5: pakai if-else. Jika total_pengeluaran > uang_awal,
#            cetak "Pengeluaran melebihi uang awal!"
#            selain itu cetak "Pengeluaran masih sesuai."
`;

/** Urutan kotak Masukan Uji (stdin) beserta nilai contoh bawaan. */
export const STDIN_FIELDS = [
  { key: 'uang_awal', label: 'Uang Awal', example: '25000' },
  { key: 'p1', label: 'Pengeluaran 1', example: '10000' },
  { key: 'p2', label: 'Pengeluaran 2', example: '5000' },
  { key: 'p3', label: 'Pengeluaran 3', example: '3000' },
];

/** Langkah di Kartu Misi Bu Ratna. */
export const MISSION_STEPS = [
  { code: 'uang_awal = int(input(...))', text: 'Baca modal kas harian sebagai angka.' },
  { code: 'total_pengeluaran = 0', text: 'Siapkan wadah penjumlahan mulai dari nol.' },
  { code: 'for i in range(3):', text: 'Minta 3 nominal pengeluaran dan jumlahkan ke total_pengeluaran.' },
  { code: 'sisa_uang = uang_awal - total_pengeluaran', text: 'Hitung sisa uang modal.' },
  { code: 'print("Total:", ...) / print("Sisa uang:", ...)', text: 'Tampilkan total pengeluaran dan sisa uang.' },
  { code: 'if total_pengeluaran > uang_awal: ... else: ...', text: 'Cetak "Pengeluaran melebihi uang awal!" atau "Pengeluaran masih sesuai."' },
];

/** Dua kasus uji tersembunyi (angka tidak ditampilkan ke siswa). */
export const HIDDEN_TESTS = [
  { label: 'Pengeluaran sesuai modal', inputs: ['50000', '12000', '8000', '15000'], total: 35000, sisa: 15000, over: false },
  { label: 'Pengeluaran melebihi modal', inputs: ['20000', '9000', '7000', '6000'], total: 22000, sisa: -2000, over: true },
];

/** Hint bertingkat Bu Ratna (Universal Hint System). */
export const HINTS = [
  {
    title: 'Hint 1: Struktur perulangan',
    text: 'Uang awal dibaca SEKALI di luar perulangan. Tiga pengeluaran dibaca di DALAM for i in range(3): dan baris di dalamnya wajib menjorok 4 spasi (tekan Tab).',
    code: 'uang_awal = int(input("Uang awal: "))\ntotal_pengeluaran = 0\nfor i in range(3):\n    nominal = int(input("Pengeluaran: "))',
  },
  {
    title: 'Hint 2: Rumus penjumlahan',
    text: 'Setiap putaran, tambahkan nominal ke total_pengeluaran. Setelah perulangan selesai (tanpa menjorok), hitung sisa uang lalu cetak keduanya.',
    code: '    total_pengeluaran = total_pengeluaran + nominal\n\nsisa_uang = uang_awal - total_pengeluaran\nprint("Total:", total_pengeluaran)\nprint("Sisa uang:", sisa_uang)',
  },
  {
    title: 'Hint 3: Blok if-else',
    text: 'Terakhir, bandingkan total pengeluaran dengan uang awal. Jangan lupa titik dua setelah if dan else, dan isi blok menjorok ke dalam.',
    code: 'if total_pengeluaran > uang_awal:\n    print("Pengeluaran melebihi uang awal!")\nelse:\n    print("Pengeluaran masih sesuai.")',
  },
];

const numbersIn = (line) => (line.match(/-?\d+/g) ?? []).map(Number);

/** Cek struktur wajib sebelum menjalankan uji tersembunyi. */
export function structureIssues(code) {
  const clean = code.split('\n').map((l) => l.replace(/#.*$/, '')).join('\n');
  const issues = [];
  if (!/\bint\s*\(\s*input\s*\(/.test(clean)) issues.push('Baca angka dengan int(input(...)).');
  if (!/^\s*for\s+\w+\s+in\s+range\s*\(\s*3\s*\)\s*:/m.test(clean)) issues.push('Gunakan perulangan for i in range(3): untuk membaca 3 pengeluaran.');
  if (!/^\s*if\b.*:/m.test(clean) || !/^\s*else\s*:/m.test(clean)) issues.push('Gunakan percabangan if-else untuk mengecek pengeluaran.');
  const noStrings = clean.replace(/"[^"\n]*"|'[^'\n]*'/g, '""');
  if (/^\s*while\b|^\s*def\b|\[|\{/m.test(noStrings)) issues.push('Bab 3 cukup memakai for, if-else, dan variabel biasa (tanpa while, def, list, atau dictionary).');
  return issues;
}

/**
 * Nilai satu hasil uji Pyodide terhadap satu kasus tersembunyi.
 * @returns {{passed: boolean, reason: string|null}}
 */
export function gradeTest(result, test) {
  if (result.error) return { passed: false, reason: null };

  const lines = result.stdout.split('\n').map((l) => l.trim().toLowerCase()).filter(Boolean);
  const totalOk = lines.some((l) => l.includes('total') && numbersIn(l).includes(test.total));
  const sisaOk = lines.some((l) => l.includes('sisa') && numbersIn(l).includes(test.sisa));
  const saysOver = lines.some((l) => l.includes('melebihi'));
  const saysOk = lines.some((l) => l.includes('masih sesuai'));

  if (result.unusedInputs > 0) {
    return { passed: false, reason: 'Program belum membaca semua input. Pastikan input() untuk pengeluaran ada di DALAM for i in range(3):.' };
  }
  if (!totalOk) {
    return { passed: false, reason: 'Baris "Total:" belum menampilkan jumlah 3 pengeluaran yang benar. Cek apakah nominal sudah ditambahkan ke total_pengeluaran di setiap putaran.' };
  }
  if (!sisaOk) {
    return { passed: false, reason: 'Baris "Sisa uang:" belum tepat. Rumusnya: sisa_uang = uang_awal - total_pengeluaran (dihitung setelah perulangan).' };
  }
  if (test.over && (!saysOver || saysOk)) {
    return { passed: false, reason: 'Saat pengeluaran lebih besar dari uang awal, program harus mencetak "Pengeluaran melebihi uang awal!" saja.' };
  }
  if (!test.over && (!saysOk || saysOver)) {
    return { passed: false, reason: 'Saat pengeluaran masih cukup, program harus mencetak "Pengeluaran masih sesuai." saja.' };
  }
  return { passed: true, reason: null };
}

/** Ubah transcript Pyodide menjadi baris Konsol Output ala online compiler. */
export function toConsole(result) {
  const lines = [{ kind: 'meta', text: '$ python money_tracker.py' }];
  for (const item of result.transcript ?? []) {
    if (item.kind === 'input') lines.push({ kind: 'in', text: `${item.prompt}${item.value ?? ''}` });
    else lines.push({ kind: item.kind === 'err' ? 'err' : 'out', text: item.text });
  }
  if (result.error && !(result.transcript ?? []).some((t) => t.kind === 'err')) {
    lines.push({ kind: 'err', text: `${result.error.type}: ${result.error.message}` });
  }
  if (!result.error && result.unusedInputs > 0) {
    lines.push({ kind: 'meta', text: `(${result.unusedInputs} masukan uji tidak dibaca oleh program)` });
  }
  lines.push({ kind: 'meta', text: result.error ? '[Program berhenti karena galat]' : '[Program selesai]' });
  return lines;
}
