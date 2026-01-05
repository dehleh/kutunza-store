# Kutunza POS - Web Application Migration

## 🏗️ System Architecture

Your POS system has been restructured as a modern **3-tier web application**:

### **1. POS Attendant Web App** (`pos-web-app/`)
- **Stack**: React + TypeScript + Vite + Tailwind CSS
- **Features**:
  - PWA with offline support (IndexedDB via Dexie)
  - Real-time cart sync via WebSockets
  - Token-based authentication
  - Optimistic UI updates
  - Service worker for offline functionality
- **Port**: 3000
- **Deploy**: Any static host (Vercel, Netlify, Cloudflare Pages)

### **2. Customer Display App** (`customer-display/`)
- **Stack**: React + TypeScript + Framer Motion
- **Features**:
  - WebSocket-only (no data persistence)
  - Animated transitions
  - Auto-idle detection
  - Kiosk mode ready
- **Port**: 3001
- **Deploy**: Static host or cheap Android tablet

### **3. Admin Web App** (`sync-server/admin-dashboard/`)
- Already built and working
- Analytics, reports, user management
- **Port**: Runs with Vite dev server

### **4. Backend API** (`sync-server/`)
- **Stack**: Express + PostgreSQL + Socket.IO
- **Features**:
  - REST API + WebSocket server
  - JWT authentication
  - Real-time synchronization
  - Rate limiting & security
- **Port**: 5000
- **Deploy**: Railway, Render, or Fly.io

---

## 🚀 Getting Started

### **Prerequisites**
```bash
Node.js 18+
PostgreSQL (for backend)
```

### **1. Setup Backend (Sync Server)**
```bash
cd sync-server
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and secrets
npm run migrate
npm run dev
```

### **2. Setup POS Attendant App**
```bash
cd pos-web-app
npm install
cp .env.example .env
# Edit .env with API_URL and STORE_ID
npm run dev
```
Open: http://localhost:3000

### **3. Setup Customer Display**
```bash
cd customer-display
npm install
cp .env.example .env
# Edit .env with TERMINAL_ID
npm run dev
```
Open: http://localhost:3001

### **4. Setup Admin Dashboard**
```bash
cd sync-server/admin-dashboard
npm install
npm run dev
```

---

## 🔌 WebSocket Flow

```
┌─────────────────┐          ┌──────────────────┐          ┌────────────────────┐
│  POS Attendant  │  scan    │   Sync Server    │  emit    │ Customer Display   │
│   (Terminal 1)  │─────────>│   (Socket.IO)    │─────────>│   (Terminal 1)     │
└─────────────────┘          └──────────────────┘          └────────────────────┘
                                      │
                                      │ broadcast
                                      ▼
                             ┌──────────────────┐
                             │  Other Terminals │
                             │  & Admin Panel   │
                             └──────────────────┘
```

### **Events**:
- `cart:update` - POS → Server → Display
- `transaction:complete` - POS → Server → Display
- `inventory:update` - Admin → Server → All POS
- `display:subscribe` - Display registers to terminal

---

## 📦 Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **State Management** | Zustand | Lightweight global state |
| **Offline Storage** | Dexie (IndexedDB) | Local data persistence |
| **Real-time Sync** | Socket.IO | WebSocket communication |
| **Animations** | Framer Motion | Customer display effects |
| **PWA** | Vite PWA Plugin | Installable web app |
| **API Client** | Axios | HTTP requests with retry |
| **Validation** | Zod | Schema validation |

---

## 🗂️ Project Structure

