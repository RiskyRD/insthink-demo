<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Dashboard Mode Fasilitator (SPA React). Build frontend disalin ke public/,
// jadi rute ini cukup mengembalikan index.html agar React yang menangani /admin.
Route::get('/admin', function () {
    $index = public_path('index.html');

    return is_file($index) ? response()->file($index) : abort(404);
});
