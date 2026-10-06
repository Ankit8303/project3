# ADR 0013 — Release Acceptance Gate

## Status
Accepted

## Decision
Phase 20 introduces a machine-checkable release acceptance gate. A release may proceed to staging/controlled production only when the production deployment contract, rollback path, runtime hardening, CI provenance/SBOM policy, environment contract, and final audit artifacts are present.

This gate does not claim live infrastructure success. Live Docker startup, GHCR attestation verification, TLS, backup/restore, load testing, and dependency failure drills remain staging/production acceptance activities.

## Rationale
The project has accumulated security and reliability controls across nineteen phases. A final acceptance contract prevents a future change from silently removing a critical artifact while still allowing infrastructure-dependent checks to run where the real infrastructure exists.

## Consequence
The repository can mechanically reject an incomplete release package, while operators retain an explicit staging checklist for controls that cannot be proved in a source-only environment.
