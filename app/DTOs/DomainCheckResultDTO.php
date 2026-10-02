<?php

namespace App\DTOs;

class DomainCheckResultDTO
{
    public function __construct(
        public string $domain,
        public bool $isBlacklisted = false,
        public array $listedBlacklists = [],
        public ?ProviderDetectionResult $providerResult = null,
        public ?DnsRecordsDTO $dnsRecords = null
    ) {}
}
