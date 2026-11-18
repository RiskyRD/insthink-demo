---
name: asymmetrical-coop-architect
description: Merancang isolasi informasi asimetris antara Konsultan Bisnis Desa dan Teknisi Sistem pada API dan WebSocket.
---

# Panduan Arsitektur Asymmetrical Co-op

Terapkan aturan isolasi data berikut pada setiap endpoint API dan event WebSocket:

1. Peran pemain hanya terdiri dari `consultant` dan `technician`.
2. Endpoint API dilarang mengembalikan objek `room` secara utuh ke klien. Selalu lakukan pemetaan data berdasarkan peran pemain yang meminta.
3. Payload untuk `consultant` hanya memuat narasi misi, diagram aturan bisnis, daftar nama variabel wajib, dan status diagnostik kegagalan tanpa menyertakan kode sumber Python milik teknisi.
4. Payload untuk `technician` hanya memuat kerangka petunjuk sintaks, keluaran terminal, dan status kelulusan misi tanpa menyertakan rumus bisnis maupun nilai target rahasia.
5. Sediakan endpoint pemulihan state `GET /api/rooms/{code}/state` agar progres siswa tidak hilang jika halaman browser dimuat ulang.
