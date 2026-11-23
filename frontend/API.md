# UniCircle API reference

Use the [v3.0 API contract](../API_CONTRACT.md) for all 36 endpoint operations and the [OpenAPI 3.1 specification](../openapi.yaml) for machine-readable request and response schemas. The [frontend mapping](../FRONTEND_API_MAPPING.md) describes which screen calls each operation.

The frozen API uses `/api/v1`, session cookies and CSRF tokens, and decimal-string BDT values. The React client uses these calls in production and has opt-in development fixtures. Live integration remains to be verified against the Express backend.

See [Phase 0 and integration status](../FRONTEND_V3_BASELINE.md) for the remaining implementation and verification work.
