# Security boundary — 0.6.1

This experimental release is intended for synthetic-data evaluation on a trusted local computer. It has not undergone an independent security audit and is not a production clinical service.

## Implemented controls

- The HTTP server listens on `127.0.0.1`, checks Host/Origin, uses HttpOnly/SameSite session cookies and per-session CSRF tokens, and enforces ownership on records and voice notes.
- Passwords use salted scrypt. Email lookup uses HMAC. Profiles, clinical payloads, revisions, voice content and mock transfer packets use authenticated AES-256-GCM encryption.
- Browser drafts use Web Crypto encryption in IndexedDB. Keys remain available to this application's origin. An unlocked browser, malicious same-origin script or compromised operating system can access local data.
- Server keys are stored beside the databases in `data/local-keys.json`. This is application-level payload encryption, not whole-file database encryption; technical IDs, audit timestamps and other metadata may remain readable. It is not a KMS/HSM or a protection against a compromised local account.
- Static content uses a restrictive content-security policy. Body sizes, voice uploads and account voice quotas are bounded. HTTP mutations, revision conflicts and duplicate operations are covered by automated tests.

## Voice and model boundary

Model processing is disabled by default. A loopback ASR adapter can be configured; an adapter that forwards externally must disclose that destination. Optional cloud adapters require explicit server configuration and per-request user confirmation. Transcripts and extracted candidates require human review before filling the form; model output does not directly write a formal diary record.

Provider contracts are tested with mocked responses. No live-model accuracy, data-residency or vendor availability guarantee is made. Keep provider keys in a private server environment; `.env.example` contains documentation placeholders and is not automatically loaded.

## Limits

There is no public-hosting mode, HTTPS termination, production clinician identity verification, centralized key rotation, password-recovery service or audited multi-institution access control. The simulated clinician switch is a demonstration, not professional authorization. Email and hospital receipt flows are local simulations. Exports and downloaded audio may be plaintext.

Keep keys and databases together in controlled backups. Do not upload `data/`, logs, recordings, exports, keys or runtime-generated files to GitHub. The source packaging gate helps detect accidental inclusion but cannot establish that arbitrary text is fully de-identified or replace manual review. Publishing history must be reviewed separately if importing an existing Git repository.

## Reporting

When this project has a public repository, use GitHub private vulnerability reporting if enabled. Otherwise contact the repository owner through a private channel before sharing details. No dedicated security mailbox or response-time commitment is currently established. Do not post credentials or real clinical material in a public issue.
