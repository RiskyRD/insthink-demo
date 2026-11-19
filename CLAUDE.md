# Aturan Utama Proyek INSTHINK

- **Stack Teknologi:** Laravel 11, Laravel Sanctum, Laravel Reverb, MySQL, React 18 dengan Vite, Tailwind CSS, dan Pyodide lokal.
- **Lingkungan Offline:** Dilarang memuat pustaka, font, ikon, atau skrip dari CDN eksternal. Semua aset dan berkas Pyodide wajib dimuat dari direktori lokal proyek.
- **Batasan Kurikulum (sesuai materi presentasi Baksos TI):** Materi Python di seluruh tahap (Materi, Icebreaking, Chapter 1) hanya mencakup:
  - variabel (tipe data `int` dan `str`), `input()`, `int()`, `print()`;
  - operator matematika `+`, `-`, `*`, `/`, `%`;
  - percabangan `if`-`else` (boleh `elif`);
  - perulangan `for i in range(...)`.

  Dilarang menggunakan `while`, fungsi `def`, list, dictionary, atau materi di luar daftar di atas.
- **Bahasa Antarmuka:** Seluruh teks layar pengguna, narasi cerita usaha desa, dan pesan galat wajib menggunakan bahasa Indonesia yang baku dan ramah bagi siswa SMA.

## Alur Navigasi Aplikasi

Aplikasi terdiri dari empat tahap berurutan. Tahap `menu`, `materi`, dan `icebreaking` murni dikelola di sisi klien (state/route React), sehingga tidak menambah endpoint, kolom database, atau event Reverb. Hanya tahap `game` yang memakai ruangan co-op dan backend.

| Tahap | Isi | Backend |
| --- | --- | --- |
| `menu` | Main Menu dengan tiga pilihan: 1. Belajar Blok Python, 2. Icebreaking Cepat, 3. Mulai Misi Kedai Co-op. | Tidak ada |
| `materi` | Modul pendahuluan interaktif yang mengilustrasikan blok dasar Python sesuai Batasan Kurikulum. Contoh kode boleh dijalankan dengan `usePyodideRunner`. | Tidak ada |
| `icebreaking` | Mini-game pemanasan: tebak blok dan logika cepat sebelum permainan utama. | Tidak ada |
| `game` | Sesi co-op dua pemain: buat/gabung ruangan → Prolog → Chapter 1 (Block Coding) → Chapter 2 (Live Shop). | API + Reverb (lihat di bawah) |

- **Navigasi cepat di header:** Header menyediakan tombol untuk berpindah tahap (Menu, Materi, Icebreaking, Game), agar fasilitator atau siswa bisa melompat jika diperlukan.
- **Fase ruangan tidak berubah:** Navigasi cepat ke luar tahap `game` tidak boleh mengubah `rooms.phase` atau memanggil endpoint ruangan. Saat kembali ke `game`, klien memuat ulang state ruangan dari server.
- **Tetap terhubung:** Keluar dari ruangan tetap hanya lewat tombol "Keluar" yang sudah ada.

## Mode Fasilitator (`/admin`)

Dashboard panitia (`AdminMonitorDashboard.jsx`) untuk memantau semua tim. Dibuka lewat rute `/admin` atau tombol kecil "Mode Fasilitator" di Main Menu.

- **PIN:** endpoint `/api/admin/*` wajib header `X-Admin-Passcode` yang cocok dengan `ADMIN_PASSCODE` di `.env` (kosong → 503). Tebakan salah dibatasi 10×/menit per IP. PIN valid disimpan di `sessionStorage`.
- **Endpoint:** `GET /api/admin/rooms` (ringkasan semua ruangan, `failed_attempts`, `last_activity_at`, `server_time`), `DELETE /api/admin/rooms/{code}` (hapus ruangan beserta pemain & log).
- **Log uji gagal:** `POST /api/rooms/{code}/chapter1-attempt` (field `code`, `output`) mencatat `mission_logs.is_passed = false`. Hanya untuk dashboard; tidak mengubah fase atau state kedai.
- **Realtime:** channel publik `admin.monitor`, event `admin.room_changed`. Payload sengaja tanpa data siswa; dashboard mengambil data lengkap lewat API ber-PIN. Polling cadangan 5 detik saat Reverb putus.
- **Butuh Pendampingan:** gagal uji kode ≥ 4 kali atau tidak ada aktivitas > 4 menit pada fase selain `finished` (ambang di `config/insthink.php`).

## Universal Hint System

Setiap tahap (Materi, Icebreaking, Chapter 1, Chapter 2) wajib menyediakan tombol **"Butuh Bantuan?"** dengan hint bertingkat, agar siswa tidak buntu terlalu lama:

1. **Hint 1 — Arah:** petunjuk konsep umum (mis. "Ingat, `input()` selalu menghasilkan teks").
2. **Hint 2 — Langkah:** langkah konkret atau blok yang perlu dipakai.
3. **Hint 3 — Contoh:** contoh potongan kode atau jawaban yang hampir lengkap.

Ketentuan:
- Hint dibuka satu per satu secara berurutan.
- Hint disampaikan lewat balon percakapan karakter.
- Hint hanya berupa konten di sisi klien: tidak dikirim ke server dan tidak mengubah payload `chapter1-complete`.
- Di Chapter 2, hint mengikuti isolasi informasi. Hint Kasir tidak boleh membocorkan harga kulakan, dan hint Stok Gudang tidak boleh membocorkan resep atau harga jual.

## Konsep Permainan: "Kedai Kopi & Camilan Desa"

Dua siswa bekerja sama menjalankan kedai desa milik Bu Ratna. Setiap ruangan berisi tepat 2 pemain dengan peran berbeda:

