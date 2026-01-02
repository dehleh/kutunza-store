# Kutunza POS - Point of Sale System

A custom-built, offline-first Point of Sale system for **Kutunza Gourmet** premium culinary services.

![Kutunza POS](https://via.placeholder.com/800x400/722F37/D4AF37?text=Kutunza+POS)

## Features

### 🖥️ Dual-Screen Support
- **Attendant Screen**: Full POS interface for cashiers
- **Customer Display**: Shows cart items and totals to customers (auto-detects second monitor)

### 💾 Offline-First Architecture
- Works without internet connection
- SQLite database for local storage
- Background sync when online
- Queue-based synchronization

### 🛒 Sales Features
- Product catalog with categories
- Barcode scanner support
- Quick product search
- Cart management (hold/recall orders)
- Multiple payment methods (Cash, Card, Transfer)
- Discounts (percentage & fixed)
- Receipt printing

### 📦 Inventory Management
- Real-time stock tracking
- Low stock alerts
- Stock adjustments with audit trail
- Stock value reporting

### 📊 Reports & Analytics
- Daily sales summary
- Top-selling products
- Hourly sales breakdown
- Payment method breakdown
- Transaction history

### 👥 User Management
- Role-based access (Admin, Manager, Cashier)
- PIN-based login
- Session tracking with opening/closing cash

### 🔌 Hardware Integration (Optional)
- Thermal receipt printer (ESC/POS)
- Cash drawer
- Barcode scanner
- Dual monitors

---

## Installation

### Prerequisites
- **Node.js** 18 or higher
- **npm** or **yarn**

### Setup

1. **Clone/Download the project**
```bash
cd kutunza-pos
```

2. **Install dependencies**
```bash
npm install
```

3. **Initialize the database**
```bash
npx prisma generate
```

4. **Start in development mode**
```bash
npm run dev
```

5. **Build for production**
```bash
# For Windows
npm run package:win

# For Linux
npm run package:linux
```

---

## Default Login

| Username | PIN  | Role  |
|----------|------|-------|
| admin    | 1234 | Admin |

---

## Project Structure

```
kutunza-pos/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # App entry, window management
│   │   ├── database.ts # SQLite operations
│   │   ├── sync.ts     # Cloud sync service
│   │   ├── hardware.ts # Printer/drawer integration
│   │   ├── preload.ts  # IPC bridge
│   │   └── utils.ts    # Helper functions
│   │
│   ├── renderer/       # React frontend
│   │   ├── screens/    # Page components
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── POSScreen.tsx
│   │   │   ├── CustomerDisplayScreen.tsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.tsx
│   │   │       ├── ProductsScreen.tsx
│   │   │       ├── InventoryScreen.tsx
│   │   │       ├── SalesReportScreen.tsx
│   │   │       ├── UsersScreen.tsx
│   │   │       └── SettingsScreen.tsx
│   │   ├── components/ # Reusable components
│   │   ├── store/      # Zustand state management
│   │   ├── hooks/      # Custom React hooks
│   │   └── styles/     # Global CSS
│   │
│   └── shared/         # Shared types
│       └── types.ts
│
├── prisma/
│   └── schema.prisma   # Database schema
│
├── public/             # Static assets
├── package.json
└── README.md
```

---

## Hardware Setup

### Receipt Printer
The system supports ESC/POS compatible thermal printers.

**Configuration:**
1. Go to Settings → Hardware
2. Enter printer port (e.g., `USB001`, `COM1`, or IP address)
3. Enable "Auto-print Receipt"

### Cash Drawer
Cash drawer must be connected to the printer via RJ11 cable.

**Configuration:**
1. Enable "Open Cash Drawer on Sale" in Settings

### Barcode Scanner
Any USB barcode scanner that works in keyboard mode.

**Usage:**
- Simply scan barcodes on the POS screen
- Products are automatically added to cart

### Dual Monitors
1. Connect second monitor
2. Click the monitor icon in POS header
3. Customer display opens on secondary screen

---

## Cloud Sync (Railway)

### Backend Setup (Railway)

1. Create a new project on [Railway](https://railway.app)
2. Deploy the sync server (Node.js + PostgreSQL)
3. Copy the server URL

### POS Configuration

1. Go to Settings → Cloud Sync
2. Enable "Cloud Sync"
3. Enter your Railway server URL
4. Set sync interval (default: 5 minutes)

### How Sync Works
- All changes are queued locally
- When online, changes sync to cloud
- Supports offline operation indefinitely
- Conflict resolution: last-write-wins

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` (barcode scanner) | Add scanned product |
| `F1` | Open help |
| `F2` | Hold current cart |
| `F3` | Recall held cart |
| `F4` | Apply discount |
| `F12` | Cash payment |

---

## Customization

### Branding Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  kutunza: {
    burgundy: '#722F37',  // Primary
    gold: '#D4AF37',      // Accent
    cream: '#FFF8E7',     // Background
    brown: '#8B4513',     // Secondary
    dark: '#2D1810',      // Text
  }
}
```

### Receipt Template
Edit `src/main/hardware.ts` → `formatReceipt()` function.

---

## Troubleshooting

### Database Reset
```bash
# Delete database file
rm -rf data/kutunza.db
# Restart app (auto-recreates with defaults)
```

### Printer Not Working
1. Check printer connection
2. Verify printer port in Settings
3. Test with printer's own test button
4. Check if ESC/POS compatible

### Sync Issues
1. Check internet connection
2. Verify server URL
3. Click "Sync Now" in Settings
4. Check pending items count

---

## License

Proprietary - Kutunza Gourmet

---

## Support

For technical support, contact the developer.

Built with ❤️ for Kutunza Gourmet
