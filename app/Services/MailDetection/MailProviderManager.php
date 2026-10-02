<?php

namespace App\Services\MailDetection;

use App\Contracts\MailProviderDetectorInterface;
use App\DTOs\DnsRecordsDTO;
use App\DTOs\ProviderDetectionResult;
use Illuminate\Support\Collection;

class MailProviderManager
{
    /** @var Collection<MailProviderDetectorInterface> */
    private Collection $detectors;

    public function __construct()
    {
        $this->detectors = collect([
            new Detectors\GoogleWorkspaceDetector(),
            new Detectors\Microsoft365Detector(),
            new Detectors\GenericFallbackDetector(),
        ])->sortBy(fn (MailProviderDetectorInterface $detector) => $detector->priority());
    }

    public function detect(string $domain, DnsRecordsDTO $records): ProviderDetectionResult
    {
        foreach ($this->detectors as $detector) {
            $result = $detector->detect($domain, $records);
            
            if ($result !== null && $result->provider !== 'not_detected' && $result->provider !== 'other') {
                return $result;
            }
        }
        
        // If we reach here, we only found "other" or "not_detected" from fallback
        $fallback = $this->detectors->last()->detect($domain, $records);
        return $fallback ?? new ProviderDetectionResult('not_detected', 'low', ['Detection failed.']);
    }
}
