<?php

namespace App\Services\Dns;

use App\DTOs\DnsRecordsDTO;
use Illuminate\Support\Facades\Log;

class DnsResolutionService
{
    public function resolve(string $domain): DnsRecordsDTO
    {
        try {
            $allRecords = @dns_get_record($domain, DNS_ALL) ?: [];
            
            $mxRecords = [];
            $spfRecord = null;
            
            foreach ($allRecords as $record) {
                if ($record['type'] === 'MX') {
                    $mxRecords[] = [
                        'target' => $record['target'],
                        'pri' => $record['pri'] ?? null
                    ];
                }
                
                if ($record['type'] === 'TXT') {
                    if (str_starts_with(strtolower($record['txt'] ?? ''), 'v=spf1')) {
                        $spfRecord = $record['txt'];
                    }
                }
            }
            
            // Sort MX by priority
            usort($mxRecords, function($a, $b) {
                return ($a['pri'] ?? 999) <=> ($b['pri'] ?? 999);
            });

            // Try resolving DMARC
            $dmarcRecord = null;
            $dmarcDomain = '_dmarc.' . $domain;
            $dmarcRecords = @dns_get_record($dmarcDomain, DNS_TXT) ?: [];
            foreach ($dmarcRecords as $record) {
                if (str_starts_with(strtolower($record['txt'] ?? ''), 'v=dmarc1')) {
                    $dmarcRecord = $record['txt'];
                    break;
                }
            }

            // Try resolving DKIM (common selectors)
            $dkimRecords = [];
            $selectors = ['default', 'google', 'k1', 's1', 'selector1'];
            foreach ($selectors as $selector) {
                $dkimDomain = $selector . '._domainkey.' . $domain;
                $dkimTxT = @dns_get_record($dkimDomain, DNS_TXT) ?: [];
                foreach ($dkimTxT as $record) {
                    if (str_starts_with(strtolower($record['txt'] ?? ''), 'v=dkim1')) {
                        $dkimRecords[$selector] = $record['txt'];
                    }
                }
            }

            return new DnsRecordsDTO(
                $mxRecords,
                $spfRecord,
                $dmarcRecord,
                $dkimRecords,
                $allRecords
            );
        } catch (\Exception $e) {
            Log::error("Failed to resolve DNS for {$domain}: " . $e->getMessage());
            return new DnsRecordsDTO();
        }
    }
}
