/**
 * Model data penyusun blok Chapter 1: definisi misi per peran, pembuat blok,
 * penerjemah blok → Python, pemeriksa susunan, dan penilai hasil Pyodide.
 *
 * Sesuai Batasan Kurikulum: hanya variabel, int/str, input(), + - *,
 * if-else, dan print(). Tidak ada blok perulangan, def, list, atau dictionary.
 */

export const BLOCK_TYPES = ['input', 'const', 'calc', 'if', 'else', 'print'];

/** Warna kartun tiap jenis blok (biru variabel, kuning operator, ungu keputusan, hijau cetak). */
export const BLOCK_STYLE = {
  input: { bg: 'bg-sky-500', text: 'text-white', bump: 'bg-sky-500', label: 'Variabel input' },
  const: { bg: 'bg-sky-400', text: 'text-white', bump: 'bg-sky-400', label: 'Variabel angka' },
  calc: { bg: 'bg-[#f4b942]', text: 'text-slate-900', bump: 'bg-[#f4b942]', label: 'Operator hitung' },
  if: { bg: 'bg-violet-500', text: 'text-white', bump: 'bg-violet-500', label: 'Keputusan if' },
  else: { bg: 'bg-violet-400', text: 'text-white', bump: 'bg-violet-400', label: 'Keputusan else' },
  print: { bg: 'bg-emerald-500', text: 'text-white', bump: 'bg-emerald-500', label: 'Cetak' },
};

export const ARITH_OPS = ['+', '-', '*'];
export const COMPARE_OPS = ['>=', '<=', '>', '<', '=='];
export const NUMBER_OPTION = '#';

// ----------------------------------------------------------------------
// Misi per peran
// ----------------------------------------------------------------------
export const MISSIONS = {
  cashier: {
    title: 'Sistem Kasir Kedai',
    goal: 'Hitung total belanja 2 menu, lalu kembalian pelanggan.',
    inputs: [
      { name: 'jumlah_kopi', prompt: 'Jumlah kopi tubruk: ' },
      { name: 'jumlah_pisang', prompt: 'Jumlah pisang goreng: ' },
      { name: 'uang_bayar', prompt: 'Uang bayar: ' },
    ],
    constants: ['harga_kopi', 'harga_pisang'],
    computed: ['subtotal_kopi', 'subtotal_pisang', 'total_harga', 'kembalian'],
    texts: ['UANG KURANG'],
    bank: BLOCK_TYPES,
    brief: [
      'Baca 3 data pesanan berurutan dengan blok biru input(): jumlah_kopi, jumlah_pisang, lalu uang_bayar.',
      'Simpan harga satuan di harga_kopi dan harga_pisang. Angkanya ada di Papan Harga Menu milik Penjaga Gudang. Tanyakan kepadanya!',
      'Hitung subtotal_kopi, subtotal_pisang, lalu total_harga dengan blok kuning.',
      'if uang_bayar >= total_harga: hitung kembalian = uang_bayar - total_harga, lalu cetak kembalian.',
      'else: cetak "UANG KURANG".',
    ],
    tests: [
      { order: '1 kopi tubruk + 1 pisang goreng', pay: 'Rp20.000', inputs: ['1', '1', '20000'], expected: ['4000'] },
      { order: '2 kopi tubruk + 1 pisang goreng', pay: 'Rp30.000', inputs: ['2', '1', '30000'], expected: ['5000'] },
      { order: '2 pisang goreng saja', pay: 'Rp14.000 (uang pas)', inputs: ['0', '2', '14000'], expected: ['0'] },
      { order: '2 kopi tubruk + 2 pisang goreng', pay: 'Rp20.000', inputs: ['2', '2', '20000'], expected: ['UANG KURANG'] },
    ],
  },
  warehouse: {
    title: 'Sistem Stok Gudang',
    goal: 'Hitung sisa stok pisang dan beri peringatan RESTOCK.',
    inputs: [
      { name: 'stok_awal', prompt: 'Stok awal pisang: ' },
      { name: 'terpakai', prompt: 'Pisang terpakai: ' },
    ],
    constants: ['batas_aman', 'harga_kulakan'],
    computed: ['sisa_stok'],
    texts: ['RESTOCK', 'AMAN'],
    bank: BLOCK_TYPES,
    brief: [
      'Baca 2 data berurutan dengan blok biru input(): stok_awal, lalu terpakai.',
      'Simpan batas_aman dan harga_kulakan (harga 1 paket pisang). Angkanya ada di Buku Catatan milik Kasir. Tanyakan kepadanya!',
      'Hitung sisa_stok = stok_awal - terpakai, lalu cetak sisa_stok.',
      'if sisa_stok <= batas_aman: cetak "RESTOCK", lalu cetak harga_kulakan.',
      'else: cetak "AMAN".',
    ],
    tests: [
      { order: 'memborong 3 pisang goreng', pay: 'stok pisang tadinya 8', inputs: ['8', '3'], expected: ['5', 'AMAN'] },
      { order: 'memesan 3 pisang goreng', pay: 'stok pisang tadinya 5', inputs: ['5', '3'], expected: ['2', 'RESTOCK', '4500'] },
      { order: 'memesan 3 pisang cokelat', pay: 'stok pisang tadinya 3', inputs: ['3', '3'], expected: ['0', 'RESTOCK', '4500'] },
      { order: 'memesan 3 pisang goreng', pay: 'stok pisang tadinya 6', inputs: ['6', '3'], expected: ['3', 'AMAN'] },
    ],
  },
};

