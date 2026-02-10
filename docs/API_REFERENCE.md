# API Reference

Base URL: `https://average-api.railway.app` (production) or `http://localhost:3000` (development)

---

## Authentication

### POST /auth/register
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "displayName": "John Doe"
}
```

**Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe"
  }
}
```

**Errors:**
- `400` — Validation failed (invalid email, password too short)
- `409` — Email already registered

---

### POST /auth/login
Authenticate with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe"
  }
}
```

**Errors:**
- `401` — Invalid email or password

---

### POST /auth/refresh
Rotate refresh token and get new access token.

**Request Body:**
```json
{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "new-uuid-token"
}
```

---

### GET /auth/verify
Verify current access token validity. Requires `Authorization: Bearer <token>` header.

**Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe"
  }
}
```

---

### POST /auth/logout
Invalidate all sessions. Requires authentication.

**Response (200):**
```json
{
  "success": true
}
```

---

## Trips

All trip endpoints require `Authorization: Bearer <token>` header.

### POST /trips/sync
Bulk upsert trips from device.

**Request Body:**
```json
{
  "trips": [
    {
      "id": "optional-uuid-for-upsert",
      "startTime": "2025-01-15T08:30:00.000Z",
      "endTime": "2025-01-15T09:15:00.000Z",
      "distance": 45200,
      "avgSpeed": 23.6,
      "maxSpeed": 38.9,
      "duration": 2700,
      "speedUnit": "kmh"
    }
  ]
}
```

**Response (200):**
```json
{
  "synced": 1,
  "trips": [{ "id": "uuid", "..." }]
}
```

---

### GET /trips/history
Paginated trip history.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response (200):**
```json
{
  "trips": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

## License

### POST /license/validate
Validate a license key and register device fingerprint. Requires authentication.

**Request Body:**
```json
{
  "key": "LICENSE-KEY-HERE",
  "deviceId": "device-uuid",
  "platform": "android",
  "model": "Pixel 8",
  "osVersion": "14",
  "appVersion": "0.1.0"
}
```

**Response (200):**
```json
{
  "valid": true,
  "license": {
    "id": "uuid",
    "maxDevices": 2,
    "expiresAt": "2026-01-15T00:00:00.000Z"
  }
}
```

**Errors:**
- `404` — Invalid license key
- `403` — License deactivated, expired, or max devices reached

---

## Rate Limits

| Endpoint Group | Limit |
|---------------|-------|
| Global | 100 requests/minute per IP |
| Auth endpoints | 20 requests/minute per IP |
| Trips/License | 100 requests/minute per IP |
