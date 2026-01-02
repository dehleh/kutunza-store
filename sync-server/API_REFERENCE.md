# API Quick Reference

## Authentication

Add to all requests (except `/health`):
```
Header: x-api-key: your-api-key-here
```

Or using Bearer token:
```
Header: Authorization: Bearer your-jwt-token
```

## Endpoints

### Health Check
```http
GET /health
```
**No authentication required**

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-02T10:30:00.000Z",
  "database": {
    "connected": true,
    "latency": "15ms"
  },
  "environment": "production"
}
```

---

### Sync Push (Upload Changes)
```http
POST /api/sync/push
x-api-key: your-api-key
Content-Type: application/json

{
  "storeId": "uuid-here",
  "changes": [
    {
      "tableName": "Product",
      "recordId": "product-uuid",
      "operation": "create",
      "syncId": "unique-sync-uuid",
      "data": {
        "sku": "PROD001",
        "name": "Product Name",
        "categoryId": "category-uuid",
        "sellingPrice": 100.00,
        ...
      }
    }
  ]
}
```

**Response:**
```json
{
  "status": "completed",
  "results": {
    "success": 5,
    "failed": 0,
    "conflicts": 0,
    "errors": []
  }
}
```

---

### Sync Pull (Download Changes)
```http
POST /api/sync/pull
x-api-key: your-api-key
Content-Type: application/json

{
  "storeId": "uuid-here",
  "lastSyncTime": "2026-01-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-02T10:30:00.000Z",
  "changes": {
    "products": [...],
    "categories": [...],
    "sales": [...],
    "customers": [...],
    "users": [...],
    "settings": [...]
  }
}
```

---

### Analytics
```http
GET /api/analytics/your-store-uuid?startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T23:59:59.000Z
x-api-key: your-api-key
```

**Response:**
```json
{
  "period": {
    "start": "2026-01-01T00:00:00.000Z",
    "end": "2026-01-31T23:59:59.000Z"
  },
  "summary": {
    "totalSales": 50000.00,
    "totalTransactions": 250,
    "averageSale": 200.00
  },
  "topProducts": [...]
}
```

## Supported Table Names

- `Product`
- `Category`
- `Sale`
- `Customer`
- `User`
- `Setting`
- `StockMovement`

## Operations

- `create` - Create new record
- `update` - Update existing record
- `delete` - Soft delete (sets isActive=false)

## Error Responses

### 400 Bad Request (Validation Error)
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "storeId",
      "message": "Invalid store ID format"
    }
  ]
}
```

### 401 Unauthorized (Missing API Key)
```json
{
  "error": "API key required"
}
```

### 403 Forbidden (Invalid API Key)
```json
{
  "error": "Invalid API key"
}
```

### 429 Too Many Requests (Rate Limit)
```json
{
  "error": "Too many requests from this IP, please try again later"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

### 503 Service Unavailable (Database Down)
```json
{
  "status": "degraded",
  "database": {
    "connected": false,
    "error": "Connection timeout"
  }
}
```

## Rate Limits

- **100 requests per 15 minutes** per IP address
- Applies to all `/api/*` endpoints
- Health check is not rate limited

## CORS

Configurable via `ALLOWED_ORIGINS` environment variable.

## Need Help?

See [README.md](./README.md) for full documentation or [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.
