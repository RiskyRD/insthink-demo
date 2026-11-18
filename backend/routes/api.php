<?php

use App\Http\Controllers\GameSessionController;
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

    // Chapter 2: operasional kedai.
    Route::post('/rooms/{roomCode}/serve-order', [GameSessionController::class, 'serveOrder'])
        ->middleware('throttle:120,1');
    Route::post('/rooms/{roomCode}/restock', [GameSessionController::class, 'restock'])
        ->middleware('throttle:120,1');
});
