import { app, BrowserWindow, screen, ipcMain, dialog } from 'electron';
import path from 'path';
import { Database } from './database';
import { SyncService } from './sync';
import { HardwareService } from './hardware';
import { generateReceiptNumber } from './utils';

// Keep references to windows
let mainWindow: BrowserWindow | null = null;
let customerWindow: BrowserWindow | null = null;

// Services
let database: Database;
let syncService: SyncService;
let hardwareService: HardwareService;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

async function createMainWindow() {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Kutunza POS - Attendant',
    icon: path.join(__dirname, '../../public/icon.png'),
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/#/pos');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/pos',
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Close customer window when main window closes
    if (customerWindow) {
      customerWindow.close();
    }
  });

  // Create customer display if second screen available
  if (displays.length > 1) {
    createCustomerWindow(displays[1]);
  }
}

function createCustomerWindow(display: Electron.Display) {
  customerWindow = new BrowserWindow({
    width: display.bounds.width,
    height: display.bounds.height,
    x: display.bounds.x,
    y: display.bounds.y,
    fullscreen: true,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Kutunza POS - Customer Display',
  });

  if (isDev) {
    customerWindow.loadURL('http://localhost:5173/#/customer-display');
  } else {
    customerWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/customer-display',
    });
  }

  customerWindow.on('closed', () => {
    customerWindow = null;
  });
}

