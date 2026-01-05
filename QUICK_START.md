# Kutunza POS - Quick Start Guide (Web App)

**NOTE**: This is a web application suite. No Electron installation required.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Git installed
- Code editor (VS Code recommended)

### Initial Setup

```bash
# Navigate to project
cd kutunza-store

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start development mode
npm run dev
```

The app will open automatically. Default login:
- **Username:** `admin`
- **PIN:** `1234`

---

## 💡 Key Features & How to Use

### 1. **POS Operations**

#### Adding Products
- Click product tiles or scan barcode
- Use search bar to find products
- Barcode scanner works automatically

#### Managing Cart
- **F2** - Hold current order
- **F3** - Recall held orders
- **F4** - Apply discount
- **F12** - Quick cash payment
- Click items to adjust quantity or remove

#### Payments
- **Cash:** Click "Cash" or press F12
- **Card/Transfer:** Click respective buttons
- **Split Payment:** Use "Split" for multiple payment methods

### 2. **Cash Reconciliation**

At end of shift:
1. Go to Settings or POS header
2. Click "End Session"
3. Choose counting method:
   - **Count Denominations** - For detailed counting
   - **Manual Entry** - For quick total
4. System shows variance automatically
5. Confirm to close session

### 3. **Admin Functions**

#### Products Management (`/admin/products`)
- Add new products
- Edit existing products
- Manage modifiers (click "Modifiers" button)
- Track stock levels

#### Inventory (`/admin/inventory`)
- View all stock
- Adjust quantities
- Low stock alerts
- Stock movement history

#### Sales Reports (`/admin/sales`)
- Daily sales summary
- Date range selection
- Top products
- Payment breakdown

#### Users (`/admin/users`)
- Create cashier accounts
- Set PINs
- Assign roles (Admin/Manager/Cashier)

#### Settings (`/admin/settings`)
- Business information
- Hardware configuration
- Cloud sync setup
- Tax settings

### 4. **Hardware Setup**

#### Thermal Printer
1. Go to Settings → Hardware
2. Enter printer port:
   - USB: `USB001`
   - Serial: `COM1`, `COM3`, etc.
   - Network: `tcp://192.168.1.100`
3. Click "Test Printer"
4. Enable "Auto-print Receipt"

#### Cash Drawer
- Connect to printer via RJ11 cable
- Enable "Open Drawer on Sale"
- Test with "Test Drawer" button

#### Barcode Scanner
- Plug in USB scanner
- No configuration needed (keyboard mode)
- Test by scanning on POS screen

### 5. **Cloud Sync Setup**

#### Deploy Sync Server (Railway)
```bash
cd sync-server

# Install dependencies
npm install

# Deploy to Railway
# (Follow Railway deployment guide in sync-server/README.md)
```

#### Configure POS
1. Go to Settings → Cloud Sync
2. Enable "Cloud Sync"
3. Enter Railway server URL
4. Set sync interval (default: 5 minutes)
5. Click "Sync Now" to test

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F1` | Show shortcuts help |
| `F2` | Hold current cart |
| `F3` | Recall held carts |
| `F4` | Apply discount |
| `F12` | Quick cash payment |
| `Escape` | Close modal/dialog |
| `Enter` | Scan barcode (automatic) |

---

## 🎨 Customization

### Branding
Edit `tailwind.config.js`:
```javascript
colors: {
  kutunza: {
    burgundy: '#722F37',  // Change primary color
    gold: '#D4AF37',      // Change accent color
    // ... etc
  }
}
```

### Receipt Template
Edit `src/main/hardware.ts` → Look for printer formatting section.

### Business Info
Go to Settings → Business and update details.

---

## 🔧 Troubleshooting

### App won't start
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Database issues
```bash
# Reset database
rm -rf data/kutunza.db
# Restart app (auto-recreates)
```

### Printer not working
1. Check connections
2. Verify port in Settings
3. Test with printer's own test button
4. Ensure ESC/POS compatible printer

### Sync not working
1. Check internet connection
2. Verify server URL (include https://)
3. Check server status
4. View pending items in Settings

---

## 📦 Building for Production

### Windows
```bash
npm run package:win
```
Output: `release/Kutunza POS Setup.exe`

### Linux
```bash
npm run package:linux
```
Output: `release/Kutunza POS.AppImage`

---

## 🎯 Daily Operations Workflow

### Morning Opening
1. Login with your credentials
2. Start new session
3. Enter opening cash amount
4. System is ready!

### During Shift
- Process sales normally
- Hold orders as needed (F2)
- Check stock levels
- Generate reports as needed

### End of Day
1. Click "End Session"
2. Count cash (denomination counter or manual)
3. Review variance
4. Close session
5. Print Z-Report (optional)

---

## 📞 Support

### Common Issues
- **Login fails:** Check username and PIN
- **No products showing:** Check database, reload app
- **Hardware not responding:** Check connections, restart app
- **Sync errors:** Check internet, server status

### Getting Help
- Review README.md for detailed documentation
- Check IMPLEMENTATION_SUMMARY.md for features
- Review code comments in source files
- Check console for error messages

---

## ✨ Tips & Best Practices

1. **Regular Backups:** Export data regularly (Settings → Data)
2. **Stock Checks:** Do weekly stock counts
3. **User Accounts:** Create separate accounts for each cashier
4. **Session Management:** Always close sessions properly
5. **Testing:** Test new features in development mode first
6. **Updates:** Keep dependencies updated with `npm update`

---

## 🎉 You're Ready!

The Kutunza POS system is now fully operational. Start processing sales and enjoy the efficiency gains!

For advanced features and customization, refer to the full README.md and source code documentation.

**Happy Selling! 🛒**
