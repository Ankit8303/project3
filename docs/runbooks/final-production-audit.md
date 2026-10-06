# Final Production Audit Runbook

1. Run `node --test tests/*.mjs`.
2. Run GitHub Actions CI/CD and require all security gates.
3. Verify the published image digest and GitHub build-provenance attestation.
4. Execute `scripts/prod-preflight.sh` on the target host.
5. Validate Nginx/TLS configuration and external health checks.
6. Run k6 smoke/load/stress profiles in staging.
7. Verify MongoDB backups and restore procedure.
8. Confirm Redis/RabbitMQ/Stripe connectivity and failure recovery.
9. Deploy the immutable commit image and run `scripts/prod-verify.sh`.
10. Keep the previous immutable image tag available for rollback.
