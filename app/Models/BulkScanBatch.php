<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BulkScanBatch extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'total_domains',
        'processed_domains',
        'status',
    ];

    public function domainChecks(): HasMany
    {
        return $this->hasMany(DomainCheck::class, 'batch_id');
    }
}
