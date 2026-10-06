# Authorization Matrix — Phase 2

| Resource / Operation | Customer | Seller | Rider | Admin | Internal Service |
|---|---:|---:|---:|---:|---:|
| Own profile | ✓ | ✓ | ✓ | ✓ | — |
| Add/change self-service role | ✓ | ✓ | ✓ | — | — |
| Own cart | ✓ | — | — | — | — |
| Own addresses | ✓ | — | — | — | — |
| Create order | ✓ | — | — | — | — |
| View own order | ✓ | — | — | — | — |
| View owned-restaurant order | — | ✓ | — | — | — |
| Cancel own placed order | ✓ | — | — | — | — |
| Review own delivered order | ✓ | — | — | — | — |
| Manage owned restaurant | — | ✓ | — | — | — |
| Manage owned menu | — | ✓ | — | — | — |
| Rider workflow | — | — | ✓ | — | — |
| Assign rider | — | — | — | — | ✓ |
| Update rider delivery state | — | — | — | — | ✓ |
| Fetch payment order data | — | — | — | — | ✓ |
| Emit realtime internal event | — | — | — | — | ✓ |
| Join arbitrary user room | ✗ | ✗ | ✗ | ✗ | N/A |
| Join own user room | ✓ | ✓ | ✓ | ✓ | N/A |
| Join owned restaurant room | — | ✓ | — | — | N/A |
| Join authorized order room | own order | owned restaurant | assigned order | — | N/A |
