import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

export class Database {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    const userDataPath = isDev 
      ? path.join(process.cwd(), 'data')
      : path.join(app.getPath('userData'), 'data');
    
    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    this.dbPath = path.join(userDataPath, 'kutunza.db');
  }

  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    await this.createTables();
    await this.seedDefaultData();
  }

  private async createTables(): Promise<void> {
    const db = this.db!;
    
    // Users
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        pin TEXT NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT DEFAULT 'cashier',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_id TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        last_sync_at TEXT
      )
    `);

    // Sessions
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ended_at TEXT,
        opening_cash REAL DEFAULT 0,
        closing_cash REAL,
        is_active INTEGER DEFAULT 1,
        sync_id TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        last_sync_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Categories
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#8B4513',
        icon TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_id TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        last_sync_at TEXT
      )
    `);

    // Products
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        barcode TEXT UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        category_id TEXT,
        cost_price REAL DEFAULT 0,
        selling_price REAL NOT NULL,
        tax_rate REAL DEFAULT 0,
        track_stock INTEGER DEFAULT 1,
        stock_quantity INTEGER DEFAULT 0,
        low_stock_alert INTEGER DEFAULT 10,
        unit TEXT DEFAULT 'pcs',
        image_url TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_id TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        last_sync_at TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    // Product modifiers
    db.exec(`
      CREATE TABLE IF NOT EXISTS product_modifiers (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        name TEXT NOT NULL,
        price_adjustment REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        sync_id TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        last_sync_at TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Stock movements
    db.exec(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        previous_qty INTEGER NOT NULL,
        new_qty INTEGER NOT NULL,
        reason TEXT,
        reference TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_id TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        last_sync_at TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Customers
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE,
        email TEXT,
        address TEXT,
        loyalty_points INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0,
        visit_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_id TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        last_sync_at TEXT
      )
    `);

    // Sales
    db.exec(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        receipt_no TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        customer_id TEXT,
        subtotal REAL NOT NULL,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        discount_type TEXT,
        total_amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        amount_paid REAL NOT NULL,
        change_given REAL DEFAULT 0,
        status TEXT DEFAULT 'completed',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_id TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        last_sync_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    // Sale items
    db.exec(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        cost_price REAL NOT NULL,
        tax_rate REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        modifiers TEXT,
        notes TEXT,
        sync_id TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        last_sync_at TEXT,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Payments
    db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        method TEXT NOT NULL,
        amount REAL NOT NULL,
        reference TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_id TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        last_sync_at TEXT,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
      )
    `);

    // Sync queue
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        processed_at TEXT
      )
    `);

    // Settings
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        type TEXT DEFAULT 'string',
        category TEXT DEFAULT 'general',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_id TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        last_sync_at TEXT
      )
    `);

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
    `);
  }

  private async seedDefaultData(): Promise<void> {
    const db = this.db!;
    
    // Check if admin user exists
    const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    
    if (!adminExists) {
      // Create default admin user (PIN: 1234, Password: admin123)
      const adminId = uuidv4();
      db.prepare(`
        INSERT INTO users (id, username, pin, password, first_name, last_name, role, sync_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(adminId, 'admin', '1234', 'admin123', 'Admin', 'User', 'admin', uuidv4());

      // Create default categories
      const categories = [
        { name: 'Ready Meals', color: '#722F37', icon: 'utensils' },
        { name: 'Spice Blends', color: '#D4AF37', icon: 'flame' },
        { name: 'Meal Kits', color: '#8B4513', icon: 'package' },
        { name: 'Beverages', color: '#2D6A4F', icon: 'coffee' },
        { name: 'Desserts', color: '#E07B39', icon: 'cake' },
      ];

      const insertCategory = db.prepare(`
        INSERT INTO categories (id, name, color, icon, sort_order, sync_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      categories.forEach((cat, index) => {
        insertCategory.run(uuidv4(), cat.name, cat.color, cat.icon, index, uuidv4());
      });

      // Create default settings
      const settings = [
        { key: 'businessName', value: 'Kutunza Gourmet', category: 'business' },
        { key: 'businessAddress', value: 'Graceland Estate, Lekki, Lagos', category: 'business' },
        { key: 'businessPhone', value: '', category: 'business' },
        { key: 'currency', value: 'NGN', category: 'general' },
        { key: 'currencySymbol', value: '₦', category: 'general' },
        { key: 'taxRate', value: '7.5', category: 'tax' },
        { key: 'taxEnabled', value: 'false', category: 'tax' },
        { key: 'printReceipt', value: 'true', category: 'hardware' },
        { key: 'openDrawerOnSale', value: 'true', category: 'hardware' },
        { key: 'receiptPrinterPort', value: '', category: 'hardware' },
        { key: 'cloudSyncUrl', value: '', category: 'sync' },
        { key: 'cloudSyncEnabled', value: 'false', category: 'sync' },
        { key: 'autoSyncInterval', value: '300', category: 'sync' }, // 5 minutes
      ];

      const insertSetting = db.prepare(`
        INSERT INTO settings (id, key, value, category, sync_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      settings.forEach((setting) => {
        insertSetting.run(uuidv4(), setting.key, setting.value, setting.category, uuidv4());
      });
    }
  }

  // ==================== PRODUCTS ====================

  getProducts(): any[] {
    return this.db!.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.sort_order, p.name
    `).all();
  }

  getProductById(id: string): any {
    return this.db!.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);
  }

  getProductByBarcode(barcode: string): any {
    return this.db!.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.barcode = ? AND p.is_active = 1
    `).get(barcode);
  }

  createProduct(data: any): any {
    const id = uuidv4();
    const syncId = uuidv4();
    
    this.db!.prepare(`
      INSERT INTO products (id, sku, barcode, name, description, category_id, cost_price, selling_price, 
        tax_rate, track_stock, stock_quantity, low_stock_alert, unit, image_url, sync_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.sku, data.barcode, data.name, data.description, data.categoryId,
      data.costPrice || 0, data.sellingPrice, data.taxRate || 0,
      data.trackStock ? 1 : 0, data.stockQuantity || 0, data.lowStockAlert || 10,
      data.unit || 'pcs', data.imageUrl, syncId
    );

    return this.getProductById(id);
  }

  updateProduct(id: string, data: any): any {
    const updates: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      sku: 'sku',
      barcode: 'barcode',
      name: 'name',
      description: 'description',
      categoryId: 'category_id',
      costPrice: 'cost_price',
      sellingPrice: 'selling_price',
      taxRate: 'tax_rate',
      trackStock: 'track_stock',
      stockQuantity: 'stock_quantity',
      lowStockAlert: 'low_stock_alert',
      unit: 'unit',
      imageUrl: 'image_url',
      isActive: 'is_active',
      sortOrder: 'sort_order',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        updates.push(`${column} = ?`);
        values.push(typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : data[key]);
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      updates.push("sync_status = 'pending'");
      values.push(id);

      this.db!.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getProductById(id);
  }

  updateProductStock(productId: string, quantityChange: number): void {
    this.db!.prepare(`
      UPDATE products 
      SET stock_quantity = stock_quantity + ?, 
          updated_at = CURRENT_TIMESTAMP,
          sync_status = 'pending'
      WHERE id = ?
    `).run(quantityChange, productId);
  }

  deleteProduct(id: string): void {
    this.db!.prepare(`
      UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP, sync_status = 'pending'
      WHERE id = ?
    `).run(id);
  }

  getLowStockProducts(): any[] {
    return this.db!.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.track_stock = 1 AND p.stock_quantity <= p.low_stock_alert
      ORDER BY p.stock_quantity
    `).all();
  }

  // ==================== CATEGORIES ====================

  getCategories(): any[] {
    return this.db!.prepare(`
      SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, name
    `).all();
  }

  createCategory(data: any): any {
    const id = uuidv4();
    this.db!.prepare(`
      INSERT INTO categories (id, name, description, color, icon, sort_order, sync_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.description, data.color || '#8B4513', data.icon, data.sortOrder || 0, uuidv4());

    return this.db!.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  }

  updateCategory(id: string, data: any): any {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.color !== undefined) { updates.push('color = ?'); values.push(data.color); }
    if (data.icon !== undefined) { updates.push('icon = ?'); values.push(data.icon); }
    if (data.sortOrder !== undefined) { updates.push('sort_order = ?'); values.push(data.sortOrder); }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      updates.push("sync_status = 'pending'");
      values.push(id);

      this.db!.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.db!.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  }

  deleteCategory(id: string): void {
    this.db!.prepare(`
      UPDATE categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP, sync_status = 'pending'
      WHERE id = ?
    `).run(id);
  }

  // ==================== SALES ====================

  createSale(data: any): any {
    const db = this.db!;
    const saleId = uuidv4();

    const insertSale = db.transaction(() => {
      // Insert sale
      db.prepare(`
        INSERT INTO sales (id, receipt_no, user_id, session_id, customer_id, subtotal, tax_amount,
          discount_amount, discount_type, total_amount, payment_method, amount_paid, change_given,
          status, notes, sync_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        saleId, data.receiptNo, data.userId, data.sessionId, data.customerId,
        data.subtotal, data.taxAmount || 0, data.discountAmount || 0, data.discountType,
        data.totalAmount, data.paymentMethod, data.amountPaid, data.changeGiven || 0,
        'completed', data.notes, uuidv4()
      );

      // Insert sale items
      const insertItem = db.prepare(`
        INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price,
          cost_price, tax_rate, tax_amount, discount, total, modifiers, notes, sync_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of data.items) {
        insertItem.run(
          uuidv4(), saleId, item.productId, item.productName, item.quantity,
          item.unitPrice, item.costPrice || 0, item.taxRate || 0, item.taxAmount || 0,
          item.discount || 0, item.total, JSON.stringify(item.modifiers), item.notes, uuidv4()
        );
      }

      // Insert payments if multiple
      if (data.payments && data.payments.length > 0) {
        const insertPayment = db.prepare(`
          INSERT INTO payments (id, sale_id, method, amount, reference, sync_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const payment of data.payments) {
          insertPayment.run(uuidv4(), saleId, payment.method, payment.amount, payment.reference, uuidv4());
        }
      }

      // Update customer stats if applicable
      if (data.customerId) {
        db.prepare(`
          UPDATE customers 
          SET total_spent = total_spent + ?, visit_count = visit_count + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(data.totalAmount, data.customerId);
      }

      return saleId;
    });

    insertSale();
    return this.getSaleById(saleId);
  }

  getSaleById(id: string): any {
    const sale = this.db!.prepare(`
      SELECT s.*, u.first_name || ' ' || u.last_name as cashier_name, c.name as customer_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `).get(id);

    if (sale) {
      sale.items = this.db!.prepare(`
        SELECT * FROM sale_items WHERE sale_id = ?
      `).all(id);

      sale.payments = this.db!.prepare(`
        SELECT * FROM payments WHERE sale_id = ?
      `).all(id);
    }

    return sale;
  }

  getSalesByDateRange(startDate: string, endDate: string): any[] {
    return this.db!.prepare(`
      SELECT s.*, u.first_name || ' ' || u.last_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.created_at >= ? AND s.created_at <= ?
      ORDER BY s.created_at DESC
    `).all(startDate, endDate);
  }

  getTodaySales(): any[] {
    return this.db!.prepare(`
      SELECT s.*, u.first_name || ' ' || u.last_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE date(s.created_at) = date('now')
      ORDER BY s.created_at DESC
    `).all();
  }

  voidSale(id: string, reason: string): any {
    this.db!.prepare(`
      UPDATE sales SET status = 'voided', notes = ?, updated_at = CURRENT_TIMESTAMP, sync_status = 'pending'
      WHERE id = ?
    `).run(reason, id);

    // Restore stock
    const items = this.db!.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as any[];
    for (const item of items) {
      this.updateProductStock(item.product_id, item.quantity);
    }

    return this.getSaleById(id);
  }

  // ==================== USERS ====================

  loginUser(username: string, pin: string): any {
    return this.db!.prepare(`
      SELECT id, username, first_name, last_name, role 
      FROM users 
      WHERE username = ? AND pin = ? AND is_active = 1
    `).get(username, pin);
  }

  getUsers(): any[] {
    return this.db!.prepare(`
      SELECT id, username, first_name, last_name, role, is_active, created_at
      FROM users ORDER BY first_name
    `).all();
  }

  createUser(data: any): any {
    const id = uuidv4();
    this.db!.prepare(`
      INSERT INTO users (id, username, pin, password, first_name, last_name, role, sync_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.username, data.pin, data.password || data.pin, data.firstName, data.lastName, data.role || 'cashier', uuidv4());

    return this.db!.prepare('SELECT id, username, first_name, last_name, role FROM users WHERE id = ?').get(id);
  }

  updateUser(id: string, data: any): any {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.username !== undefined) { updates.push('username = ?'); values.push(data.username); }
    if (data.pin !== undefined) { updates.push('pin = ?'); values.push(data.pin); }
    if (data.password !== undefined) { updates.push('password = ?'); values.push(data.password); }
    if (data.firstName !== undefined) { updates.push('first_name = ?'); values.push(data.firstName); }
    if (data.lastName !== undefined) { updates.push('last_name = ?'); values.push(data.lastName); }
    if (data.role !== undefined) { updates.push('role = ?'); values.push(data.role); }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      this.db!.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.db!.prepare('SELECT id, username, first_name, last_name, role FROM users WHERE id = ?').get(id);
  }

  // ==================== SESSIONS ====================

  startSession(userId: string, openingCash: number): any {
    const id = uuidv4();
    this.db!.prepare(`
      INSERT INTO sessions (id, user_id, opening_cash, sync_id)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, openingCash, uuidv4());

    return this.db!.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  }

  endSession(sessionId: string, closingCash: number): any {
    this.db!.prepare(`
      UPDATE sessions SET ended_at = CURRENT_TIMESTAMP, closing_cash = ?, is_active = 0, sync_status = 'pending'
      WHERE id = ?
    `).run(closingCash, sessionId);

    return this.db!.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  }

  getActiveSession(userId: string): any {
    return this.db!.prepare('SELECT * FROM sessions WHERE user_id = ? AND is_active = 1').get(userId);
  }

  // ==================== CUSTOMERS ====================

  getCustomers(): any[] {
    return this.db!.prepare('SELECT * FROM customers ORDER BY name').all();
  }

  searchCustomers(query: string): any[] {
    return this.db!.prepare(`
      SELECT * FROM customers 
      WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
      ORDER BY name LIMIT 20
    `).all(`%${query}%`, `%${query}%`, `%${query}%`);
  }

  createCustomer(data: any): any {
    const id = uuidv4();
    this.db!.prepare(`
      INSERT INTO customers (id, name, phone, email, address, sync_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.phone, data.email, data.address, uuidv4());

    return this.db!.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  }

  updateCustomerLoyalty(id: string, pointsToAdd: number, spentAmount: number): any {
    this.db!.prepare(`
      UPDATE customers 
      SET loyalty_points = loyalty_points + ?,
          total_spent = total_spent + ?,
          visit_count = visit_count + 1,
          updated_at = CURRENT_TIMESTAMP,
          sync_status = 'pending'
      WHERE id = ?
    `).run(pointsToAdd, spentAmount, id);

    return this.db!.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  }

  // ==================== MODIFIERS ====================

  getModifiersByProduct(productId: string): any[] {
    return this.db!.prepare(`
      SELECT * FROM product_modifiers 
      WHERE product_id = ? AND is_active = 1
      ORDER BY name
    `).all(productId);
  }

  createModifier(data: any): any {
    const id = uuidv4();
    this.db!.prepare(`
      INSERT INTO product_modifiers (id, product_id, name, price_adjustment, sync_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.productId, data.name, data.priceAdjustment || 0, uuidv4());

    return this.db!.prepare('SELECT * FROM product_modifiers WHERE id = ?').get(id);
  }

  updateModifier(id: string, data: any): any {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.priceAdjustment !== undefined) { updates.push('price_adjustment = ?'); values.push(data.priceAdjustment); }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }

    if (updates.length > 0) {
      updates.push("sync_status = 'pending'");
      values.push(id);
      this.db!.prepare(`UPDATE product_modifiers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.db!.prepare('SELECT * FROM product_modifiers WHERE id = ?').get(id);
  }

  deleteModifier(id: string): void {
    this.db!.prepare(`
      UPDATE product_modifiers SET is_active = 0, sync_status = 'pending' WHERE id = ?
    `).run(id);
  }

  // ==================== STOCK ====================

  adjustStock(productId: string, quantity: number, reason: string, userId: string): any {
    const product = this.getProductById(productId);
    const previousQty = product.stock_quantity;
    const newQty = previousQty + quantity;

    const movementId = uuidv4();
    
    this.db!.prepare(`
      INSERT INTO stock_movements (id, product_id, user_id, type, quantity, previous_qty, new_qty, reason, sync_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(movementId, productId, userId, quantity > 0 ? 'in' : 'adjustment', Math.abs(quantity), previousQty, newQty, reason, uuidv4());

    this.updateProductStock(productId, quantity);

    return this.db!.prepare('SELECT * FROM stock_movements WHERE id = ?').get(movementId);
  }

  // ==================== SETTINGS ====================

  getSetting(key: string): any {
    return this.db!.prepare('SELECT * FROM settings WHERE key = ?').get(key);
  }

  setSetting(key: string, value: string): any {
    const existing = this.getSetting(key);
    
    if (existing) {
      this.db!.prepare(`
        UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP, sync_status = 'pending'
        WHERE key = ?
      `).run(value, key);
    } else {
      this.db!.prepare(`
        INSERT INTO settings (id, key, value, sync_id)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), key, value, uuidv4());
    }

    return this.getSetting(key);
  }

  getAllSettings(): any[] {
    return this.db!.prepare('SELECT * FROM settings').all();
  }

  // ==================== REPORTS ====================

  getSalesSummary(startDate: string, endDate: string): any {
    return this.db!.prepare(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(total_amount) as total_sales,
        SUM(tax_amount) as total_tax,
        SUM(discount_amount) as total_discounts,
        AVG(total_amount) as average_sale,
        SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) as cash_sales,
        SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END) as card_sales,
        SUM(CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END) as transfer_sales
      FROM sales 
      WHERE created_at >= ? AND created_at <= ? AND status = 'completed'
    `).get(startDate, endDate);
  }

  getTopProducts(startDate: string, endDate: string, limit: number = 10): any[] {
    return this.db!.prepare(`
      SELECT 
        si.product_id,
        si.product_name,
        SUM(si.quantity) as total_quantity,
        SUM(si.total) as total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= ? AND s.created_at <= ? AND s.status = 'completed'
      GROUP BY si.product_id
      ORDER BY total_revenue DESC
      LIMIT ?
    `).all(startDate, endDate, limit);
  }

  getHourlySalesBreakdown(date: string): any[] {
    return this.db!.prepare(`
      SELECT 
        strftime('%H', created_at) as hour,
        COUNT(*) as transactions,
        SUM(total_amount) as sales
      FROM sales 
      WHERE date(created_at) = ? AND status = 'completed'
      GROUP BY strftime('%H', created_at)
      ORDER BY hour
    `).all(date);
  }

  // ==================== SYNC ====================

  getPendingSyncItems(): any[] {
    return this.db!.prepare(`
      SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at LIMIT 100
    `).all();
  }

  addToSyncQueue(tableName: string, recordId: string, operation: string, data: any): void {
    this.db!.prepare(`
      INSERT INTO sync_queue (id, table_name, record_id, operation, data)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), tableName, recordId, operation, JSON.stringify(data));
  }

  updateSyncQueueItem(id: string, status: string, error?: string): void {
    this.db!.prepare(`
      UPDATE sync_queue SET status = ?, last_error = ?, processed_at = CURRENT_TIMESTAMP, attempts = attempts + 1
      WHERE id = ?
    `).run(status, error, id);
  }

  // ==================== EXPORT/IMPORT ====================

  async exportData(exportPath: string): Promise<boolean> {
    try {
      const data = {
        categories: this.getCategories(),
        products: this.getProducts(),
        customers: this.getCustomers(),
        settings: this.getAllSettings(),
        exportedAt: new Date().toISOString(),
      };

      fs.writeFileSync(path.join(exportPath, 'kutunza-backup.json'), JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      return false;
    }
  }

  async importData(importPath: string): Promise<boolean> {
    // Implementation for importing data
    return true;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
  }
}

export { Database };
