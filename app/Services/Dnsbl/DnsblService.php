<?php

namespace App\Services\Dnsbl;

use App\Contracts\DnsblServiceInterface;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class DnsblService implements DnsblServiceInterface
{
    public function check(string $ipOrDomain): array
    {
        $zones = Config::get('dnsbl.zones', []);
        $listedIn = [];
        $totalScore = 0;
        $isIp = filter_var($ipOrDomain, FILTER_VALIDATE_IP);
        
        $ip = $ipOrDomain;
        if (!$isIp) {
            $records = dns_get_record($ipOrDomain, DNS_A);
            if (!empty($records)) {
                $ip = $records[0]['ip'];
            }
        }
        
        $reversedIp = $this->reverseIp($ip);

        foreach ($zones as $zone) {
            $query = '';
            
            if ($zone['type'] === 'ip' && $isIp) {
                $query = $reversedIp . '.' . $zone['host'];
            } elseif ($zone['type'] === 'domain' && !$isIp) {
                $query = $ipOrDomain . '.' . $zone['host'];
            } elseif ($zone['type'] === 'ip' && !$isIp && filter_var($ip, FILTER_VALIDATE_IP)) {
                $query = $reversedIp . '.' . $zone['host'];
            }
            
            if (empty($query)) {
                continue;
            }

            try {
                // We use dns_get_record directly here. In a production system, 
                // we'd use a non-blocking or timeout-controlled DNS resolver library, 
                // but PHP's built in function is okay for demonstration.
                $result = @dns_get_record($query, DNS_A);
                
                if (!empty($result)) {
                    // Commonly 127.0.0.X indicates a block
                    if (str_starts_with($result[0]['ip'] ?? '', '127.0.0.')) {
                        $listedIn[] = $zone['description'] . ' (' . $zone['host'] . ')';
                        $totalScore += $zone['weight'] ?? 1;
                    }
                }
            } catch (\Exception $e) {
                Log::warning("DNSBL check failed for {$query}: " . $e->getMessage());
            }
        }

        $threshold = Config::get('dnsbl.threshold', 10);

        return [
            'is_blacklisted' => $totalScore >= $threshold,
            'score' => $totalScore,
            'listed_blacklists' => $listedIn
        ];
    }

    private function reverseIp(string $ip): string
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return implode('.', array_reverse(explode('.', $ip)));
        }
        
        // Basic IPv6 support - not strictly conforming for all DNSBLs, 
        // as some require expanding and reversing nibbles.
        // For production, a robust IP manipulation library should be used.
        return $ip; 
    }
}
