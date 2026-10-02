<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('domain_checks', function (Blueprint $table) {
            $table->integer('blacklist_score')->default(0)->after('is_blacklisted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('domain_checks', function (Blueprint $table) {
            $table->dropColumn('blacklist_score');
        });
    }
};
