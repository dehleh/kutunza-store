import { Database } from './database';
import { net } from 'electron';

export class SyncService {
  private database: Database;
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private lastSyncTime: Date | null = null;
  private syncUrl: string = '';

  constructor(database: Database) {
    this.database = database;
    this.checkOnlineStatus();
  }

  async start(): Promise<void> {
    // Get sync settings
    const syncEnabled = await this.database.getSetting('cloudSyncEnabled');
    const syncUrl = await this.database.getSetting('cloudSyncUrl');
    const syncInterval = await this.database.getSetting('autoSyncInterval');

    if (syncEnabled?.value === 'true' && syncUrl?.value) {
      this.syncUrl = syncUrl.value;
      const intervalMs = parseInt(syncInterval?.value || '300') * 1000;

      // Start periodic sync
      this.syncInterval = setInterval(() => {
        this.syncNow();
      }, intervalMs);

      // Initial sync
      this.syncNow();
    }

    // Monitor online status
    setInterval(() => {
      this.checkOnlineStatus();
    }, 10000);
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private checkOnlineStatus(): void {
    this.isOnline = net.isOnline();
  }

  async queueSync(tableName: string, recordId: string, operation: string, data: any): Promise<void> {
    this.database.addToSyncQueue(tableName, recordId, operation, data);
    
    // Try immediate sync if online
    if (this.isOnline && !this.isSyncing) {
      this.syncNow();
    }
  }

  async syncNow(): Promise<{ success: boolean; synced: number; errors: number }> {
    if (!this.isOnline || this.isSyncing || !this.syncUrl) {
      return { success: false, synced: 0, errors: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let errors = 0;

    try {
      const pendingItems = this.database.getPendingSyncItems();
      const storeId = await this.getStoreId();

      if (pendingItems.length === 0) {
        this.lastSyncTime = new Date();
        return { success: true, synced: 0, errors: 0 };
      }

      // Batch sync - send all changes at once
      const changes = pendingItems.map((item: any) => ({
        tableName: item.table_name,
        recordId: item.record_id,
        operation: item.operation,
        data: JSON.parse(item.data),
        syncId: item.id,
      }));

      const response = await fetch(`${this.syncUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId,
          changes,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        synced = result.results.success || 0;
        errors = result.results.failed || 0;

        // Mark successfully synced items
        for (const item of pendingItems) {
          if (result.results.success > 0) {
            this.database.markSyncItemProcessed(item.id);
          }
        }

        this.lastSyncTime = new Date();
      } else {
        console.error('Sync failed:', response.statusText);
        errors = pendingItems.length;
      }
    } catch (error) {
      console.error('Sync error:', error);
      errors = 1;
    } finally {
      this.isSyncing = false;
    }

    return { success: errors === 0, synced, errors };
  }

  private async getStoreId(): Promise<string> {
    let storeSetting = await this.database.getSetting('storeId');
    
    if (!storeSetting) {
      // Generate store ID on first sync
      const storeId = require('uuid').v4();
      await this.database.setSetting('storeId', storeId);
      return storeId;
    }
    
    return storeSetting.value;
  }
            body: JSON.stringify({
              table: item.table_name,
              recordId: item.record_id,
              operation: item.operation,
              data: JSON.parse(item.data),
              timestamp: item.created_at,
            }),
          });

          if (response.ok) {
            this.database.updateSyncQueueItem(item.id, 'completed');
            synced++;
          } else {
            const errorText = await response.text();
            this.database.updateSyncQueueItem(item.id, 'failed', errorText);
            errors++;
          }
        } catch (error: any) {
          this.database.updateSyncQueueItem(item.id, 'failed', error.message);
          errors++;
        }
      }

      this.lastSyncTime = new Date();
      return { success: true, synced, errors };
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, synced, errors };
    } finally {
      this.isSyncing = false;
    }
  }

  getStatus(): {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: string | null;
    pendingCount: number;
  } {
    const pending = this.database.getPendingSyncItems();
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime?.toISOString() || null,
      pendingCount: pending.length,
    };
  }
}
