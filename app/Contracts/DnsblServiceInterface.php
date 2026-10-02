<?php

namespace App\Contracts;

interface DnsblServiceInterface
{
    public function check(string $ipOrDomain): array;
}