/**
 * Informasi yang DIPEGANG suatu peran untuk partnernya (isolasi informasi).
 * cashier memegang catatan gudang; warehouse memegang harga menu.
 */
export const PARTNER_BOARDS = {
  cashier: {
    title: 'Buku Catatan Kasir',
    subtitle: 'Data ini dibutuhkan Penjaga Gudang. Kirimkan yang penting saja!',
    items: [
      { label: 'Batas aman stok', value: '2 unit', detail: 'Restock jika sisa stok kurang dari atau sama dengan angka ini. Tulis sebagai angka: 2' },
      { label: 'Harga kulakan 1 paket pisang', value: 'Rp4.500', detail: 'Tulis sebagai angka tanpa titik: 4500' },
      { label: 'Harga kulakan 1 paket kopi', value: 'Rp9.000', detail: 'Tulis sebagai angka tanpa titik: 9000' },
      { label: 'Kapasitas gudang', value: '8 unit per bahan', detail: 'Jangan kulakan melebihi kapasitas ini.' },
    ],
  },
  warehouse: {
    title: 'Papan Harga Menu',
    subtitle: 'Data ini dibutuhkan Kasir. Kirimkan yang penting saja!',
    items: [
      { label: 'Kopi Tubruk Gula Aren', value: 'Rp9.000', detail: 'Harga satuan. Tulis sebagai angka tanpa titik: 9000' },
      { label: 'Pisang Goreng', value: 'Rp7.000', detail: 'Harga satuan. Tulis sebagai angka tanpa titik: 7000' },
      { label: 'Es Kopi Gula Aren', value: 'Rp18.000', detail: 'Harga satuan. Tulis sebagai angka tanpa titik: 18000' },
      { label: 'Kopi Susu Spesial', value: 'Rp16.000', detail: 'Harga satuan. Tulis sebagai angka tanpa titik: 16000' },
    ],
  },
};

/** Misi mini untuk tutorial wajib (Step 1.0): total harga 1 item. */
export const TUTORIAL_MISSION = {
  title: 'Latihan: Total Harga 1 Menu',
  inputs: [{ name: 'jumlah', prompt: 'Jumlah pesanan: ' }],
  constants: ['harga'],
  computed: ['total'],
  texts: [],
  bank: ['input', 'calc', 'print'],
  sampleInput: ['2'],
  expected: ['18000'],
};

export const TUTORIAL_START = [
  { id: 'tut-harga', type: 'const', nested: false, locked: true, fields: { var: 'harga', value: '9000' } },
];

