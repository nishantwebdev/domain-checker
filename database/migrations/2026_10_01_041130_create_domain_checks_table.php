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
        Schema::create('domain_checks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('batch_id')->nullable()->constrained('bulk_scan_batches')->nullOnDelete();
            $table->text('input_raw');
            $table->string('domain');
            $table->string('status')->default('queued'); // queued, checking, completed, failed
            $table->text('error_message')->nullable();
            
            // DNSBL fields
            $table->boolean('is_blacklisted')->default(false);
            $table->json('listed_blacklists')->nullable();
            
            // Provider fields
            $table->string('mail_provider')->default('not_detected'); // google_workspace, microsoft_365, other, not_detected
            $table->string('provider_confidence')->nullable();
            $table->json('detection_reasons')->nullable();
            
            // DNS fields
            $table->json('mx_records')->nullable();
            $table->text('spf_record')->nullable();
            $table->text('dmarc_record')->nullable();
            $table->json('dkim_record')->nullable();
            $table->json('dns_records_all')->nullable();
            
            $table->timestamps();
            
            $table->index(['batch_id', 'status']);
            $table->index('domain');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('domain_checks');
    }
};
