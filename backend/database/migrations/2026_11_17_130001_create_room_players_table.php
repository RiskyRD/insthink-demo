<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->string('player_name', 50);
            $table->enum('role', ['consultant', 'technician']);
            // Hash SHA-256 dari token sesi. Token asli hanya dikirim sekali ke klien.
            $table->char('session_token', 64)->unique();
            $table->timestamps();

            // Satu peran hanya boleh diisi satu pemain per ruangan.
            $table->unique(['room_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_players');
    }
};
