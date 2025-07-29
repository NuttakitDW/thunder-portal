# Thunder Portal API - Swagger UI

## Overview
The Thunder Portal API now includes Swagger UI for easy API exploration and testing. The implementation strictly follows the OpenAPI specification located at `/api/openapi.yaml`.

## Running the API Server

1. Make sure you have the required dependencies:
```bash
cargo build
```

2. Run the server:
```bash
cargo run
```

The server will start on `http://localhost:3000`

## Accessing Swagger UI

Once the server is running, you can access:

- **Swagger UI**: http://localhost:3000/swagger-ui
- **OpenAPI Spec**: http://localhost:3000/openapi.yaml

## API Authentication

All endpoints (except `/v1/health`, `/swagger-ui`, and `/openapi.yaml`) require authentication via the `X-API-Key` header.

For testing, any non-empty value for `X-API-Key` will be accepted.

Example:
```bash
curl -H "X-API-Key: test-key" http://localhost:3000/v1/orders
```

## Endpoints Implemented

All endpoints from the OpenAPI specification have been implemented:

1. **Health Check**: `GET /v1/health`
2. **Create Order**: `POST /v1/orders`
3. **Get Order**: `GET /v1/orders/{orderId}`
4. **Submit Fusion Proof**: `POST /v1/orders/{orderId}/fusion-proof`
5. **Verify HTLC**: `POST /v1/htlc/verify`
6. **Claim HTLC**: `POST /v1/htlc/{htlcId}/claim`
7. **Refund HTLC**: `POST /v1/htlc/{htlcId}/refund`
8. **Transaction Status**: `GET /v1/transactions/{txId}/status`
9. **Register Webhook**: `POST /v1/webhooks`
10. **Estimate Fees**: `GET /v1/fees/estimate`

## Key Compliance Points

- ✅ All request/response schemas match the OpenAPI spec exactly
- ✅ SwapDirection enum uses correct casing: `ETH_TO_BTC`, `BTC_TO_ETH`
- ✅ TokenInfo structure follows spec format
- ✅ Error responses use the spec-defined structure
- ✅ Health check returns comprehensive dependency status
- ✅ X-API-Key authentication is enforced

## Testing with Swagger UI

1. Open http://localhost:3000/swagger-ui
2. Click on any endpoint to expand it
3. Click "Try it out"
4. Fill in the required parameters
5. Add `X-API-Key` header value (e.g., "test-key")
6. Click "Execute" to send the request