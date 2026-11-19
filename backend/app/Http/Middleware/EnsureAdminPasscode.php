<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

/**
 * Melindungi endpoint fasilitator dengan PIN di header X-Admin-Passcode.
 * Tebakan PIN yang salah dibatasi 10 kali per menit per alamat IP.
 */
class EnsureAdminPasscode
{
    private const MAX_FAILURES = 10;

    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('insthink.admin_passcode');
        if ($expected === '') {
            return response()->json(['message' => 'Mode Fasilitator belum diaktifkan. Isi ADMIN_PASSCODE di berkas .env server.'], 503);
        }

        $key = 'admin-passcode:'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, self::MAX_FAILURES)) {
            $wait = RateLimiter::availableIn($key);

            return response()->json(['message' => "Terlalu banyak percobaan PIN. Coba lagi dalam {$wait} detik."], 429);
        }

        $given = (string) $request->header('X-Admin-Passcode', '');
        if (! hash_equals($expected, $given)) {
            RateLimiter::hit($key, 60);

            return response()->json(['message' => 'PIN Fasilitator salah.'], 401);
        }

        return $next($request);
    }
}