| Role (`room_players.role`) | Nama Tampilan | Tanggung Jawab |
| --- | --- | --- |
| `cashier` | Kasir | Melayani pesanan pelanggan. Melihat menu, harga jual, dan resep. |
| `warehouse` | Stok Gudang | Menjaga stok bahan dan kulakan ke pemasok. Melihat harga kulakan dan batas gudang. |

Isolasi informasi: Kasir **tidak** melihat harga kulakan, Stok Gudang **tidak** melihat resep dan harga jual. Keduanya melihat uang kas bersama, stok gudang, jumlah pelanggan, dan fase. Data per peran hanya keluar lewat `App\Game\RoleProjector`; harga dan resep bersumber dari `App\Game\ShopCatalog` (klien tidak pernah mengirim harga).

### Fase Permainan (`rooms.phase`)

1. **`prolog`** — Cerita pembuka. Setiap pemain menekan "Siap" (`POST /api/rooms/{code}/prolog-ready`). Jika kedua pemain siap → `chapter1`.
2. **`chapter1`** — Latihan pemrograman Python dasar dengan Block Coding dan Pyodide (sesuai Batasan Kurikulum). Setiap pemain mengirim log kodenya (`POST /api/rooms/{code}/chapter1-complete`). Jika keduanya selesai → `chapter2`.
3. **`chapter2`** — Simulasi kedai. Kasir melayani pesanan (`POST /api/rooms/{code}/serve-order`, field `menu_key`); Stok Gudang kulakan bahan (`POST /api/rooms/{code}/restock`, field `item_key` dan `qty` kelipatan 3 unit, maks 8 unit per bahan). Jika `shared_money >= target_money` → `finished`.
4. **`finished`** — Target pendapatan tercapai; `status` ruangan menjadi `completed`.

State awal kedai: kas Rp50.000, target Rp120.000, stok `{ kopi: 3, susu: 3, gula_aren: 2, pisang: 3, cokelat: 2, kemasan: 3 }`.

### Event Reverb

- Channel privat: `room.{code}.cashier` dan `room.{code}.warehouse`; channel presence `room.{code}.presence` untuk whisper (ping antarpemain).
- `room.updated` — pemain bergabung / menandai siap / selesai Chapter 1.
- `game.phase_changed` — fase berganti (`previous_phase`, `phase`, `room`, `shop`).
- `shop.updated` — kas/stok berubah (`shop`, `room`, `last_action`).

Semua endpoint yang mengubah state memakai `Cache::lock("room:{id}:state")` ditambah `lockForUpdate()`, dan broadcast dikirim setelah transaksi tersimpan.

## Standar Visual & Interaktivitas Game (2D Cartoon Style)

1. **Gaya Visual:** Terapkan estetika 2D Casual Cartoon Game dengan palet hangat Bali: emas kunyit, merah terakota, hijau daun, dan krem kertas (cokelat kayu sebagai aksen). Pertahankan `VillageBackdrop.jsx` dan `useGameAudio.js` yang sudah ada.
   - Kartu memakai border tebal `border-2 border-slate-800` dan bayangan tegas `shadow-[4px_4px_0px_#1e293b]`.
   - Tombol bersifat taktil: membal (bounce/squish) dan bayangan mengecil saat ditekan.
2. **Karakter & Ekspresi:** Setiap tahap wajib menampilkan karakter kartun SVG lokal: Bu Ratna (pemilik kedai), avatar Kasir, dan avatar Stok Gudang.
   - **Identitas visual Bali:** Semua karakter wajib memakai busana dan elemen khas Bali, misalnya:
     - kebaya dengan selendang/senteng dan kamen untuk perempuan;
     - udeng, baju safari/kemeja adat, kamen, dan saput untuk laki-laki;
     - aksesori seperti bunga kamboja atau canang sari.
   - Karakter digambar dengan garis `border-2 border-slate-800` (stroke tebal `#1e293b` pada SVG) dan palet di atas.
   - Ornamen pendukung (motif patra, gapura candi bentar, penjor) boleh dipakai sebagai dekorasi SVG lokal.
   - Karakter berbicara lewat balon percakapan (speech bubble).
   - Ekspresi berubah otomatis sesuai hasil eksekusi kode atau aksi kedai: `idle`, `thinking`, `happy`, `shocked`.
3. **Interaktivitas Dua Arah:** Hindari teks statis pasif.
   - Kedua peran wajib punya elemen interaktif untuk memicu sinyal/ping visual ke layar pasangannya lewat Reverb whisper (mis. Kasir: "Stok kopi habis!", Stok Gudang: "Bahan sudah datang!").
   - Kasir menguji alur kedai lewat simulasi pesanan pelanggan desa, bukan sekadar form input mentah.
4. **Audio Offline:** Efek suara (klik, mesin kasir, berhasil, gagal) dibuat dengan Web Audio API (oscillator sintesis). Dilarang mengimpor berkas audio eksternal.
5. **Kontrak yang Tidak Boleh Diubah:** Tahap baru (Menu, Materi, Icebreaking), hint, dan tampilan baru tidak boleh mengubah:
   - kontrak API Back-End (endpoint, payload, event Reverb di atas);
   - logika eksekusi Pyodide (`usePyodideRunner`, `pyodide-worker.js`, termasuk shim pemuatan WASM dan query versi `?v=N` pada URL worker).

   Semua perubahan dilakukan di lapisan komponen React saja. Jika `pyodide-worker.js` terpaksa diubah, naikkan angka `?v=N` di `usePyodideRunner.js`. Cloudflare menyimpan cache worker dalam waktu sangat lama.
