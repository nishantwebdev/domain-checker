<?php

use App\Http\Controllers\DomainCheckController;

test('extractDomain correctly extracts domain from various inputs', function ($input, $expected) {
    $controller = new DomainCheckController();
    $reflection = new ReflectionClass(DomainCheckController::class);
    $method = $reflection->getMethod('extractDomain');
    $method->setAccessible(true);
    
    $result = $method->invoke($controller, $input);
    
    expect($result)->toBe($expected);
})->with([
    // Emails
    ['test@example.com', 'example.com'],
    ['USER.NAME@Sub.Domain.com', 'sub.domain.com'],
    ['firstname+lastname@example.org', 'example.org'],
    
    // URLs
    ['https://example.com', 'example.com'],
    ['https://example.com/', 'example.com'],
    ['http://www.example.com', 'www.example.com'],
    ['https://sub.domain.co.uk/path/to/page', 'sub.domain.co.uk'],
    ['http://example.net/?query=string', 'example.net'],
    
    // Domain names and edge cases
    ['example.com', 'example.com'],
    ['example.com/', 'example.com'],
    ['www.example.org', 'www.example.org'],
    ['  example.net  ', 'example.net'], // whitespace
    ['EXAmple.co', 'example.co'], // uppercase
]);
