<?php

namespace App\Services\MailDetection\Detectors;

use App\Contracts\MailProviderDetectorInterface;
use App\DTOs\DnsRecordsDTO;
use App\DTOs\ProviderDetectionResult;

class GenericFallbackDetector implements MailProviderDetectorInterface
{
    private array $patterns = [
        'zoho.com' => ['identifier' => 'zoho', 'name' => 'Zoho Mail'],
        'protonmail.ch' => ['identifier' => 'protonmail', 'name' => 'ProtonMail'],
        'mimecast.com' => ['identifier' => 'mimecast', 'name' => 'Mimecast'],
        'pphosted.com' => ['identifier' => 'proofpoint', 'name' => 'Proofpoint'],
        'messaging.microsoft.com' => ['identifier' => 'microsoft_exchange', 'name' => 'Microsoft Exchange'],
        'yahoodns.net' => ['identifier' => 'yahoo', 'name' => 'Yahoo Mail'],
        'fastmail.com' => ['identifier' => 'fastmail', 'name' => 'Fastmail']
    ];

    public function identifier(): string
    {
        return 'other';
    }

    public function name(): string
    {
        return 'Generic Fallback';
    }

    public function priority(): int
    {
        return 999; // Lowest priority
    }

    public function detect(string $domain, DnsRecordsDTO $records): ?ProviderDetectionResult
    {
        if (empty($records->mxRecords)) {
            return new ProviderDetectionResult(
                'not_detected',
                'high',
                ['No MX records found.']
            );
        }

        foreach ($records->mxRecords as $mx) {
            if (!isset($mx['target'])) continue;
            
            $target = strtolower($mx['target']);
            
            foreach ($this->patterns as $pattern => $info) {
                if (str_ends_with($target, $pattern)) {
                    return new ProviderDetectionResult(
                        $info['identifier'],
                        'high',
                        ['MX record points to ' . $info['name'] . '.']
                    );
                }
            }
        }

        return new ProviderDetectionResult(
            'other',
            'low',
            ['Could not identify the specific mail provider from MX records.']
        );
    }
}