```
kutunza-store/
├── pos-web-app/              # POS Attendant (main cashier interface)
│   ├── src/
│   │   ├── App.tsx           # Router & protected routes
│   │   ├── lib/
│   │   │   ├── api.ts        # API client
│   │   │   ├── db.ts         # IndexedDB (offline)
│   │   │   └── websocket.ts  # WebSocket service
│   │   ├── store/
│   │   │   ├── authStore.ts  # Authentication state
│   │   │   └── cartStore.ts  # Shopping cart state
│   │   ├── screens/          # Your existing screens
│   │   └── components/       # Your existing components
│   └── vite.config.ts        # PWA configuration
│
├── customer-display/         # Customer-facing screen
│   ├── src/
│   │   ├── App.tsx           # Main display logic
│   │   ├── components/
│   │   │   ├── WelcomeScreen.tsx     # Idle state
│   │   │   ├── CartDisplay.tsx       # Active cart
│   │   │   └── ThankYouScreen.tsx    # Post-payment
│   │   └── utils/
│   │       └── format.ts     # Currency/date formatters
│   └── vite.config.ts
│
├── sync-server/              # Backend API + WebSockets
│   ├── src/
│   │   ├── index.ts          # Express server
│   │   ├── config/
│   │   │   ├── database.ts   # Prisma client
│   │   │   ├── logger.ts     # Pino logger
│   │   │   └── websocket.ts  # Socket.IO server ✨ NEW
│   │   ├── middleware/
│   │   └── validators/
│   └── admin-dashboard/      # Admin web app
│
└── prisma/
    └── schema.prisma         # Database schema
```

---

## 🔐 Authentication Flow

1. **Login**: User enters credentials → API returns JWT token
2. **Store Token**: Zustand persists to localStorage
3. **WebSocket Auth**: Token passed in connection handshake
4. **API Requests**: Token in Authorization header
5. **Session Validation**: Auto-validates on app load

---

## 💾 Offline Strategy

### **POS Attendant**:
- Products, categories cached in IndexedDB
- Sales queued when offline
- Auto-sync when connection restored
- Visual offline indicator

### **Customer Display**:
- No offline mode (real-time only)
- Shows connection status
- Graceful degradation

---

## 🎯 Next Steps

### **Immediate** (Ready to use):
1. ✅ WebSocket real-time sync - **DONE**
2. ✅ Customer display app - **DONE**
3. ✅ Offline-capable POS - **DONE**

### **To Complete**:
4. Migrate your existing POS screens from Electron app
5. Add PWA service worker for full offline mode
6. Implement sync queue processing
7. Add audit logging for compliance
8. Create production Docker configs

---

## 🚢 Deployment Guide

### **Backend (Railway)**:
```bash
cd sync-server
railway up
```

### **POS App (Vercel)**:
```bash
cd pos-web-app
vercel --prod
```

### **Customer Display (Netlify)**:
```bash
cd customer-display
netlify deploy --prod
```

---

## 📝 Environment Variables

### **Backend (.env)**:
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
API_KEY=your-api-key
ALLOWED_ORIGINS=*
NODE_ENV=production
```

### **POS App (.env)**:
```env
VITE_API_URL=https://your-api.railway.app
VITE_WS_URL=https://your-api.railway.app
VITE_STORE_ID=your-store-id
VITE_API_KEY=your-api-key
```

### **Customer Display (.env)**:
```env
VITE_WS_URL=https://your-api.railway.app
VITE_TERMINAL_ID=terminal-001
VITE_STORE_NAME=Kutunza Gourmet
```

---

## 🎨 Customization

- **Branding**: Update colors in `tailwind.config.js`
- **Logo**: Replace in `public/` directory
- **Animations**: Adjust Framer Motion variants
- **Currency**: Change in `utils/format.ts`

---

## 🆘 Troubleshooting

**WebSocket not connecting?**
- Check CORS settings in sync-server
- Verify WS_URL includes protocol (ws:// or wss://)
- Ensure JWT_SECRET matches between apps

**Offline mode not working?**
- Check service worker registration
- Verify IndexedDB permissions
- Test in incognito mode

**Customer display blank?**
- Confirm terminal ID matches POS
- Check WebSocket connection status
- Verify display:subscribe event

---

## 📚 Documentation

- [Socket.IO Docs](https://socket.io/docs/v4/)
- [Dexie.js Guide](https://dexie.org/)
- [Framer Motion](https://www.framer.com/motion/)
- [Vite PWA](https://vite-pwa-org.netlify.app/)

---

**Questions?** Check the code comments or review the implementation in each app's source files.
