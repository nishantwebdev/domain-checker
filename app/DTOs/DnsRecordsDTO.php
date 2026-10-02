<?php

namespace App\DTOs;

class DnsRecordsDTO
{
    public function __construct(
        public array $mxRecords = [],
        public ?string $spfRecord = null,
        public ?string $dmarcRecord = null,
        public array $dkimRecords = [],
        public array $allRecords = []
    ) {}
}
