# Domain Checker

A robust full-stack application for performing comprehensive domain analysis, including DNS resolution, blacklist checking, and mail provider detection. The application supports both single domain checks and bulk processing via file uploads, with real-time progress updates.

## Architecture

The project follows a modern monolithic full-stack architecture:

- **Frontend**: React (with TypeScript/TSX) powered by Vite. The UI interacts with the backend via RESTful APIs and listens to real-time events via WebSockets (e.g., Laravel Reverb or Pusher) for progress updates.
- **Backend**: Laravel framework providing a robust API, Eloquent ORM for database interactions, and event broadcasting.
- **Queue System**: Laravel Queues powered by a backend driver (like Redis or Database) handle the heavy lifting of domain resolution and checks asynchronously.
- **Database**: Stores `DomainCheck` records and `BulkScanBatch` tracking data.

## Service Patterns

The core domain checking logic is decoupled into specific services under `app/Services`, following single-responsibility and manager patterns:

### 1. DnsResolutionService (`app/Services/Dns`)
Responsible for querying and fetching DNS records for a given domain. It resolves essential records such as:
- **MX Records**: For mail routing.
- **TXT Records**: Used to extract SPF, DMARC, and DKIM policies.
The service normalizes the fetched data to be consumed by other components.

### 2. DnsblService (`app/Services/Dnsbl`)
Handles checking domains against multiple Domain Name System Blacklists (DNSBL). It queries known blacklist providers and returns an aggregated result, including a `blacklist_score`, `is_blacklisted` boolean flag, and an array of the specific blacklists where the domain was found.

### 3. MailProviderManager (`app/Services/MailDetection`)
Utilizes a Manager/Detector pattern. It takes the DNS records resolved by the `DnsResolutionService` and runs them through a series of provider-specific detectors (e.g., Google Workspace, Office 365, Zoho). It analyzes the MX and TXT records to detect the mail hosting provider, returning the provider name along with a confidence score and detection reasons.

## Job Dispatch & Bulk Upload Workflow

The application handles bulk domain uploads efficiently using Laravel's queue system:

1. **Upload & Parsing (`DomainCheckController@checkBulk`)**:
   - The user uploads a CSV or TXT file, or provides a raw list of domains.
   - The controller parses the input, extracts the domains, and performs initial validation (filtering out invalid domains).

2. **Batch Initialization**:
   - A `BulkScanBatch` model is created to track the overall progress of the upload (total domains, processed count).

3. **Database Insertion**:
   - The valid domains are prepared into an array and inserted into the `domain_checks` database table in chunks of 500 to optimize database performance. They are marked with a `queued` status.

4. **Job Dispatching**:
   - A `ProcessDomainCheckJob` is instantiated for each valid domain check using its UUID.
   - These jobs are dispatched to the queue in chunks.

5. **Asynchronous Processing (`ProcessDomainCheckJob`)**:
   - The Queue Worker (`php artisan queue:work`) picks up the jobs one by one.
   - Each job updates the status to `checking`, sequentially calls the three services (`DnsResolutionService`, `DnsblService`, `MailProviderManager`), and updates the database with the results.
   - The job increments the `processed_domains` count on the associated `BulkScanBatch`. If all domains in the batch are processed, the batch status is marked as `completed`.
   - Finally, a `DomainCheckedEvent` is broadcasted. The React frontend listens to this event to update the UI in real-time without needing to poll the server.
