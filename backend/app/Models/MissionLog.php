<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'room_id', 'room_player_id', 'mission_number', 'submitted_code', 'terminal_output',
        'is_passed', 'error_category', 'attempt_count', 'duration_seconds',
    ];

    protected function casts(): array
    {
        return [
            'mission_number' => 'integer',
            'is_passed' => 'boolean',
            'attempt_count' => 'integer',
            'duration_seconds' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(RoomPlayer::class, 'room_player_id');
    }
}
