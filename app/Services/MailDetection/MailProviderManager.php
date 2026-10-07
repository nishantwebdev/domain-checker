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

    /**
     * @return array<ProviderDetectionResult>
     */
    public function detect(string $domain, DnsRecordsDTO $records): array
    {
        $results = [];
        
        foreach ($this->detectors as $detector) {
            $result = $detector->detect($domain, $records);
            
            if ($result !== null && $result->provider !== 'not_detected' && $result->provider !== 'other') {
                $results[] = $result;
            }
        }
        
        // If we reach here and found no providers, use fallback
        if (empty($results)) {
            $fallback = $this->detectors->last()->detect($domain, $records);
            $results[] = $fallback ?? new ProviderDetectionResult('not_detected', 'low', ['Detection failed.']);
        }
        
        return $results;
    }
}
