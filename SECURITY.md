# Security boundary — 0.7.0

This experimental release is intended for synthetic-data evaluation on a trusted computer or an operator-controlled HTTPS pilot. It has not undergone an independent security audit and is not a production clinical service. The optional proxy mode is a deployment foundation, not an already hosted or certified service.

## Implemented controls

- The HTTP server listens on `127.0.0.1`, checks Host/Origin, uses HttpOnly/SameSite session cookies and per-session CSRF tokens, and enforces ownership on records and voice notes.
- The explicit `https-proxy` mode accepts only a same-host loopback proxy and a configured exact HTTPS origin; it validates Host, forwarding protocol/host and a single client IP, rejects arbitrary forwarded chains, requires the exact Origin on mutations and adds Secure cookies on session creation/deletion. The example proxy overwrites forwarding headers. Default local mode remains local. See [deployment configuration and unverified steps](docs/MOBILE_DEPLOYMENT.md).
- Passwords use salted scrypt. Email lookup uses HMAC. Profiles, clinical payloads, revisions, voice content and mock transfer packets use authenticated AES-256-GCM encryption.
- Browser drafts use Web Crypto encryption in IndexedDB. Keys remain available to this application's origin. An unlocked browser, malicious same-origin script or compromised operating system can access local data.
- Cached diary access can continue after session expiry; there is no independent offline PIN/identity check. Same-account reauthentication is required for server synchronization. The offline journal uses Web Locks for same-origin tab coordination and preserves rejected/conflicting operations. Browser storage is origin-specific and can be cleared or evicted; persistence requests and exports are not guarantees against loss.
- Server keys are stored beside the databases in `data/local-keys.json`. This is application-level payload encryption, not whole-file database encryption; technical IDs, audit timestamps and other metadata may remain readable. It is not a KMS/HSM or a protection against a compromised local account.
- Static content uses a restrictive content-security policy. Body sizes, voice uploads and account voice quotas are bounded. HTTP mutations, revision conflicts and duplicate operations are covered by automated tests.

## Voice and model boundary

Model processing is disabled by default. A loopback ASR adapter can be configured; an adapter that forwards externally must disclose that destination. Optional cloud adapters require explicit server configuration and per-request user confirmation. Transcripts and extracted candidates require human review before filling the form; model output does not directly write a formal diary record.

In HTTPS mode, saving audio or notes sends them to the connected diary server, which encrypts its stored originals. This is separate from an encrypted browser draft and from an optional external model request. The server-side loopback adapter is local to the host, not the patient's phone. Do not describe this mode as audio never leaving the patient's device.

Provider contracts are tested with mocked responses. No live-model accuracy, data-residency or vendor availability guarantee is made. Keep provider keys in a private server environment; `.env.example` contains documentation placeholders and is not automatically loaded.

## Limits

The application includes an optional exact-origin proxy mode, but does not obtain certificates, run a TLS proxy, open public ports or create hosting automatically. Actual TLS/DNS, certificate renewal, access restrictions and mobile acceptance remain operator tasks. Registration remains open; there is no production clinician identity verification, centralized key rotation, password-recovery service or audited multi-institution access control. The simulated clinician switch is a demonstration, not professional authorization. Email and hospital receipt flows remain simulations within the diary service. Exports and downloaded audio may be plaintext.

Keep keys and databases together in controlled backups. Do not upload `data/`, logs, recordings, exports, keys or runtime-generated files to GitHub. The source packaging gate helps detect accidental inclusion but cannot establish that arbitrary text is fully de-identified or replace manual review. Publishing history must be reviewed separately if importing an existing Git repository.

## Reporting

For the [public repository](https://github.com/Alias1027/Multi-language-Headache-Diary--), use GitHub private vulnerability reporting if enabled; that setting has not been verified by this release. Otherwise contact Junhui Liu M.D. privately at junhuiliu1025@gmail.com before sharing details. No dedicated security-response time commitment is established. Do not post credentials or real clinical material in a public issue.