export const TUTORIAL_STEPS = [
  {
    title: 'Pasang blok biru',
    text: 'Klik blok biru "int(input())" di Bank Blok Kode. Blok itu akan menempel di bawah blok harga.',
    target: () => 'bank:input',
    done: (program) => program.some((b) => b.type === 'input'),
  },
  {
    title: 'Pilih operator kali',
    text: 'Klik blok kuning, lalu ubah dropdown operatornya dari + menjadi * agar total = harga dikali jumlah.',
    target: (program) => (program.some((b) => b.type === 'calc') ? 'field:calc:op' : 'bank:calc'),
    done: (program) => program.some((b) => {
      if (b.type !== 'calc') return false;
      const { target, left, op, right } = b.fields;
      return target === 'total' && op === '*' && [left, right].sort().join() === 'harga,jumlah';
    }),
  },
  {
    title: 'Cetak & jalankan',
    text: 'Klik blok hijau print() supaya total tampil di layar, lalu tekan tombol "Coba Jalankan".',
    target: (program) => (program.some((b) => b.type === 'print') ? 'run' : 'bank:print'),
    done: (_program, ran) => ran,
  },
];

// ----------------------------------------------------------------------
// Pembuat & pengubah blok
// ----------------------------------------------------------------------
let seq = 0;
export const newBlockId = () => `b${Date.now().toString(36)}${(seq++).toString(36)}`;

export const allVariables = (mission) => [...mission.inputs.map((i) => i.name), ...mission.constants, ...mission.computed];

const firstUnused = (names, used) => names.find((n) => !used.includes(n)) ?? names[0];

/** Blok baru dengan isian awal yang masuk akal; `after` = blok tepat di atasnya (untuk indentasi). */
export function createBlock(type, mission, program, after = null) {
  const vars = allVariables(mission);
  const used = (t, key) => program.filter((b) => b.type === t).map((b) => b.fields[key]);
  const nested = Boolean(after) && type !== 'if' && type !== 'else' && (after.type === 'if' || after.type === 'else' || after.nested);

  const fields = {
    input: () => ({ var: firstUnused(mission.inputs.map((i) => i.name), used('input', 'var')) }),
    const: () => ({ var: firstUnused(mission.constants, used('const', 'var')), value: '' }),
    calc: () => ({ target: firstUnused(mission.computed, used('calc', 'target')), left: vars[0], op: '+', right: vars[1] ?? vars[0], leftNum: '', rightNum: '' }),
    if: () => ({ left: vars[0], cmp: '>=', right: vars[1] ?? vars[0], leftNum: '', rightNum: '' }),
    else: () => ({}),
    print: () => ({ value: mission.computed.at(-1) ?? vars[0] }),
  }[type]();

  return { id: newBlockId(), type, nested, fields };
}

const digits = (value) => String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');

function operand(fields, key) {
  return fields[key] === NUMBER_OPTION ? digits(fields[`${key}Num`]) || '0' : fields[key];
}

/** Nilai `print` disimpan sebagai nama variabel atau "t:TEKS". */
export const textValue = (text) => `t:${text}`;

/** Satu blok → satu baris Python (tanpa indentasi). */
export function blockToPython(block, mission) {
  const f = block.fields;
  switch (block.type) {
    case 'input': {
      const prompt = mission.inputs.find((i) => i.name === f.var)?.prompt ?? `${f.var}: `;
      return `${f.var} = int(input("${prompt}"))`;
    }
    case 'const':
      return `${f.var} = ${digits(f.value) || '0'}`;
    case 'calc':
      return `${f.target} = ${operand(f, 'left')} ${f.op} ${operand(f, 'right')}`;
    case 'if':
      return `if ${operand(f, 'left')} ${f.cmp} ${operand(f, 'right')}:`;
    case 'else':
      return 'else:';
    case 'print':
      return String(f.value).startsWith('t:') ? `print("${f.value.slice(2)}")` : `print(${f.value})`;
    default:
      return '';
  }
}

/** @returns {{ code: string, lines: Array<{ text: string, blockId: string }> }} */
export function generateCode(program, mission) {
  const lines = program.map((b) => ({ text: `${b.nested ? '    ' : ''}${blockToPython(b, mission)}`, blockId: b.id }));
  return { code: lines.map((l) => l.text).join('\n'), lines };
}

