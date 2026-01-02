# POS Client Integration Guide

## How to Connect Your POS App to the Sync Server

### 1. Get Your Credentials

After deploying the server to Railway, you'll need:

- **Server URL**: `https://your-app.up.railway.app`
- **API Key**: The value you set for `API_KEY` in Railway environment variables
- **Store ID**: A UUID for your store (generate once and use consistently)

### 2. Update POS App Environment

Add to your Electron POS app's `.env`:

```env
VITE_SYNC_SERVER_URL=https://your-app.up.railway.app
VITE_SYNC_API_KEY=your-api-key-from-railway
VITE_STORE_ID=your-store-uuid
```

### 3. Test Connection

From your POS app or using curl:

```bash
curl https://your-app.up.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "database": {
    "connected": true,
    "latency": "15ms"
  }
}
```

### 4. Implement Sync Functions

#### Create a Sync Service (`src/services/syncService.ts`):

```typescript
const SYNC_SERVER_URL = import.meta.env.VITE_SYNC_SERVER_URL;
const API_KEY = import.meta.env.VITE_SYNC_API_KEY;
const STORE_ID = import.meta.env.VITE_STORE_ID;

interface SyncChange {
  tableName: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  syncId: string;
  data?: any;
}

// Push local changes to cloud
export async function pushChanges(changes: SyncChange[]) {
  const response = await fetch(`${SYNC_SERVER_URL}/api/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({
      storeId: STORE_ID,
      changes,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sync push failed: ${response.statusText}`);
  }

  return await response.json();
}

// Pull remote changes from cloud
export async function pullChanges(lastSyncTime?: string) {
  const response = await fetch(`${SYNC_SERVER_URL}/api/sync/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({
      storeId: STORE_ID,
      lastSyncTime,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sync pull failed: ${response.statusText}`);
  }

  return await response.json();
}

// Full sync cycle
export async function performSync() {
  try {
    // 1. Get local changes that haven't been synced
    const localChanges = await getUnsyncedChanges(); // Implement this
    
    // 2. Push local changes
    if (localChanges.length > 0) {
      await pushChanges(localChanges);
      await markChangesSynced(localChanges); // Implement this
    }
    
    // 3. Pull remote changes
    const lastSync = await getLastSyncTime(); // Implement this
    const remoteData = await pullChanges(lastSync);
    
    // 4. Apply remote changes to local database
    await applyRemoteChanges(remoteData.changes); // Implement this
    
    // 5. Update last sync time
    await setLastSyncTime(remoteData.timestamp); // Implement this
    
    return { success: true };
  } catch (error) {
    console.error('Sync failed:', error);
    return { success: false, error };
  }
}
```

### 5. Track Local Changes

Whenever data changes in your POS app, log it for sync:

```typescript
// When creating a product
await db.products.add(newProduct);
await logSyncChange({
  tableName: 'Product',
  recordId: newProduct.id,
  operation: 'create',
  syncId: generateUUID(),
  data: newProduct,
});

// When updating a product
await db.products.update(productId, updates);
await logSyncChange({
  tableName: 'Product',
  recordId: productId,
  operation: 'update',
  syncId: generateUUID(),
  data: { ...product, ...updates },
});

// When deleting (soft delete)
await db.products.update(productId, { isActive: false });
await logSyncChange({
  tableName: 'Product',
  recordId: productId,
  operation: 'delete',
  syncId: generateUUID(),
  data: null,
});
```

### 6. Schedule Auto-Sync

Set up periodic syncing:

```typescript
// Sync every 5 minutes when online
setInterval(async () => {
  if (navigator.onLine) {
    await performSync();
  }
}, 5 * 60 * 1000);

// Sync when coming back online
window.addEventListener('online', () => {
  performSync();
});

// Sync before closing app
window.addEventListener('beforeunload', () => {
  performSync();
});
```

### 7. Handle Sync Conflicts

If your app needs conflict resolution:

```typescript
async function applyRemoteChanges(changes: any) {
  for (const tableName in changes) {
    const records = changes[tableName];
    
    for (const remoteRecord of records) {
      const localRecord = await db[tableName].get(remoteRecord.id);
      
      if (!localRecord) {
        // No local copy, just insert
        await db[tableName].add(remoteRecord);
      } else {
        // Compare timestamps (remoteRecord.updatedAt vs localRecord.updatedAt)
        if (new Date(remoteRecord.updatedAt) > new Date(localRecord.updatedAt)) {
          // Remote is newer, overwrite local
          await db[tableName].put(remoteRecord);
        } else if (new Date(remoteRecord.updatedAt) < new Date(localRecord.updatedAt)) {
          // Local is newer, will be pushed on next sync
          // Do nothing
        } else {
          // Same timestamp, compare by other criteria or log conflict
          console.warn('Sync conflict detected:', remoteRecord.id);
        }
      }
    }
  }
}
```

### 8. Display Sync Status

Show users when last sync occurred:

```typescript
import { useEffect, useState } from 'react';

export function SyncStatus() {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const sync = async () => {
      setSyncing(true);
      try {
        await performSync();
        setLastSync(new Date());
      } finally {
        setSyncing(false);
      }
    };

    // Initial sync
    sync();

    // Periodic sync
    const interval = setInterval(sync, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {syncing ? (
        <span>🔄 Syncing...</span>
      ) : (
        <span>
          ✅ Last synced: {lastSync ? lastSync.toLocaleTimeString() : 'Never'}
        </span>
      )}
    </div>
  );
}
```

### 9. Error Handling

Always handle network errors gracefully:

```typescript
async function performSyncWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await performSync();
    } catch (error) {
      console.error(`Sync attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        // Show user-friendly error
        showNotification('Sync failed. Will retry automatically.');
        return { success: false, error };
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

### 10. Testing Checklist

- [ ] Can connect to server (`/health` returns 200)
- [ ] Can push changes (create, update, delete products)
- [ ] Can pull changes from another POS instance
- [ ] Sync works when offline → online
- [ ] Conflicts are handled correctly
- [ ] Sync indicator shows current status
- [ ] Errors are logged and retried
- [ ] Large datasets sync without timeout
- [ ] Multiple simultaneous syncs don't cause issues

## Important Notes

### Data Structure Requirements

When pushing data to sync server, ensure:

1. **All UUIDs are valid** (use `crypto.randomUUID()`)
2. **Required fields are present** (see Zod schemas in server)
3. **Dates are ISO 8601 format** (`new Date().toISOString()`)
4. **storeId is consistent** across all records

### Performance Tips

1. **Batch Changes**: Push multiple changes in one request
2. **Delta Sync**: Only sync records changed since last sync
3. **Compress Large Datasets**: Consider gzip for large payloads
4. **Background Sync**: Don't block UI during sync
5. **Local-First**: Always save locally first, sync in background

### Security

1. **Never expose API_KEY** in client-side code visible to users
2. **Use HTTPS only** (Railway provides this automatically)
3. **Validate API responses** before applying to local database
4. **Sanitize user inputs** before syncing

## Need Help?

- Server API docs: See [API_REFERENCE.md](./API_REFERENCE.md)
- Server deployment: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- Create an issue on GitHub if you encounter problems
