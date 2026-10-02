<?php

return [
    'threshold' => 10,
    'zones' => [
        [
            'host' => 'zen.spamhaus.org',
            'type' => 'ip',
            'weight' => 10,
            'description' => 'Spamhaus ZEN'
        ],
        [
            'host' => 'b.barracudacentral.org',
            'type' => 'ip',
            'weight' => 5,
            'description' => 'Barracuda Reputation Block List'
        ],
        [
            'host' => 'dbl.spamhaus.org',
            'type' => 'domain',
            'weight' => 10,
            'description' => 'Spamhaus DBL'
        ],
        [
            'host' => 'multi.surbl.org',
            'type' => 'domain',
            'weight' => 5,
            'description' => 'SURBL'
        ]
    ]
];
