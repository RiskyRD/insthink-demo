<?php

return [
    /*
    | PIN Mode Fasilitator. Dikirim dashboard lewat header X-Admin-Passcode.
    | Jika kosong, semua endpoint /api/admin/* ditolak (503).
    */
    'admin_passcode' => env('ADMIN_PASSCODE'),

    // Ambang deteksi "Butuh Pendampingan" di dashboard fasilitator.
    'help_failed_attempts' => (int) env('ADMIN_HELP_FAILED_ATTEMPTS', 4),
    'help_idle_seconds' => (int) env('ADMIN_HELP_IDLE_SECONDS', 240),
];
