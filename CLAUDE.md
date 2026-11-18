# Aturan Utama Proyek INSTHINK

- **Stack Teknologi:** Laravel 11, Laravel Sanctum, Laravel Reverb, MySQL, React 18 dengan Vite, Tailwind CSS, dan Pyodide lokal.
- **Lingkungan Offline:** Dilarang memuat pustaka, font, ikon, atau skrip dari CDN eksternal. Semua aset dan berkas Pyodide wajib dimuat dari direktori lokal proyek.
- **Batasan Kurikulum:** Materi Chapter 1 hanya mencakup variabel, tipe data int dan str, fungsi input(), operator aritmatika dasar, percabangan if-elif-else, dan print(). Dilarang menggunakan perulangan for/while, fungsi def, list, atau dictionary.
- **Bahasa Antarmuka:** Seluruh teks layar pengguna, narasi cerita usaha desa, dan pesan galat wajib menggunakan bahasa Indonesia yang baku dan ramah bagi siswa SMA.

## Konsep Permainan: "Kedai Kopi & Camilan Desa"

Dua siswa bekerja sama menjalankan kedai desa milik Bu Ratna. Setiap ruangan berisi tepat 2 pemain dengan peran berbeda:

| Role (`room_players.role`) | Nama Tampilan | Tanggung Jawab |
| --- | --- | --- |
| `cashier` | Kasir | Melayani pesanan pelanggan. Melihat menu, harga jual, dan resep. |
| `warehouse` | Stok Gudang | Menjaga stok bahan dan kulakan ke pemasok. Melihat harga kulakan dan batas gudang. |

Isolasi informasi: Kasir **tidak** melihat harga kulakan, Stok Gudang **tidak** melihat resep dan harga jual. Keduanya melihat uang kas bersama, stok gudang, jumlah pelanggan, dan fase. Data per peran hanya keluar lewat `App\Game\RoleProjector`; harga dan resep bersumber dari `App\Game\ShopCatalog` (klien tidak pernah mengirim harga).

### Fase Permainan (`rooms.phase`)

1. **`prolog`** — Cerita pembuka. Setiap pemain menekan "Siap" (`POST /api/rooms/{code}/prolog-ready`). Jika kedua pemain siap → `chapter1`.
2. **`chapter1`** — Latihan pemrograman Python dasar dengan Pyodide (sesuai Batasan Kurikulum). Setiap pemain mengirim log kodenya (`POST /api/rooms/{code}/chapter1-complete`). Jika keduanya selesai → `chapter2`.
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

1. **Gaya Visual:** Terapkan estetika 2D Casual Cartoon Game dengan palet hangat pedesaan: krem kertas, hijau daun, kuning kunyit, dan cokelat kayu. Pertahankan `VillageBackdrop.jsx` dan `useGameAudio.js` yang sudah ada.
   - Kartu memakai border tebal `border-2 border-slate-800` dan bayangan tegas `shadow-[4px_4px_0px_#1e293b]`.
   - Tombol bersifat taktil: membal (bounce/squish) dan bayangan mengecil saat ditekan.
2. **Karakter & Ekspresi:** Setiap fase wajib menampilkan karakter kartun SVG lokal: Bu Ratna (pemilik kedai), avatar Kasir, dan avatar Stok Gudang.
   - Karakter berbicara lewat balon percakapan (speech bubble).
   - Ekspresi berubah otomatis sesuai hasil eksekusi kode atau aksi kedai: `idle`, `thinking`, `happy`, `shocked`.
3. **Interaktivitas Dua Arah:** Hindari teks statis pasif.
   - Kedua peran wajib punya elemen interaktif untuk memicu sinyal/ping visual ke layar pasangannya lewat Reverb whisper (mis. Kasir: "Stok kopi habis!", Stok Gudang: "Bahan sudah datang!").
   - Kasir menguji alur kedai lewat simulasi pesanan pelanggan desa, bukan sekadar form input mentah.
4. **Audio Offline:** Efek suara (klik, mesin kasir, berhasil, gagal) dibuat dengan Web Audio API (oscillator sintesis). Dilarang mengimpor berkas audio eksternal.
5. **Kontrak yang Tidak Boleh Diubah:** Tampilan dan interaksi baru tidak boleh mengubah kontrak API Back-End (endpoint, payload, event Reverb di atas) maupun logika eksekusi Pyodide (`usePyodideRunner`, `pyodide-worker.js`). Perubahan visual dilakukan di lapisan komponen React saja.
