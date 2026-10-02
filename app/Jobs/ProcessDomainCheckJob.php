<?php

namespace App\Jobs;

use App\Events\DomainCheckedEvent;
use App\Models\BulkScanBatch;
use App\Models\DomainCheck;
use App\Services\Dns\DnsResolutionService;
use App\Services\Dnsbl\DnsblService;
use App\Services\MailDetection\MailProviderManager;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessDomainCheckJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 4;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 120;

    protected string $domainCheckId;

    /**
     * Create a new job instance.
     */
    public function __construct(string $domainCheckId)
    {
        $this->domainCheckId = $domainCheckId;
    }

    /**
     * Execute the job.
     */
    public function handle(
        DnsResolutionService $dnsService,
        DnsblService $dnsblService,
        MailProviderManager $providerManager
    ): void {
        if ($this->batch() && $this->batch()->cancelled()) {
            return;
        }

        $domainCheck = DomainCheck::find($this->domainCheckId);
        if (!$domainCheck) {
            return;
        }

        $domainCheck->update(['status' => 'checking']);

        try {
            // 1. Resolve DNS
            $dnsRecords = $dnsService->resolve($domainCheck->domain);

            // 2. Check Blacklists
            $blacklistResult = $dnsblService->check($domainCheck->domain);

            // 3. Detect Provider
            $providerResult = $providerManager->detect($domainCheck->domain, $dnsRecords);

            // Update record
            $domainCheck->update([
                'status' => 'completed',
                'mx_records' => empty($dnsRecords->mxRecords) ? null : $dnsRecords->mxRecords,
                'spf_record' => $dnsRecords->spfRecord,
                'dmarc_record' => $dnsRecords->dmarcRecord,
                'dkim_record' => empty($dnsRecords->dkimRecords) ? null : $dnsRecords->dkimRecords,
                'dns_records_all' => empty($dnsRecords->allRecords) ? null : $dnsRecords->allRecords,
                
                'is_blacklisted' => $blacklistResult['is_blacklisted'],
                'blacklist_score' => $blacklistResult['score'],
                'listed_blacklists' => empty($blacklistResult['listed_blacklists']) ? null : $blacklistResult['listed_blacklists'],
                
                'mail_provider' => $providerResult->provider,
                'provider_confidence' => $providerResult->provider === 'not_detected' ? null : $providerResult->confidence,
                'detection_reasons' => $providerResult->reasons,
            ]);

        } catch (\Exception $e) {
            Log::error("Job failed for {$domainCheck->domain}: " . $e->getMessage());
            $domainCheck->update([
                'status' => 'failed',
                'error_message' => $e->getMessage()
            ]);
        }

        // Increment processed count on batch
        if ($domainCheck->batch_id) {
            $batch = BulkScanBatch::find($domainCheck->batch_id);
            if ($batch) {
                $batch->increment('processed_domains');
                
                // If all domains processed, update batch status
                if ($batch->processed_domains >= $batch->total_domains) {
                    $batch->update(['status' => 'completed']);
                }
            }
        }

        // Broadcast event for real-time updates
        event(new DomainCheckedEvent($domainCheck));
    }
}
