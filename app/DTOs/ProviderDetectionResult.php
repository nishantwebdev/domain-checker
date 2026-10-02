<?php

namespace App\DTOs;

class ProviderDetectionResult
{
    public function __construct(
        public string $provider, // google_workspace, microsoft_365, other, not_detected
        public string $confidence, // high, medium, low
        public array $reasons = [] // Array of reasons for detection
    ) {}
}
