---
name: laravel-reverb-sync
description: Membangun backend Laravel 11, skema database sesi permainan, pencatatan log waktu, dan channel Laravel Reverb.
---

# Panduan Backend Laravel 11 dan Reverb

1. Gunakan tabel `rooms`, `room_players`, dan `mission_logs` untuk mencatat kode ruangan, peran pemain, kode yang dikirim, keluaran terminal, kategori galat, serta durasi pengerjaan dalam detik.
2. Pisahkan saluran penyiaran privat menjadi `private-room.{roomCode}.consultant` dan `private-room.{roomCode}.technician` pada `routes/channels.php`.
3. Terapkan mekanisme penguncian atomik menggunakan `Cache::lock` pada proses pengiriman hasil misi untuk mencegah duplikasi log akibat klik ganda.
4. Gunakan event ringan berjenis client whisper untuk indikator status seperti saat teknisi sedang mengetik kode tanpa menulis ke basis data.
