# ADR 0007: PII and Upload Security

## Status
Accepted

## Context
Rider identity documents and phone numbers are sensitive personal data. The original upload endpoint also accepted arbitrary strings and exposed a public local-upload fallback.

## Decision
1. Encrypt rider phone number, Aadhaar number, and driving-license number with AES-256-GCM using a server-only `PII_ENCRYPTION_KEY`.
2. Do not expose encrypted identity fields through normal rider or admin responses.
3. Return only the rider's own decrypted phone number when needed for the authenticated rider profile.
4. Decrypt phone number only at the service boundary where a restaurant needs the rider contact number for an assignment.
5. Protect the upload endpoint with `INTERNAL_SERVICE_KEY` and constant-time comparison.
6. Accept only JPEG, PNG, or WebP data URIs and cap decoded image size at 5 MB.
7. Disable local public upload fallback in production unless explicitly enabled for a controlled non-production environment.
8. Provide a migration script for existing plaintext rider PII; migration must run with the encryption key configured and should be treated as a one-time operational change.
9. Do not log raw PII, upload buffers, or Cloudinary credentials.

## Consequences
- Database compromise no longer directly reveals rider identity numbers or phone numbers.
- The application must retain the encryption key securely and back it up according to the organization's key-management policy.
- Existing plaintext records require the supplied migration before production cutover.
- Searching riders by encrypted PII requires a separate keyed lookup design; plaintext equality queries are intentionally not supported.
