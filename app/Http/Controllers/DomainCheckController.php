<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessDomainCheckJob;
use App\Models\BulkScanBatch;
use App\Models\DomainCheck;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use League\Csv\Reader;

class DomainCheckController extends Controller
{
    public function checkSingle(Request $request)
    {
        $request->validate([
            'domain' => 'required|string',
        ]);

        $domain = $this->extractDomain($request->input('domain'));

        if (!$this->isValidDomain($domain)) {
            return response()->json(['error' => 'Invalid domain format.'], 422);
        }

        $domainCheck = DomainCheck::create([
            'domain' => $domain,
            'input_raw' => $request->input('domain'),
            'status' => 'queued',
        ]);

        // Dispatch synchronously for a single check if desired, or let queue handle it
        ProcessDomainCheckJob::dispatchSync($domainCheck->id);

        $domainCheck->refresh();
        return response()->json($domainCheck);
    }

    public function checkBulk(Request $request)
    {
        $request->validate([
            'file' => 'nullable|file|mimes:csv,txt|max:10240',
            'domains' => 'nullable|array',
        ]);

        $domains = [];

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            
            if ($file->getClientOriginalExtension() === 'csv') {
                $csv = Reader::createFromPath($file->getPathname(), 'r');
                $csv->setHeaderOffset(null);
                foreach ($csv as $record) {
                    if (isset($record[0]) && !empty(trim($record[0]))) {
                        $domains[] = trim($record[0]);
                    }
                }
            } else {
                $content = file_get_contents($file->getPathname());
                $lines = explode("\n", $content);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (!empty($line)) {
                        $domains[] = $line;
                    }
                }
            }
        } elseif ($request->has('domains')) {
            $domains = $request->input('domains');
        }

        if (empty($domains)) {
            return response()->json(['error' => 'No domains provided.'], 422);
        }

        // Clean domains
        $cleanedDomains = [];
        $invalidDomains = [];
        foreach ($domains as $d) {
            $cleaned = $this->extractDomain($d);
            if ($cleaned && $this->isValidDomain($cleaned)) {
                $cleanedDomains[] = [
                    'raw' => $d,
                    'clean' => $cleaned
                ];
            } else {
                $invalidDomains[] = $d;
            }
        }

        if (empty($cleanedDomains)) {
            return response()->json([
                'error' => 'No valid domains provided.',
                'invalid_domains' => $invalidDomains
            ], 422);
        }

        // Create batch
        $batch = BulkScanBatch::create([
            'total_domains' => count($cleanedDomains),
            'status' => 'processing',
        ]);

        $jobs = [];
        
        // Batch insert domains for speed
        $records = [];
        foreach ($cleanedDomains as $d) {
            $id = (string) Str::uuid();
            $records[] = [
                'id' => $id,
                'batch_id' => $batch->id,
                'input_raw' => $d['raw'],
                'domain' => $d['clean'],
                'status' => 'queued',
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $jobs[] = new ProcessDomainCheckJob($id);
        }

        foreach (array_chunk($records, 500) as $chunk) {
            DomainCheck::insert($chunk);
        }

        // Dispatch jobs in chunks
        foreach (array_chunk($jobs, 500) as $chunk) {
            // Ideally use Bus::batch($chunk)->dispatch(), but for simplicity 
            // since we manage batch status manually via events/DB:
            foreach ($chunk as $job) {
                dispatch($job);
            }
        }

        return response()->json([
            'batch_id' => $batch->id,
            'total_domains' => $batch->total_domains,
            'message' => 'Bulk scan started',
            'invalid_domains' => $invalidDomains
        ]);
    }

    public function getBatchStatus(string $batchId, Request $request)
    {
        $batch = BulkScanBatch::findOrFail($batchId);
        
        $perPage = $request->input('per_page', 50);
        
        $query = DomainCheck::where('batch_id', $batchId);
        
        if ($request->has('status') && $request->input('status') !== 'all') {
            if ($request->input('status') === 'blacklisted') {
                $query->where('is_blacklisted', true);
            } elseif ($request->input('status') === 'clean') {
                $query->where('is_blacklisted', false)->where('status', 'completed');
            } elseif ($request->input('status') === 'failed') {
                $query->where('status', 'failed');
            } else {
                // Use json_contains for SQLite/MySQL/PostgreSQL to find if the JSON array contains an object with this provider
                $query->whereJsonContains('mail_providers', ['provider' => $request->input('status')]);
            }
        }
        
        $checks = $query->paginate($perPage);
        
        return response()->json([
            'batch' => $batch,
            'checks' => $checks
        ]);
    }

    public function exportBatch(string $batchId)
    {
        $batch = BulkScanBatch::findOrFail($batchId);

        return response()->streamDownload(function () use ($batchId) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Domain', 'Status', 'Blacklisted', 'Blacklist Score', 'Mail Provider', 'Confidence']);

            foreach (DomainCheck::where('batch_id', $batchId)->lazy() as $check) {
                $providers = collect($check->mail_providers ?? [])->pluck('provider')->implode(', ');
                $confidences = collect($check->mail_providers ?? [])->pluck('confidence')->implode(', ');

                fputcsv($file, [
                    $check->domain,
                    $check->status,
                    $check->is_blacklisted ? 'Yes' : 'No',
                    $check->blacklist_score,
                    $providers,
                    $confidences
                ]);
            }
            fclose($file);
        }, "batch-{$batchId}-results.csv", [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function extractDomain(string $input): string
    {
        $input = trim(strtolower($input));
        
        if (filter_var($input, FILTER_VALIDATE_EMAIL)) {
            $parts = explode('@', $input);
            return end($parts);
        }

        $input = preg_replace('#^https?://#', '', $input);
        $input = explode('/', $input)[0];
        
        return $input;
    }

    private function isValidDomain(?string $domain): bool
    {
        if (empty($domain)) {
            return false;
        }
        
        // Must contain at least one dot
        if (strpos($domain, '.') === false) {
            return false;
        }

        if (!filter_var($domain, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME)) {
            return false;
        }

        // Additional strict check for TLD (Top-Level Domain)
        $parts = explode('.', $domain);
        $tld = end($parts);

        // TLD should either be letters only (e.g. com, net) or start with xn-- for internationalized domains
        // It shouldn't contain hyphens unless it's an IDN
        if (!preg_match('/^([a-zA-Z]{2,63}|xn--[a-zA-Z0-9]+)$/', $tld)) {
            return false;
        }

        return true;
    }
}
