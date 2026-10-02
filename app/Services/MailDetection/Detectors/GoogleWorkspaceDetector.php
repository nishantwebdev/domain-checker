<?php

namespace App\Services\MailDetection\Detectors;

use App\Contracts\MailProviderDetectorInterface;
use App\DTOs\DnsRecordsDTO;
use App\DTOs\ProviderDetectionResult;

class GoogleWorkspaceDetector implements MailProviderDetectorInterface
{
    public function identifier(): string
    {
        return 'google_workspace';
    }

    public function name(): string
    {
        return 'Google Workspace';
    }

    public function priority(): int
    {
        return 10;
    }

    public function detect(string $domain, DnsRecordsDTO $records): ?ProviderDetectionResult
    {
        $reasons = [];
        $score = 0;

        // Check MX records
        foreach ($records->mxRecords as $mx) {
            if (isset($mx['target']) && (str_ends_with(strtolower($mx['target']), 'aspmx.l.google.com') || str_ends_with(strtolower($mx['target']), 'smtp.google.com'))) {
                $score += 2;
                $reasons[] = 'Primary MX record points to Google servers.';
                break;
            }
        }

        // Check SPF
        if ($records->spfRecord && str_contains($records->spfRecord, '_spf.google.com')) {
            $score += 1;
            $reasons[] = 'SPF record includes Google SPF.';
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
