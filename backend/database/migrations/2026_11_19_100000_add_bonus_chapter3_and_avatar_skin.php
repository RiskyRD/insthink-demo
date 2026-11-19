<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Struktur sesi baru: prolog → chapter1 → bonus (Simulasi Kedai Live)
 * → chapter3 (Coding Money Tracker) → finished, plus skin avatar pemain.
 *
 * Fase lama "chapter2" dipetakan ke "bonus" (isi permainannya sama).
 */
return new class extends Migration
{
    public function up(): void
    {
        // Enum diperlebar dulu agar data lama tetap sah selama pemetaan.
        Schema::table('rooms', function (Blueprint $table) {
            $table->enum('phase', ['prolog', 'chapter1', 'chapter2', 'bonus', 'chapter3', 'finished'])
                ->default('prolog')->change();
        });
        DB::table('rooms')->where('phase', 'chapter2')->update(['phase' => 'bonus']);
        Schema::table('rooms', function (Blueprint $table) {
            $table->enum('phase', ['prolog', 'chapter1', 'bonus', 'chapter3', 'finished'])
                ->default('prolog')->change();
        });

        Schema::table('room_players', function (Blueprint $table) {
            $table->enum('avatar_skin', ['male', 'female'])->default('male')->after('role');
            $table->boolean('is_chapter3_done')->default(false)->after('is_chapter1_done');
        });

        // Jumlah percobaan sebelum lulus (dikirim klien saat chapter3-complete).
        Schema::table('mission_logs', function (Blueprint $table) {
            $table->unsignedSmallInteger('attempt_count')->nullable()->after('error_category');
        });
    }

    public function down(): void
    {
        Schema::table('mission_logs', function (Blueprint $table) {
            $table->dropColumn('attempt_count');
        });

        Schema::table('room_players', function (Blueprint $table) {
            $table->dropColumn(['avatar_skin', 'is_chapter3_done']);
        });

        Schema::table('rooms', function (Blueprint $table) {
            $table->enum('phase', ['prolog', 'chapter1', 'chapter2', 'bonus', 'chapter3', 'finished'])
                ->default('prolog')->change();
        });
        DB::table('rooms')->where('phase', 'bonus')->update(['phase' => 'chapter2']);
        // Ruangan yang sudah di Bab 3 dianggap selesai pada struktur lama.
        DB::table('rooms')->where('phase', 'chapter3')->update(['phase' => 'finished']);
        Schema::table('rooms', function (Blueprint $table) {
            $table->enum('phase', ['prolog', 'chapter1', 'chapter2', 'finished'])
                ->default('prolog')->change();
        });
    }
};
