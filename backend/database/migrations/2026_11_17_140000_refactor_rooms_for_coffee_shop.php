<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Refactor ke konsep "Kedai Kopi & Camilan Desa":
 * - rooms: fase permainan + state kedai bersama.
 * - room_players: peran cashier/warehouse + penanda kesiapan per fase.
 * - mission_logs: pencatat pemain (log Chapter 1 kini per pemain).
 */
return new class extends Migration
{
    private const STARTING_INVENTORY = [
        'kopi' => 3, 'susu' => 3, 'gula_aren' => 2, 'pisang' => 3, 'cokelat' => 2, 'kemasan' => 3,
    ];

    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->enum('phase', ['prolog', 'chapter1', 'chapter2', 'finished'])->default('prolog')->after('status');
            $table->timestamp('phase_started_at')->nullable()->after('phase');
            $table->integer('shared_money')->default(50000)->after('phase_started_at');
            $table->integer('target_money')->default(120000)->after('shared_money');
            // MySQL tidak mengizinkan nilai default literal pada kolom JSON;
            // nilai awal diisi oleh model Room ($attributes) dan backfill di bawah.
            $table->json('inventory')->nullable()->after('target_money');
            $table->unsignedInteger('customers_served')->default(0)->after('inventory');
        });

        DB::table('rooms')->whereNull('inventory')->update([
            'inventory' => json_encode(self::STARTING_INVENTORY),
        ]);

        // Ubah enum peran secara bertahap agar data lama ikut terpetakan.
        Schema::table('room_players', function (Blueprint $table) {
            $table->enum('role', ['consultant', 'technician', 'cashier', 'warehouse'])->change();
        });
        DB::table('room_players')->where('role', 'consultant')->update(['role' => 'cashier']);
        DB::table('room_players')->where('role', 'technician')->update(['role' => 'warehouse']);
        Schema::table('room_players', function (Blueprint $table) {
            $table->enum('role', ['cashier', 'warehouse'])->change();
            $table->boolean('is_prolog_ready')->default(false)->after('role');
            $table->boolean('is_chapter1_done')->default(false)->after('is_prolog_ready');
        });

        Schema::table('mission_logs', function (Blueprint $table) {
            $table->foreignId('room_player_id')->nullable()->after('room_id')
                ->constrained('room_players')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('mission_logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('room_player_id');
        });

        Schema::table('room_players', function (Blueprint $table) {
            $table->dropColumn(['is_prolog_ready', 'is_chapter1_done']);
            $table->enum('role', ['consultant', 'technician', 'cashier', 'warehouse'])->change();
        });
        DB::table('room_players')->where('role', 'cashier')->update(['role' => 'consultant']);
        DB::table('room_players')->where('role', 'warehouse')->update(['role' => 'technician']);
        Schema::table('room_players', function (Blueprint $table) {
            $table->enum('role', ['consultant', 'technician'])->change();
        });

        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn([
                'phase', 'phase_started_at', 'shared_money', 'target_money', 'inventory', 'customers_served',
            ]);
        });
    }
};
