# Kutunza POS - Web Application Suite

Modern, cloud-connected Point of Sale system with real-time customer display and admin dashboard.

## 🏗️ Architecture

This is a **pure web application** suite with three main components:

```
kutunza-store/
├── pos-web-app/           # 🛒 POS Attendant Web App
├── customer-display/      # 📺 Customer-Facing Display
├── sync-server/          # 🔧 Backend API + WebSockets
└── prisma/               # 💾 Database Schema
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database

### 1. Setup Backend

```bash
cd sync-server
npm install
cp .env.example .env
# Edit .env with your database URL and secrets
npm run migrate
npm run dev
```

Backend runs on: `http://localhost:5000`

### 2. Setup POS Attendant App

```bash
cd pos-web-app
npm install
cp .env.example .env
# Edit .env with API URL and store credentials
npm run dev
```

POS App runs on: `http://localhost:3000`

### 3. Setup Customer Display

```bash
cd customer-display
npm install
cp .env.example .env
# Edit .env with WebSocket URL and terminal ID
npm run dev
```

Customer Display runs on: `http://localhost:3001`

## 📱 Applications

### POS Attendant Web App
**Purpose**: Main cashier interface for processing sales

**Features**:
- Product catalog with categories
- Shopping cart management
- Barcode scanner support
- Cash/Card/Transfer payments
- Discount management
- Offline-capable (PWA)
- Real-time WebSocket sync

**Tech Stack**: React, TypeScript, Vite, Zustand, Dexie (IndexedDB), Socket.IO Client

### Customer Display App
**Purpose**: Customer-facing screen showing cart items and totals

**Features**:
- Welcome screen (idle state)
- Live cart updates
- Transaction complete animation
- Beautiful UI with Framer Motion
- Auto-idle timeout

**Tech Stack**: React, TypeScript, Framer Motion, Socket.IO Client

**Deployment**: Can run on tablets, secondary monitors, or cheap Android devices

### Backend API & WebSocket Server
**Purpose**: Central server for data persistence and real-time communication

**Features**:
- REST API for all operations
- WebSocket server for real-time sync
- PostgreSQL database
- JWT authentication
- Rate limiting
- Comprehensive logging

**Tech Stack**: Express, Prisma, PostgreSQL, Socket.IO, Pino

## 🔌 Real-Time Features

### WebSocket Communication

```
┌─────────────┐          ┌──────────────┐          ┌──────────────┐
│   POS App   │  scan    │ Sync Server  │  emit    │   Customer   │
│ (Terminal)  │─────────>│ (Socket.IO)  │─────────>│   Display    │
└─────────────┘          └──────────────┘          └──────────────┘
```

**Events**:
- `cart:update` - Real-time cart changes
- `transaction:complete` - Sale finalized
- `inventory:update` - Stock level changes
- `display:subscribe` - Customer display registration

## 💾 Offline Support

The POS App works offline using:
- **IndexedDB** (via Dexie) for local data caching
- **Service Workers** (PWA) for offline functionality
- **Sync Queue** for pending transactions when offline

When connection is restored, pending changes are automatically synced.

## 🔐 Authentication

- **JWT tokens** for API authentication
- **WebSocket authentication** via token in handshake
- **Role-based access** (cashier, manager, admin)

## 🚢 Deployment

### Backend
Railway, Render, or Fly.io
```bash
cd sync-server
railway up
```

### Frontend Apps
Vercel, Netlify, or Cloudflare Pages
```bash
cd pos-web-app
vercel --prod

cd customer-display
netlify deploy --prod
```

## 🛠️ Development

### Run All Apps

```bash
npm run dev:all
```

Or start individually:
```bash
# Terminal 1
cd sync-server && npm run dev

# Terminal 2
cd pos-web-app && npm run dev

# Terminal 3
cd customer-display && npm run dev
```

## 📖 Documentation

- [API Reference](sync-server/API_REFERENCE.md)
- [POS Integration Guide](sync-server/POS_INTEGRATION.md)
- [Deployment Guide](sync-server/DEPLOYMENT.md)
- [Migration Guide](WEBAPP_MIGRATION_GUIDE.md)

## 📄 License

Private - Kutunza Gourmet © 2025

---

**Version**: 1.0.0  
**Platform**: Pure Web Application (No Electron)
