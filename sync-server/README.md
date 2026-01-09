# Kutunza POS Cloud Sync Server

Enterprise-grade cloud synchronization server for Kutunza POS system with PostgreSQL backend.

## 🚀 Features

- ✅ **Real-time Sync**: Bidirectional sync between POS terminals and cloud
- ✅ **Authentication**: API Key and JWT-based authentication
- ✅ **Validation**: Input validation using Zod schemas
- ✅ **Logging**: Structured logging with Pino
- ✅ **Database**: PostgreSQL with Prisma ORM
- ✅ **Error Handling**: Retry logic and graceful error recovery
- ✅ **Health Checks**: Database connectivity monitoring
- ✅ **Rate Limiting**: Protection against abuse
- ✅ **CORS**: Configurable cross-origin support
- ✅ **Security**: Helmet.js security headers
- ✅ **Production Ready**: Comprehensive error handling and logging

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Railway account (for deployment)

## 🛠️ Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
```

Edit `.env` with your local PostgreSQL:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/kutunza_pos"
NODE_ENV="development"
API_KEY="dev-api-key-change-in-production"
JWT_SECRET="dev-jwt-secret-change-in-production"
LOG_LEVEL="debug"
ALLOWED_ORIGINS="*"
```

### 3. Run Database Migrations
```bash
npx prisma generate
npx prisma migrate dev
```

### 3b. Enable Refresh Tokens (required after Jan 2026 update)
```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

- Ensure `ALLOWED_ORIGINS` in `.env` lists the exact URLs of the Platform Admin UI so the secure refresh cookie can be sent.
- Redeploy the sync server after running the migration so the new `/api/platform/refresh` and `/api/platform/logout` endpoints are available.

### 4. Start Development Server
```bash
npm run dev
```

Server will start at http://localhost:3000

### 5. Test Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Test sync (requires API key)
curl -X POST http://localhost:3000/api/sync/pull \
  -H "x-api-key: dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"storeId": "test-store-id"}'
```

## 🚢 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide to Railway.

### Quick Deploy

1. **Push to GitHub**
2. **Connect Railway**
3. **Add PostgreSQL**
4. **Set Environment Variables**
5. **Deploy**

## 📡 API Reference

### Authentication

All endpoints (except `/health`) require authentication:

**Option 1: API Key**
```
Header: x-api-key: your-api-key
```

**Option 2: JWT Bearer Token**
```
Header: Authorization: Bearer your-jwt-token
```

Platform admin tokens now support silent refresh:

- Access tokens are short-lived (15 minutes) and returned by `/api/platform/login` and `/api/platform/refresh`.
- Refresh tokens are HttpOnly cookies scoped to `/api/platform` and rotate automatically on each refresh call.
- Use `/api/platform/logout` to revoke the refresh token and clear the cookie.

### Endpoints

#### Health Check
```http
GET /health
```
Returns server and database health status.

#### Sync Push
```http
POST /api/sync/push
Content-Type: application/json
x-api-key: your-api-key

{
  "storeId": "uuid",
  "changes": [
    {
      "tableName": "Product",
      "recordId": "uuid",
      "operation": "create|update|delete",
      "syncId": "uuid",
      "data": {...}
    }
  ]
}
```

#### Sync Pull
```http
POST /api/sync/pull
Content-Type: application/json
x-api-key: your-api-key

{
  "storeId": "uuid",
  "lastSyncTime": "2026-01-01T00:00:00.000Z"
}
```

#### Analytics
```http
GET /api/analytics/:storeId?startDate=...&endDate=...
x-api-key: your-api-key
```

## 🏗️ Project Structure

```
sync-server/
├── src/
│   ├── config/
│   │   ├── env.ts          # Environment validation
│   │   ├── logger.ts       # Logging configuration
│   │   └── database.ts     # Database connection
│   ├── middleware/
│   │   ├── auth.ts         # Authentication
│   │   └── validation.ts   # Request validation
│   ├── validators/
│   │   └── schemas.ts      # Zod schemas
│   └── index.ts            # Main server
├── prisma/
│   └── schema.prisma       # Database schema
├── .env.example            # Environment template
├── DEPLOYMENT.md           # Deployment guide
└── README.md
```

## 🔒 Security

- **Authentication**: API key or JWT required for all sync endpoints
- **Validation**: All inputs validated with Zod schemas
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers enabled
- **Secrets**: Never commit `.env` to version control

## 📊 Monitoring

### View Logs
```bash
# Railway
railway logs

# Local
npm run dev  # Logs to console with pino-pretty
```

### Health Monitoring
Set up monitoring service to ping `/health` every 5 minutes.

## 🧪 Testing

### Test Health
```bash
curl http://localhost:3000/health
```

### Test Authentication
```bash
# Should fail (no API key)
curl -X POST http://localhost:3000/api/sync/pull

# Should succeed
curl -X POST http://localhost:3000/api/sync/pull \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"storeId": "test-id"}'
```

## 🛠️ Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Build for production
npm start          # Start production server
npm run migrate    # Run database migrations
npm run generate   # Generate Prisma client
```

## 🐛 Troubleshooting

### Database Connection Failed
- Check `DATABASE_URL` format
- Ensure PostgreSQL is running
- Run migrations: `npx prisma migrate deploy`

### Authentication Errors
- Verify API key in both server and client
- Check for whitespace in environment variables

### CORS Errors
- Add your domain to `ALLOWED_ORIGINS`
- Use comma-separated list: `https://domain1.com,https://domain2.com`

## 📝 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `API_KEY` | Yes | API authentication key |
| `JWT_SECRET` | Yes | JWT signing secret |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
| `ALLOWED_ORIGINS` | No | CORS origins (default: *) |
| `LOG_LEVEL` | No | Logging level (default: info) |

## 📦 Dependencies

### Production
- **express**: Web framework
- **@prisma/client**: Database ORM
- **zod**: Schema validation
- **pino**: Logging
- **jsonwebtoken**: JWT authentication
- **helmet**: Security headers
- **cors**: Cross-origin support
- **express-rate-limit**: Rate limiting
- **envalid**: Environment validation

### Development
- **typescript**: Type safety
- **tsx**: TypeScript execution
- **prisma**: Database toolkit
- **pino-pretty**: Pretty logging

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

Proprietary - Kutunza POS System

## 🆘 Support

For deployment help, see [DEPLOYMENT.md](./DEPLOYMENT.md)

For issues or questions, create a GitHub issue.

---

**Production Checklist:**
- [ ] Strong API_KEY set
- [ ] Strong JWT_SECRET set
- [ ] CORS properly configured
- [ ] Database migrations run
- [ ] Health endpoint responding
- [ ] Monitoring configured
- [ ] Backups enabled
