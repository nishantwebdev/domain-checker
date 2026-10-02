<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

use App\Http\Controllers\DomainCheckController;

Route::prefix('v1/checks')->group(function () {
    Route::post('/single', [DomainCheckController::class, 'checkSingle']);
    Route::post('/bulk', [DomainCheckController::class, 'checkBulk']);
    Route::get('/batch/{batchId}', [DomainCheckController::class, 'getBatchStatus']);
    Route::get('/batch/{batchId}/export', [DomainCheckController::class, 'exportBatch']);
});
