<?php

namespace App\Models;

use App\Game\ShopCatalog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    public const STATUS_WAITING = 'waiting';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_COMPLETED = 'completed';

    public const PHASE_PROLOG = 'prolog';
    public const PHASE_CHAPTER1 = 'chapter1';
    public const PHASE_CHAPTER2 = 'chapter2';
    public const PHASE_FINISHED = 'finished';

    protected $fillable = [
        'room_code', 'current_mission', 'status', 'started_at', 'completed_at',
        'phase', 'phase_started_at', 'shared_money', 'target_money', 'inventory', 'customers_served',
    ];

    /** Nilai awal di sisi aplikasi (kolom JSON tidak bisa diberi default di MySQL). */
    protected $attributes = [
        'phase' => self::PHASE_PROLOG,
        'shared_money' => ShopCatalog::STARTING_MONEY,
        'target_money' => ShopCatalog::TARGET_MONEY,
        'customers_served' => 0,
        'inventory' => '{"kopi":3,"susu":3,"gula_aren":2,"pisang":3,"cokelat":2,"kemasan":3}',
    ];

    protected function casts(): array
    {
        return [
            'current_mission' => 'integer',
            'shared_money' => 'integer',
            'target_money' => 'integer',
            'customers_served' => 'integer',
            'inventory' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'phase_started_at' => 'datetime',
        ];
    }

    public function players(): HasMany
    {
        return $this->hasMany(RoomPlayer::class);
    }

    public function missionLogs(): HasMany
    {
        return $this->hasMany(MissionLog::class);
    }

    /**
     * Kode 6 karakter tanpa huruf/angka yang mudah tertukar (0/O, 1/I/L).
     */
    public static function generateUniqueCode(): string
    {
        $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

        do {
            $code = '';
            for ($i = 0; $i < 6; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
        } while (static::where('room_code', $code)->exists());

        return $code;
    }

    public function playerWithRole(string $role): ?RoomPlayer
    {
        return $this->players->firstWhere('role', $role);
    }

    public function isFull(): bool
    {
        return $this->players->count() === count(RoomPlayer::ROLES);
    }

    /** Pindah fase sekaligus mencatat waktu mulainya (untuk log durasi). */
    public function moveToPhase(string $phase): void
    {
        $attributes = ['phase' => $phase, 'phase_started_at' => now()];

        if ($phase === self::PHASE_FINISHED) {
            $attributes['status'] = self::STATUS_COMPLETED;
            $attributes['completed_at'] = now();
        }

        $this->update($attributes);
    }

    /** Stok lengkap untuk semua bahan, termasuk yang belum pernah tercatat. */
    public function normalizedInventory(): array
    {
        $inventory = $this->inventory ?? [];

        return collect(ShopCatalog::supplyKeys())
            ->mapWithKeys(fn (string $key) => [$key => (int) ($inventory[$key] ?? 0)])
            ->all();
    }

    /** State kedai bersama; aman dikirim ke kedua peran. */
    public function shopState(): array
    {
        return [
            'shared_money' => $this->shared_money,
            'target_money' => $this->target_money,
            'customers_served' => $this->customers_served,
            'inventory' => $this->normalizedInventory(),
            'max_stock' => ShopCatalog::MAX_STOCK,
        ];
    }

    /**
     * Ringkasan netral yang aman dikirim ke kedua peran.
     */
    public function publicSummary(): array
    {
        return [
            'room_code' => $this->room_code,
            'status' => $this->status,
            'phase' => $this->phase,
            'phase_started_at' => $this->phase_started_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'players' => $this->players->map(fn (RoomPlayer $p) => [
                'name' => $p->player_name,
                'role' => $p->role,
                'is_prolog_ready' => $p->is_prolog_ready,
                'is_chapter1_done' => $p->is_chapter1_done,
            ])->values()->all(),
        ];
    }
}
