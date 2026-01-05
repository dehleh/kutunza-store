// IndexedDB for offline data storage using Dexie
import Dexie, { Table } from 'dexie';

export interface LocalProduct {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  sellingPrice: number;
  costPrice: number;
  taxRate: number;
  stockQuantity: number;
  lowStockAlert: number;
  imageUrl?: string;
  isActive: boolean;
  lastSyncAt?: Date;
}

export interface LocalCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  lastSyncAt?: Date;
}

export interface LocalSale {
  id: string;
  receiptNumber: string;
  userId: string;
  sessionId: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  items: any[];
  status: 'pending' | 'completed' | 'synced';
  createdAt: Date;
  syncedAt?: Date;
}

export interface LocalSession {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  openingCash: number;
  closingCash?: number;
  isActive: boolean;
  status: 'pending' | 'synced';
}

export interface SyncQueue {
  id?: number;
  entityType: 'sale' | 'session' | 'inventory';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  createdAt: Date;
  attempts: number;
  lastError?: string;
}

class KutunzaDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  categories!: Table<LocalCategory, string>;
  sales!: Table<LocalSale, string>;
  sessions!: Table<LocalSession, string>;
  syncQueue!: Table<SyncQueue, number>;

  constructor() {
    super('KutunzaPOS');
    
    this.version(1).stores({
      products: 'id, sku, barcode, categoryId, name, isActive',
      categories: 'id, name, sortOrder, isActive',
      sales: 'id, receiptNumber, userId, sessionId, status, createdAt',
      sessions: 'id, userId, isActive, startedAt',
      syncQueue: '++id, entityType, entityId, createdAt, attempts'
    });
  }
}

export const db = new KutunzaDatabase();

// Helper functions
export async function clearAllData() {
  await db.products.clear();
  await db.categories.clear();
  await db.sales.clear();
  await db.sessions.clear();
  await db.syncQueue.clear();
}

export async function getOfflineDataSize() {
  const counts = {
    products: await db.products.count(),
    categories: await db.categories.count(),
    sales: await db.sales.count(),
    sessions: await db.sessions.count(),
    syncQueue: await db.syncQueue.count(),
  };
  return counts;
}

export async function addToSyncQueue(
  entityType: SyncQueue['entityType'],
  entityId: string,
  action: SyncQueue['action'],
  data: any
) {
  await db.syncQueue.add({
    entityType,
    entityId,
    action,
    data,
    createdAt: new Date(),
    attempts: 0,
  });
}

export async function getPendingSyncItems(limit = 50) {
  return await db.syncQueue
    .orderBy('createdAt')
    .limit(limit)
    .toArray();
}

export async function removeSyncItem(id: number) {
  await db.syncQueue.delete(id);
}

export async function incrementSyncAttempts(id: number, error: string) {
  const item = await db.syncQueue.get(id);
  if (item) {
    await db.syncQueue.update(id, {
      attempts: item.attempts + 1,
      lastError: error,
    });
  }
}
