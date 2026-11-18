<?php

namespace App\Models;

use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Pemain anonim (tanpa akun). Diautentikasi lewat guard "room"
 * menggunakan token sesi di header Authorization: Bearer <token>.
 */
class RoomPlayer extends Model implements AuthenticatableContract
{
    use Authenticatable;

    public const ROLE_CASHIER = 'cashier';
    public const ROLE_WAREHOUSE = 'warehouse';
    public const ROLES = [self::ROLE_CASHIER, self::ROLE_WAREHOUSE];

    public const ROLE_LABELS = [
        self::ROLE_CASHIER => 'Kasir',
        self::ROLE_WAREHOUSE => 'Stok Gudang',
    ];

    protected $fillable = [
        'room_id', 'player_name', 'role', 'session_token', 'is_prolog_ready', 'is_chapter1_done',
    ];

    protected $hidden = ['session_token'];

    protected $attributes = [
        'is_prolog_ready' => false,
        'is_chapter1_done' => false,
    ];

    protected function casts(): array
    {
        return [
            'is_prolog_ready' => 'boolean',
            'is_chapter1_done' => 'boolean',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function isCashier(): bool
    {
        return $this->role === self::ROLE_CASHIER;
    }

    public function isWarehouse(): bool
    {
        return $this->role === self::ROLE_WAREHOUSE;
    }

    public static function roleLabel(string $role): string
    {
        return self::ROLE_LABELS[$role] ?? $role;
    }

    /**
     * Membuat token acak baru; hanya hash-nya yang disimpan.
     *
     * @return array{0: string, 1: string} [token asli untuk klien (sekali saja), hash untuk disimpan]
     */
    public static function issueToken(): array
    {
        $plain = Str::random(60);

        return [$plain, hash('sha256', $plain)];
    }

    public static function findByToken(?string $plain): ?self
    {
        if (! $plain) {
            return null;
        }

        return static::with('room')->where('session_token', hash('sha256', $plain))->first();
    }
}
