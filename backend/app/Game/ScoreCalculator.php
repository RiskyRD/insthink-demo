<?php

namespace App\Game;

use App\Models\MissionLog;
use App\Models\Room;

/**
 * Skor akhir tim (maksimal 2000), dihitung ulang dari data tersimpan:
 *
 *  - Kelulusan       : 1000 jika semua bab selesai.
 *  - Bab Bonus       : laba kas (kas akhir − modal awal) ÷ 100, maksimal 700.
 *  - Ketelitian kode : 300 − 20 × (uji gagal Bab 1 + percobaan tambahan Bab 3), minimal 0.
 *
 * Durasi total dipakai sebagai penentu peringkat jika skor sama.
 */
class ScoreCalculator
{
    public const COMPLETION_POINTS = 1000;
    public const MAX_BONUS_POINTS = 700;
    public const MAX_CODING_POINTS = 300;
    public const PENALTY_PER_MISTAKE = 20;

    public static function forRoom(Room $room): array
    {
        $logs = $room->relationLoaded('missionLogs')
            ? $room->missionLogs
            : $room->missionLogs()->get(['mission_number', 'is_passed', 'attempt_count']);

        $chapter1Failures = $logs->filter(fn (MissionLog $l) => $l->mission_number === 1 && ! $l->is_passed)->count();
        $chapter3Attempts = (int) $logs
            ->filter(fn (MissionLog $l) => $l->mission_number === 3 && $l->is_passed)
            ->sum(fn (MissionLog $l) => max(1, (int) $l->attempt_count));
        $chapter3Passes = $logs->filter(fn (MissionLog $l) => $l->mission_number === 3 && $l->is_passed)->count();
        $extraAttempts = max(0, $chapter3Attempts - $chapter3Passes);

        $profit = max(0, $room->shared_money - ShopCatalog::STARTING_MONEY);
        $bonus = min(self::MAX_BONUS_POINTS, intdiv($profit, 100));
        $mistakes = $chapter1Failures + $extraAttempts;
        $coding = max(0, self::MAX_CODING_POINTS - self::PENALTY_PER_MISTAKE * $mistakes);
        $completion = $room->phase === Room::PHASE_FINISHED ? self::COMPLETION_POINTS : 0;

        return [
            'total' => $completion + $bonus + $coding,
            'max' => self::COMPLETION_POINTS + self::MAX_BONUS_POINTS + self::MAX_CODING_POINTS,
            'completion' => $completion,
            'bonus' => $bonus,
            'coding' => $coding,
            'profit' => $profit,
            'chapter1_failures' => $chapter1Failures,
            'chapter3_attempts' => $chapter3Attempts,
            'duration_seconds' => $room->started_at && $room->completed_at
                ? (int) $room->started_at->diffInSeconds($room->completed_at)
                : null,
        ];
    }
}
