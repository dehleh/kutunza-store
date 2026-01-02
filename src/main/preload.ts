import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Products
  products: {
    getAll: () => ipcRenderer.invoke('db:products:getAll'),
    getById: (id: string) => ipcRenderer.invoke('db:products:getById', id),
    getByBarcode: (barcode: string) => ipcRenderer.invoke('db:products:getByBarcode', barcode),
    create: (data: any) => ipcRenderer.invoke('db:products:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('db:products:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('db:products:delete', id),
  },

  // Categories
  categories: {
    getAll: () => ipcRenderer.invoke('db:categories:getAll'),
    create: (data: any) => ipcRenderer.invoke('db:categories:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('db:categories:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('db:categories:delete', id),
  },

  // Sales
  sales: {
    create: (data: any) => ipcRenderer.invoke('db:sales:create', data),
    getById: (id: string) => ipcRenderer.invoke('db:sales:getById', id),
    getByDateRange: (startDate: string, endDate: string) => ipcRenderer.invoke('db:sales:getByDateRange', startDate, endDate),
    getToday: () => ipcRenderer.invoke('db:sales:getToday'),
    void: (id: string, reason: string) => ipcRenderer.invoke('db:sales:void', id, reason),
  },

  // Users
  users: {
    login: (username: string, pin: string) => ipcRenderer.invoke('db:users:login', username, pin),
    getAll: () => ipcRenderer.invoke('db:users:getAll'),
    create: (data: any) => ipcRenderer.invoke('db:users:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('db:users:update', id, data),
  },

  // Sessions
  sessions: {
    start: (userId: string, openingCash: number) => ipcRenderer.invoke('db:sessions:start', userId, openingCash),
    end: (sessionId: string, closingCash: number) => ipcRenderer.invoke('db:sessions:end', sessionId, closingCash),
    getActive: (userId: string) => ipcRenderer.invoke('db:sessions:getActive', userId),
  },

  // Customers
  customers: {
    getAll: () => ipcRenderer.invoke('db:customers:getAll'),
    search: (query: string) => ipcRenderer.invoke('db:customers:search', query),
    create: (data: any) => ipcRenderer.invoke('db:customers:create', data),
  },

  // Stock
  stock: {
    adjust: (productId: string, quantity: number, reason: string, userId: string) => 
      ipcRenderer.invoke('db:stock:adjust', productId, quantity, reason, userId),
    getLowStock: () => ipcRenderer.invoke('db:stock:getLowStock'),
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('db:settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('db:settings:set', key, value),
    getAll: () => ipcRenderer.invoke('db:settings:getAll'),
  },

  // Reports
  reports: {
    salesSummary: (startDate: string, endDate: string) => ipcRenderer.invoke('db:reports:salesSummary', startDate, endDate),
    topProducts: (startDate: string, endDate: string, limit: number) => ipcRenderer.invoke('db:reports:topProducts', startDate, endDate, limit),
    hourlyBreakdown: (date: string) => ipcRenderer.invoke('db:reports:hourlyBreakdown', date),
  },

  // Customer display
  customerDisplay: {
    update: (data: any) => ipcRenderer.send('customer-display:update', data),
    clear: () => ipcRenderer.send('customer-display:clear'),
    complete: (data: any) => ipcRenderer.send('customer-display:complete', data),
    onCartUpdated: (callback: (data: any) => void) => {
      ipcRenderer.on('cart:updated', (_, data) => callback(data));
    },
    onCartCleared: (callback: () => void) => {
      ipcRenderer.on('cart:cleared', () => callback());
    },
    onSaleCompleted: (callback: (data: any) => void) => {
      ipcRenderer.on('sale:completed', (_, data) => callback(data));
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('cart:updated');
      ipcRenderer.removeAllListeners('cart:cleared');
      ipcRenderer.removeAllListeners('sale:completed');
    },
  },

  // Hardware
  hardware: {
    openCashDrawer: () => ipcRenderer.invoke('hardware:openCashDrawer'),
    printReceipt: (saleData: any) => ipcRenderer.invoke('hardware:printReceipt', saleData),
    testPrinter: () => ipcRenderer.invoke('hardware:testPrinter'),
    getStatus: () => ipcRenderer.invoke('hardware:getStatus'),
  },

  // Sync
  sync: {
    start: () => ipcRenderer.invoke('sync:start'),
    stop: () => ipcRenderer.invoke('sync:stop'),
    status: () => ipcRenderer.invoke('sync:status'),
    now: () => ipcRenderer.invoke('sync:now'),
    getPending: () => ipcRenderer.invoke('sync:getPending'),
  },

  // App
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    openCustomerDisplay: () => ipcRenderer.invoke('app:openCustomerDisplay'),
    selectDirectory: () => ipcRenderer.invoke('app:selectDirectory'),
    exportData: (path: string) => ipcRenderer.invoke('app:exportData', path),
    importData: (path: string) => ipcRenderer.invoke('app:importData', path),
  },

  // Modifiers
  modifiers: {
    getByProduct: (productId: string) => ipcRenderer.invoke('db:modifiers:getByProduct', productId),
    create: (data: any) => ipcRenderer.invoke('db:modifiers:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('db:modifiers:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('db:modifiers:delete', id),
  },
});

// Type definitions for the exposed API
export interface POSAPI {
  products: {
    getAll: () => Promise<any[]>;
    getById: (id: string) => Promise<any>;
    getByBarcode: (barcode: string) => Promise<any>;
    create: (data: any) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
    delete: (id: string) => Promise<boolean>;
  };
  categories: {
    getAll: () => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
    delete: (id: string) => Promise<boolean>;
  };
  sales: {
    create: (data: any) => Promise<any>;
    getById: (id: string) => Promise<any>;
    getByDateRange: (startDate: string, endDate: string) => Promise<any[]>;
    getToday: () => Promise<any[]>;
    void: (id: string, reason: string) => Promise<any>;
  };
  users: {
    login: (username: string, pin: string) => Promise<any>;
    getAll: () => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
  };
  sessions: {
    start: (userId: string, openingCash: number) => Promise<any>;
    end: (sessionId: string, closingCash: number) => Promise<any>;
    getActive: (userId: string) => Promise<any>;
  };
  customers: {
    getAll: () => Promise<any[]>;
    search: (query: string) => Promise<any[]>;
    create: (data: any) => Promise<any>;
  };
  stock: {
    adjust: (productId: string, quantity: number, reason: string, userId: string) => Promise<any>;
    getLowStock: () => Promise<any[]>;
  };
  settings: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: string) => Promise<any>;
    getAll: () => Promise<any[]>;
  };
  reports: {
    salesSummary: (startDate: string, endDate: string) => Promise<any>;
    topProducts: (startDate: string, endDate: string, limit: number) => Promise<any[]>;
    hourlyBreakdown: (date: string) => Promise<any[]>;
  };
  customerDisplay: {
    update: (data: any) => void;
    clear: () => void;
    complete: (data: any) => void;
    onCartUpdated: (callback: (data: any) => void) => void;
    onCartCleared: (callback: () => void) => void;
    onSaleCompleted: (callback: (data: any) => void) => void;
    removeAllListeners: () => void;
  };
  hardware: {
    openCashDrawer: () => Promise<boolean>;
    printReceipt: (saleData: any) => Promise<boolean>;
    getStatus: () => Promise<any>;
  };
  sync: {
    status: () => Promise<any>;
    now: () => Promise<any>;
    getPending: () => Promise<any[]>;
  };
  app: {
    getVersion: () => Promise<string>;
    openCustomerDisplay: () => Promise<boolean>;
    selectDirectory: () => Promise<string>;
    exportData: (path: string) => Promise<boolean>;
    importData: (path: string) => Promise<boolean>;
  };
}

declare global {
  interface Window {
    api: POSAPI;
  }
}
