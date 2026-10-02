<?php

namespace App\Services\MailDetection\Detectors;

use App\Contracts\MailProviderDetectorInterface;
use App\DTOs\DnsRecordsDTO;
use App\DTOs\ProviderDetectionResult;

class Microsoft365Detector implements MailProviderDetectorInterface
{
    public function identifier(): string
    {
        return 'microsoft_365';
    }

    public function name(): string
    {
        return 'Microsoft 365';
    }

    public function priority(): int
    {
        return 20;
    }

    public function detect(string $domain, DnsRecordsDTO $records): ?ProviderDetectionResult
    {
        $reasons = [];
        $score = 0;

        // Check MX records
        foreach ($records->mxRecords as $mx) {
            if (isset($mx['target']) && str_ends_with(strtolower($mx['target']), 'mail.protection.outlook.com')) {
                $score += 2;
                $reasons[] = 'Primary MX record points to Microsoft Outlook protection servers.';
                break;
            }
        }

        // Check SPF
        if ($records->spfRecord && str_contains($records->spfRecord, 'spf.protection.outlook.com')) {
            $score += 1;
            $reasons[] = 'SPF record includes Microsoft 365 SPF.';
        }

        if ($score >= 2) {
            return new ProviderDetectionResult(
                $this->identifier(),
                'high',
                $reasons
            );
        } elseif ($score == 1) {
            return new ProviderDetectionResult(
                $this->identifier(),
                'low',
                $reasons
            );
        }

        return null;
    }
}
