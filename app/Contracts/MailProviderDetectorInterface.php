<?php

namespace App\Contracts;

use App\DTOs\DnsRecordsDTO;
use App\DTOs\ProviderDetectionResult;

interface MailProviderDetectorInterface
{
    public function identifier(): string;
    public function name(): string;
    public function priority(): int;
    public function detect(string $domain, DnsRecordsDTO $records): ?ProviderDetectionResult;
}
