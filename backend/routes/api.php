<?php

use App\Http\Controllers\Admin\AdminMonitorController;
use App\Http\Controllers\GameSessionController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Middleware\EnsureAdminPasscode;
use Illuminate\Support\Facades\Route;

// Buat ruangan baru / gabung ke ruangan (tanpa token).
Route::post('/rooms', [GameSessionController::class, 'createOrJoin'])
    ->middleware('throttle:20,1');

// Membutuhkan header: Authorization: Bearer <session_token>
Route::middleware('auth:room')->group(function () {
    Route::get('/rooms/{roomCode}/state', [GameSessionController::class, 'getState']);

    // Transisi fase.
    Route::post('/rooms/{roomCode}/prolog-ready', [GameSessionController::class, 'prologReady'])
        ->middleware('throttle:30,1');
    Route::post('/rooms/{roomCode}/chapter1-complete', [GameSessionController::class, 'chapter1Complete'])
        ->middleware('throttle:30,1');
    // Catatan uji kode yang gagal (untuk deteksi "Butuh Pendampingan" di dashboard fasilitator).
    Route::post('/rooms/{roomCode}/chapter1-attempt', [GameSessionController::class, 'chapter1Attempt'])
        ->middleware('throttle:30,1');
    Route::post('/rooms/{roomCode}/chapter3-attempt', [GameSessionController::class, 'chapter1Attempt'])
        ->middleware('throttle:30,1');

    // Papan Peringkat tim yang lulus dalam 24 jam terakhir.
    Route::get('/leaderboard', [LeaderboardController::class, 'index'])->middleware('throttle:60,1');

    // Bab Bonus selesai → Bab 3; Bab 3 selesai (kedua pemain) → finished.
    Route::post('/rooms/{roomCode}/bonus-complete', [GameSessionController::class, 'bonusComplete'])
        ->middleware('throttle:30,1');
    Route::post('/rooms/{roomCode}/chapter3-complete', [GameSessionController::class, 'chapter3Complete'])
        ->middleware('throttle:30,1');

    // Bab Bonus: operasional kedai (Simulasi Kedai Live).
    Route::post('/rooms/{roomCode}/serve-order', [GameSessionController::class, 'serveOrder'])
        ->middleware('throttle:120,1');
    Route::post('/rooms/{roomCode}/restock', [GameSessionController::class, 'restock'])
        ->middleware('throttle:120,1');
});

// Mode Fasilitator. Membutuhkan header: X-Admin-Passcode: <PIN dari ADMIN_PASSCODE>
Route::prefix('admin')->middleware([EnsureAdminPasscode::class, 'throttle:120,1'])->group(function () {
    Route::get('/rooms', [AdminMonitorController::class, 'index']);
    Route::delete('/rooms/{roomCode}', [AdminMonitorController::class, 'destroy']);
});
