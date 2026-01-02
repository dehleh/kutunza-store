// Shared types for Kutunza POS

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'cashier' | 'manager' | 'admin';
}

export interface Session {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  openingCash: number;
  closingCash?: number;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  trackStock: boolean;
  stockQuantity: number;
  lowStockAlert: number;
  unit: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  taxRate: number;
  discount: number;
  modifiers: string[];
  notes: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
}

export interface Sale {
  id: string;
  receiptNo: string;
  userId: string;
  sessionId: string;
  customerId?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  discountType?: 'percentage' | 'fixed';
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'split';
  amountPaid: number;
  changeGiven: number;
  status: 'pending' | 'completed' | 'voided' | 'refunded';
  notes?: string;
  createdAt: string;
  items: SaleItem[];
  payments?: Payment[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  modifiers?: string;
  notes?: string;
}

export interface Payment {
  id: string;
  saleId: string;
  method: string;
  amount: number;
  reference?: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  userId: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  previousQty: number;
  newQty: number;
  reason?: string;
  reference?: string;
  createdAt: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
}

export interface SyncQueueItem {
  id: string;
  tableName: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  data: string;
  attempts: number;
  lastError?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  processedAt?: string;
}

// Report types
export interface SalesSummary {
  totalTransactions: number;
  totalSales: number;
  totalTax: number;
  totalDiscounts: number;
  averageSale: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface HourlySales {
  hour: string;
  transactions: number;
  sales: number;
}

export interface ProductModifier {
  id: string;
  productId: string;
  name: string;
  priceAdjustment: number;
  isActive: boolean;
}

// Window API interface declaration
declare global {
  interface Window {
    api: {
      products: {
        getAll: () => Promise<Product[]>;
        getById: (id: string) => Promise<Product>;
        getByBarcode: (barcode: string) => Promise<Product | null>;
        create: (data: any) => Promise<Product>;
        update: (id: string, data: any) => Promise<Product>;
        delete: (id: string) => Promise<boolean>;
      };
      categories: {
        getAll: () => Promise<Category[]>;
        create: (data: any) => Promise<Category>;
        update: (id: string, data: any) => Promise<Category>;
        delete: (id: string) => Promise<boolean>;
      };
      sales: {
        create: (data: any) => Promise<Sale>;
        getById: (id: string) => Promise<Sale>;
        getByDateRange: (startDate: string, endDate: string) => Promise<Sale[]>;
        getToday: () => Promise<Sale[]>;
        void: (id: string, reason: string) => Promise<Sale>;
      };
      users: {
        login: (username: string, pin: string) => Promise<User | null>;
        getAll: () => Promise<User[]>;
        create: (data: any) => Promise<User>;
        update: (id: string, data: any) => Promise<User>;
      };
      sessions: {
        start: (userId: string, openingCash: number) => Promise<Session>;
        end: (sessionId: string, closingCash: number) => Promise<Session>;
        getActive: (userId: string) => Promise<Session | null>;
      };
      customers: {
        getAll: () => Promise<Customer[]>;
        search: (query: string) => Promise<Customer[]>;
        create: (data: any) => Promise<Customer>;
        updateLoyalty: (id: string, points: number, spent: number) => Promise<Customer>;
      };
      stock: {
        adjust: (productId: string, quantity: number, reason: string, userId: string) => Promise<void>;
        getLowStock: () => Promise<Product[]>;
      };
      settings: {
        get: (key: string) => Promise<Setting | null>;
        set: (key: string, value: string) => Promise<void>;
        getAll: () => Promise<Setting[]>;
      };
      reports: {
        salesSummary: (startDate: string, endDate: string) => Promise<SalesSummary>;
        topProducts: (startDate: string, endDate: string, limit: number) => Promise<TopProduct[]>;
        hourlyBreakdown: (date: string) => Promise<HourlySales[]>;
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
        printReceipt: (saleData: Sale) => Promise<boolean>;
        testPrinter: () => Promise<boolean>;
      };
      sync: {
        start: () => Promise<void>;
        stop: () => Promise<void>;
        now: () => Promise<{ success: boolean; synced: number }>;
        status: () => Promise<any>;
      };
      app: {
        selectDirectory: () => Promise<string | null>;
        exportData: (path: string) => Promise<void>;
        importData: (path: string) => Promise<void>;
      };
      modifiers: {
        getByProduct: (productId: string) => Promise<ProductModifier[]>;
        create: (data: any) => Promise<ProductModifier>;
        update: (id: string, data: any) => Promise<ProductModifier>;
        delete: (id: string) => Promise<boolean>;
      };
    };
  }
}

export {};
