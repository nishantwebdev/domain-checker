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
            $table->json('mail_providers')->nullable()->after('is_blacklisted');
            $table->dropColumn(['mail_provider', 'provider_confidence', 'detection_reasons']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('domain_checks', function (Blueprint $table) {
            $table->dropColumn('mail_providers');
            $table->string('mail_provider')->default('not_detected');
            $table->string('provider_confidence')->nullable();
            $table->json('detection_reasons')->nullable();
        });
    }
};
