<?php

namespace App\Providers;

use App\Models\RoomPlayer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Guard "room": cocokkan hash SHA-256 dari Bearer token dengan room_players.session_token.
        Auth::viaRequest('room-token', fn (Request $request) => RoomPlayer::findByToken($request->bearerToken()));
    }
}
