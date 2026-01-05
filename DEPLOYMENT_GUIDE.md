# Production Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- PostgreSQL database (or use Docker)
- Node.js 20+ (for local development)
- Domain names configured (for production)

### 1. Clone and Configure

```bash
git clone <your-repo>
cd kutunza-store

# Copy and configure environment variables
cp .env.example .env
nano .env  # Edit with your production values
```

### 2. Set Strong Secrets

```bash
# Generate strong JWT secret (32+ characters)
openssl rand -base64 32

# Generate API key
openssl rand -hex 32

# Update .env file with these values
```

### 3. Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f sync-server
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec sync-server npm run migrate

# Create initial admin user (inside container)
docker-compose exec sync-server node -e "
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('changeme', 12);
  const hashedPin = await bcrypt.hash('1234', 12);
  
  await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000001',
      storeId: 'store-1',
      username: 'admin',
      password: hashedPassword,
      pin: hashedPin,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    },
  });
  
  console.log('Admin user created');
  await prisma.\$disconnect();
}

createAdmin();
"
```

### 5. Access Applications

- **POS App**: http://localhost:3000
- **Customer Display**: http://localhost:3001
- **Admin Dashboard**: http://localhost:3002
- **API Server**: http://localhost:5000

## 🌐 Production Deployment

### Railway Deployment

1. **Create Railway Project**
```bash
npm install -g @railway/cli
railway login
railway init
```

2. **Add PostgreSQL Database**
```bash
railway add postgresql
```

3. **Configure Environment Variables**
```bash
railway variables set JWT_SECRET="your-secret"
railway variables set API_KEY="your-api-key"
railway variables set ALLOWED_ORIGINS="https://pos.yourdomain.com"
```

4. **Deploy**
```bash
railway up
```

### Vercel Deployment (Frontend)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy POS Web App
cd pos-web-app
vercel --prod

# Deploy Customer Display
cd ../customer-display
vercel --prod

# Deploy Admin Dashboard
cd ../sync-server/admin-dashboard
vercel --prod
```

### DigitalOcean/AWS/Azure Deployment

1. **Create VM Instance**
   - Ubuntu 22.04 LTS
   - 2 GB RAM minimum
   - 50 GB disk

2. **Install Docker**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

3. **Clone and Deploy**
```bash
git clone <your-repo>
cd kutunza-store
cp .env.example .env
nano .env  # Configure

docker-compose up -d
```

4. **Configure Nginx Reverse Proxy**
```nginx
# /etc/nginx/sites-available/kutunza

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name pos.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

5. **Enable SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com -d pos.yourdomain.com
```

## 📊 Monitoring Setup

### Add Monitoring Service to docker-compose.yml

```yaml
  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: kutunza-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: kutunza-grafana
    restart: unless-stopped
    ports:
      - "3030:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
```

### Create prometheus.yml

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'kutunza-sync-server'
    static_configs:
      - targets: ['sync-server:5000']
```

## 🔒 Security Checklist

- [ ] Strong JWT_SECRET (32+ characters)
- [ ] Strong database passwords
- [ ] Firewall configured (only ports 80, 443, 22)
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Database backups automated
- [ ] Audit logging enabled
- [ ] Non-root Docker user
- [ ] Regular security updates

## 🔄 Update Procedure

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose build
docker-compose up -d

# Run migrations
docker-compose exec sync-server npm run migrate

# Check health
docker-compose ps
docker-compose logs sync-server
```

## 🆘 Troubleshooting

### Container Won't Start
```bash
docker-compose logs <service-name>
docker-compose down
docker-compose up -d
```

### Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U kutunza -d kutunza_pos -c "SELECT 1;"
```

### Out of Memory
```bash
# Check memory usage
docker stats

# Increase container limits in docker-compose.yml
services:
  sync-server:
    mem_limit: 512m
    mem_reservation: 256m
```

### WebSocket Connection Fails
- Check CORS settings
- Verify ALLOWED_ORIGINS includes your domain
- Check nginx WebSocket configuration
- Ensure firewall allows WebSocket traffic

## 📈 Performance Optimization

### Database Optimization

```sql
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_created ON "Sale"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_store ON "Product"(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_store_date ON "AuditLog"(store_id, created_at DESC);

-- Analyze tables
ANALYZE;
```

### PostgreSQL Tuning

```conf
# postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 16MB
max_connections = 100
```

### Redis Caching (Optional)

Add Redis to cache frequently accessed data:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache product data
async function getProduct(id: string) {
  const cached = await redis.get(`product:${id}`);
  if (cached) return JSON.parse(cached);
  
  const product = await prisma.product.findUnique({ where: { id } });
  await redis.setex(`product:${id}`, 3600, JSON.stringify(product));
  return product;
}
```

## 📞 Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review health status: `curl http://localhost:5000/health`
- Monitor resources: `docker stats`
