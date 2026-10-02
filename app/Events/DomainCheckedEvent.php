<?php

namespace App\Events;

use App\Models\DomainCheck;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DomainCheckedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $domainCheck;

    /**
     * Create a new event instance.
     */
    public function __construct(DomainCheck $domainCheck)
    {
        $this->domainCheck = $domainCheck;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        if ($this->domainCheck->batch_id) {
            // Using a generic channel for simplicity in the demo.
            // In a real app, you might want to use a PrivateChannel if authentication is set up.
            return [
                new Channel('batch.' . $this->domainCheck->batch_id),
            ];
        }

        return [];
    }
    
    public function broadcastWith(): array
    {
        return $this->domainCheck->toArray();
    }
}
