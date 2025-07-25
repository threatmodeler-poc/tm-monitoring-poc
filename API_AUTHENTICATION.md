# API Authentication Guide

The monitor API endpoint (`POST /api/monitor`) supports both JWT and API Key authentication methods with separate headers for better code clarity. The application now supports MSSQL database backend.

## Database Support

This application supports multiple database backends:
- SQLite (default)
- MySQL/MariaDB
- **MSSQL** (configured via db-config.json)

## Authentication Methods

### 1. JWT Authentication (Bearer Token)
This is the authentication method using JWT tokens generated during login.

**Header format:**
```
Authorization: Bearer <jwt_token>
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/monitor \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Monitor","url":"https://example.com","type":"http"}'
```

### 2. API Key Authentication
Use your API key in a dedicated `X-API-Key` header. The API key should be in the format `uk<id>_<key>`.

**Header format:**
```
X-API-Key: <api_key>
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/monitor \
  -H "X-API-Key: uk1_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Monitor","url":"https://example.com","type":"http"}'
```

## Authentication Priority

The system tries authentication methods in this order:

1. **JWT Authentication**: If the `Authorization` header is present with a Bearer token, it tries JWT validation first
2. **API Key Authentication**: If JWT fails or the `Authorization` header is not present, it tries the `X-API-Key` header

## Error Responses

- **401 Unauthorized**: Missing authentication (no `Authorization` or `X-API-Key` header provided)
- **401 Unauthorized**: Invalid or expired authentication credentials
- **500 Internal Server Error**: Server error while processing the request

## Mixed Authentication

You can send both headers in the same request:
- If JWT validation succeeds, the API key header will be ignored
- If JWT validation fails, the system will fall back to API key authentication

**Example with both headers:**
```bash
curl -X POST http://localhost:3001/api/monitor \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-API-Key: uk1_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Monitor","url":"https://example.com","type":"http"}'
```

## API Key Management

To create and manage API keys:

1. Log into the Uptime Kuma web interface
2. Go to Settings → API Keys
3. Create a new API key with appropriate permissions
4. Use this key in your API requests as described above

## Notes

- API keys must be active and not expired to work
- Each API key is associated with a specific user account
- The monitor will be created under the user account associated with the authentication method used
