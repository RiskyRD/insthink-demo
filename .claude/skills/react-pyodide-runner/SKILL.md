---
name: react-pyodide-runner
description: Membangun antarmuka React dan menjalankan kode Python di browser menggunakan Pyodide lokal.
---

# Panduan Frontend React dan Eksekusi Pyodide

1. Muat runtime Python secara lokal dari `/pyodide/pyodide.js` dan jalankan di dalam Web Worker agar antarmuka pengguna tidak membeku saat kode dieksekusi.
2. Sediakan mekanisme penyuntikan nilai masukan otomatis untuk menggantikan fungsi `input()` Python berdasarkan daftar kasus uji dari server.
3. Tangkap seluruh keluaran `stdout` dan pesan kesalahan `stderr`, lalu kunci tombol jalankan kode selama proses eksekusi dan pengiriman ke API Laravel berlangsung.
4. Render tampilan layar secara dinamis sesuai peran pemain (`ConsultantDashboard` atau `TechnicianWorkspace`) dan tampilkan animasi penyelesaian misi secara serentak saat misi terakhir lulus.
