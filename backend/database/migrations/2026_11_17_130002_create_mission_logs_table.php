<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mission_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('mission_number');
            $table->text('submitted_code');
            $table->text('terminal_output');
            $table->boolean('is_passed')->default(false);
            $table->string('error_category', 40)->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['room_id', 'mission_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mission_logs');
    }
};