/** Pemeriksaan susunan sebelum dijalankan, dengan pesan ramah per blok. */
export function findIssues(program) {
  const issues = [];
  if (program.length === 0) return [{ blockId: null, message: 'Area Susun Program masih kosong. Klik blok di Bank Blok Kode untuk memulai.' }];

  program.forEach((b, i) => {
    const prev = program[i - 1];
    const next = program[i + 1];

    if (b.nested && !(prev && (prev.type === 'if' || prev.type === 'else' || prev.nested))) {
      issues.push({ blockId: b.id, message: 'Blok ini menjorok ke dalam, tetapi tidak ada blok ungu if/else tepat di atasnya.' });
    }
    if ((b.type === 'if' || b.type === 'else') && !next?.nested) {
      issues.push({ blockId: b.id, message: `Blok ungu ${b.type} harus berisi minimal satu blok. Pilih blok di bawahnya, lalu tekan tombol masuk (⇥).` });
    }
    if (b.type === 'else') {
      let j = i - 1;
      while (j >= 0 && program[j].nested) j -= 1;
      if (j < 0 || program[j].type !== 'if' || j === i - 1) {
        issues.push({ blockId: b.id, message: 'Blok else harus berada tepat setelah isi blok if.' });
      }
    }
    if (b.type === 'const' && !digits(b.fields.value)) {
      issues.push({ blockId: b.id, message: `Isi angka untuk ${b.fields.var}. Tanyakan nilainya kepada partnermu!` });
    }
    ['left', 'right'].forEach((key) => {
      if ((b.type === 'calc' || b.type === 'if') && b.fields[key] === NUMBER_OPTION && !digits(b.fields[`${key}Num`])) {
        issues.push({ blockId: b.id, message: 'Ada kotak angka yang masih kosong di blok ini.' });
      }
    });
  });

  return issues;
}

// ----------------------------------------------------------------------
// Penilaian hasil Pyodide
// ----------------------------------------------------------------------
export const outputLines = (stdout) => String(stdout ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

/** Pesan galat Python yang dikaitkan dengan susunan blok. */
export function blockErrorHint(error) {
  if (!error) return null;
  const msg = error.message ?? '';
  switch (error.type) {
    case 'NameError': {
      const name = msg.match(/name '(.+?)' is not defined/)?.[1];
      return name
        ? `Variabel ${name} dipakai sebelum diberi nilai. Pastikan blok yang mengisi ${name} berada di atas blok ini.`
        : 'Ada variabel yang dipakai sebelum diberi nilai.';
    }
    case 'EOFError':
      return 'Program meminta data input lebih banyak daripada data pesanan. Periksa jumlah blok biru input().';
    case 'ValueError':
      return 'Data input tidak bisa diubah menjadi angka bulat dengan int().';
    case 'TypeError':
      return 'Ada perhitungan yang mencampur angka dan teks.';
    case 'IndentationError':
    case 'SyntaxError':
      return 'Susunan blok if/else belum tepat. Pastikan setiap if/else punya isi yang menjorok ke dalam.';
    case 'TimeoutError':
      return 'Program berjalan terlalu lama dan dihentikan.';
    default:
      return `Program berhenti karena galat ${error.type}.`;
  }
}

/** Gabungkan kasus uji dengan hasil Pyodide. */
export function gradeResults(tests, results) {
  return tests.map((test, i) => {
    const result = results[i];
    const actual = outputLines(result?.stdout);
    const error = result ? result.error : { type: 'TimeoutError', message: '' };
    const passed = !error && actual.length === test.expected.length && actual.every((line, k) => line === test.expected[k]);

    let reason = null;
    if (!passed) {
      if (error) reason = blockErrorHint(error);
      else if (actual.length === 0) reason = 'Program tidak mencetak apa pun. Sudahkah kamu memasang blok hijau print()?';
      else if (result?.unusedInputs > 0) reason = 'Ada data pesanan yang tidak dibaca. Mungkin blok input() kurang.';
      else reason = `Layar menampilkan "${actual.join(' / ')}", seharusnya "${test.expected.join(' / ')}".`;
    }

    return { ...test, actual, error, errorLine: error?.line ?? null, passed, reason };
  });
}