// IPC Handlers
function setupIpcHandlers() {
  // ==================== DATABASE OPERATIONS ====================
  
  // Products
  ipcMain.handle('db:products:getAll', async () => {
    return database.getProducts();
  });

  ipcMain.handle('db:products:getById', async (_, id: string) => {
    return database.getProductById(id);
  });

  ipcMain.handle('db:products:getByBarcode', async (_, barcode: string) => {
    return database.getProductByBarcode(barcode);
  });

  ipcMain.handle('db:products:create', async (_, data) => {
    const result = await database.createProduct(data);
    syncService.queueSync('Product', result.id, 'create', result);
    return result;
  });

  ipcMain.handle('db:products:update', async (_, id: string, data) => {
    const result = await database.updateProduct(id, data);
    syncService.queueSync('Product', id, 'update', result);
    return result;
  });

  ipcMain.handle('db:products:delete', async (_, id: string) => {
    await database.deleteProduct(id);
    syncService.queueSync('Product', id, 'delete', { id });
    return true;
  });

  // Categories
  ipcMain.handle('db:categories:getAll', async () => {
    return database.getCategories();
  });

  ipcMain.handle('db:categories:create', async (_, data) => {
    const result = await database.createCategory(data);
    syncService.queueSync('Category', result.id, 'create', result);
    return result;
  });

  ipcMain.handle('db:categories:update', async (_, id: string, data) => {
    const result = await database.updateCategory(id, data);
    syncService.queueSync('Category', id, 'update', result);
    return result;
  });

  ipcMain.handle('db:categories:delete', async (_, id: string) => {
    await database.deleteCategory(id);
    syncService.queueSync('Category', id, 'delete', { id });
    return true;
  });

  // Sales
  ipcMain.handle('db:sales:create', async (_, data) => {
    // Generate receipt number
    data.receiptNo = generateReceiptNumber();
    
    const result = await database.createSale(data);
    
    // Update stock quantities
    for (const item of data.items) {
      await database.updateProductStock(item.productId, -item.quantity);
      syncService.queueSync('StockMovement', '', 'create', {
        productId: item.productId,
        type: 'out',
        quantity: item.quantity,
        reason: 'sale',
        reference: result.id,
      });
    }
    
    syncService.queueSync('Sale', result.id, 'create', result);
    
    // Print receipt if enabled
    const printEnabled = await database.getSetting('printReceipt');
    if (printEnabled?.value === 'true') {
      hardwareService.printReceipt(result);
    }
    
    return result;
  });

  ipcMain.handle('db:sales:getById', async (_, id: string) => {
    return database.getSaleById(id);
  });

  ipcMain.handle('db:sales:getByDateRange', async (_, startDate: string, endDate: string) => {
    return database.getSalesByDateRange(startDate, endDate);
  });

  ipcMain.handle('db:sales:getToday', async () => {
    return database.getTodaySales();
  });

  ipcMain.handle('db:sales:void', async (_, id: string, reason: string) => {
    const result = await database.voidSale(id, reason);
    syncService.queueSync('Sale', id, 'update', result);
    return result;
  });

  // Users
  ipcMain.handle('db:users:login', async (_, username: string, pin: string) => {
    return database.loginUser(username, pin);
  });

  ipcMain.handle('db:users:getAll', async () => {
    return database.getUsers();
  });

  ipcMain.handle('db:users:create', async (_, data) => {
    const result = await database.createUser(data);
    syncService.queueSync('User', result.id, 'create', result);
    return result;
  });

  ipcMain.handle('db:users:update', async (_, id: string, data) => {
    const result = await database.updateUser(id, data);
    syncService.queueSync('User', id, 'update', result);
    return result;
  });

  // Sessions
  ipcMain.handle('db:sessions:start', async (_, userId: string, openingCash: number) => {
    return database.startSession(userId, openingCash);
  });

  ipcMain.handle('db:sessions:end', async (_, sessionId: string, closingCash: number) => {
    return database.endSession(sessionId, closingCash);
  });

  ipcMain.handle('db:sessions:getActive', async (_, userId: string) => {
    return database.getActiveSession(userId);
  });

  // Customers
  ipcMain.handle('db:customers:getAll', async () => {
    return database.getCustomers();
  });

  ipcMain.handle('db:customers:search', async (_, query: string) => {
    return database.searchCustomers(query);
  });

  ipcMain.handle('db:customers:create', async (_, data) => {
    const result = await database.createCustomer(data);
    syncService.queueSync('Customer', result.id, 'create', result);
    return result;
  });

  ipcMain.handle('db:customers:updateLoyalty', async (_, id: string, points: number, spent: number) => {
    const result = await database.updateCustomerLoyalty(id, points, spent);
    syncService.queueSync('Customer', id, 'update', result);
    return result;
  });

  // Stock
  ipcMain.handle('db:stock:adjust', async (_, productId: string, quantity: number, reason: string, userId: string) => {
    const result = await database.adjustStock(productId, quantity, reason, userId);
    syncService.queueSync('StockMovement', result.id, 'create', result);
    return result;
  });

  ipcMain.handle('db:stock:getLowStock', async () => {
    return database.getLowStockProducts();
  });

  // Settings
  ipcMain.handle('db:settings:get', async (_, key: string) => {
    return database.getSetting(key);
  });

  ipcMain.handle('db:settings:set', async (_, key: string, value: string) => {
    return database.setSetting(key, value);
  });

  ipcMain.handle('db:settings:getAll', async () => {
    return database.getAllSettings();
  });

  // Reports
  ipcMain.handle('db:reports:salesSummary', async (_, startDate: string, endDate: string) => {
    return database.getSalesSummary(startDate, endDate);
  });

  ipcMain.handle('db:reports:topProducts', async (_, startDate: string, endDate: string, limit: number) => {
    return database.getTopProducts(startDate, endDate, limit);
  });

  ipcMain.handle('db:reports:hourlyBreakdown', async (_, date: string) => {
    return database.getHourlySalesBreakdown(date);
  });

  // ==================== CUSTOMER DISPLAY ====================
  
  ipcMain.on('customer-display:update', (_, data) => {
    if (customerWindow) {
      customerWindow.webContents.send('cart:updated', data);
    }
  });

  ipcMain.on('customer-display:clear', () => {
    if (customerWindow) {
      customerWindow.webContents.send('cart:cleared');
    }
  });

  ipcMain.on('customer-display:complete', (_, data) => {
    if (customerWindow) {
      customerWindow.webContents.send('sale:completed', data);
    }
  });

  // ==================== HARDWARE ====================
  
  ipcMain.handle('hardware:openCashDrawer', async () => {
    return hardwareService.openCashDrawer();
  });

  ipcMain.handle('hardware:printReceipt', async (_, saleData) => {
    return hardwareService.printReceipt(saleData);
  });

  ipcMain.handle('hardware:testPrinter', async () => {
    return hardwareService.testPrinter();
  });

  ipcMain.handle('hardware:getStatus', async () => {
    return hardwareService.getStatus();
  });rt', async () => {
    return syncService.start();
  });

  ipcMain.handle('sync:stop', async () => {
    return syncService.stop();
  });

  ipcMain.handle('sync:sta

  // ==================== MODIFIERS ====================
  
  ipcMain.handle('db:modifiers:getByProduct', async (_, productId: string) => {
    return database.getModifiersByProduct(productId);
  });

  ipcMain.handle('db:modifiers:create', async (_, data) => {
    const result = await database.createModifier(data);
    syncService.queueSync('ProductModifier', result.id, 'create', result);
    return result;
  });

  ipcMain.handle('db:modifiers:update', async (_, id: string, data) => {
    const result = await database.updateModifier(id, data);
    syncService.queueSync('ProductModifier', id, 'update', result);
    return result;
  });

  ipcMain.handle('db:modifiers:delete', async (_, id: string) => {
    await database.deleteModifier(id);
    syncService.queueSync('ProductModifier', id, 'delete', { id });
    return true;
  });

  // ==================== SYNC ====================
  
  ipcMain.handle('sync:status', async () => {
    return syncService.getStatus();
  });

  ipcMain.handle('sync:now', async () => {
    return syncService.syncNow();
  });

  ipcMain.handle('sync:getPending', async () => {
    return database.getPendingSyncItems();
  });

  // ==================== APP ====================
  
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:openCustomerDisplay', async () => {
    const displays = screen.getAllDisplays();
    if (displays.length > 1 && !customerWindow) {
      createCustomerWindow(displays[1]);
      return true;
    } else if (displays.length === 1) {
      // Open in new window on same screen for testing
      const primaryDisplay = screen.getPrimaryDisplay();
      customerWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js'),
        },
        title: 'Kutunza POS - Customer Display (Preview)',
      });
      
      if (isDev) {
        customerWindow.loadURL('http://localhost:5173/#/customer-display');
      } else {
        customerWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
          hash: '/customer-display',
        });
      }
      return true;
    }
    return false;
  });

  ipcMain.handle('app:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return result.filePaths[0];
  });

  ipcMain.handle('app:exportData', async (_, exportPath: string) => {
    return database.exportData(exportPath);
  });

  ipcMain.handle('app:importData', async (_, importPath: string) => {
    return database.importData(importPath);
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize services
  database = new Database();
  await database.initialize();
  
  syncService = new SyncService(database);
  hardwareService = new HardwareService();
  
  // Setup IPC
  setupIpcHandlers();
  
  // Create windows
  await createMainWindow();
  
  // Start sync service
  syncService.start();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  syncService.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Cleanup
  await database.close();
});
