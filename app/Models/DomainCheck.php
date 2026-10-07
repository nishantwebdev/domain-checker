<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DomainCheck extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'batch_id',
        'input_raw',
        'domain',
        'status',
        'error_message',
        'is_blacklisted',
        'blacklist_score',
        'listed_blacklists',
        'mail_providers',
        'mx_records',
        'spf_record',
        'dmarc_record',
        'dkim_record',
        'dns_records_all'
    ];

    protected $casts = [
        'is_blacklisted' => 'boolean',
        'blacklist_score' => 'integer',
        'listed_blacklists' => 'array',
        'mail_providers' => 'array',
        'mx_records' => 'array',
        'dkim_record' => 'array',
        'dns_records_all' => 'array',
    ];

    protected $appends = ['max_blacklist_score'];

    public function getMaxBlacklistScoreAttribute(): int
    {
        $zones = config('dnsbl.zones', []);
        $max = 0;
        foreach ($zones as $zone) {
            $max += $zone['weight'] ?? 1;
        }
        return $max;
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(BulkScanBatch::class, 'batch_id');
    }
}
