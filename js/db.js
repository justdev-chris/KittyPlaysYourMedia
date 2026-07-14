// ============================================
// DB.JS - IndexedDB Wrapper (Save EVERYTHING)
// ============================================

const DB_NAME = 'KittyDB';
const DB_VERSION = 1;

let db = null;

// ----- OPEN DATABASE -----
export function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            
            // Settings store (single record)
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'id' });
            }
            
            // Playlists store
            if (!db.objectStoreNames.contains('playlists')) {
                const store = db.createObjectStore('playlists', { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: true });
            }
            
            // History store
            if (!db.objectStoreNames.contains('history')) {
                const store = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                store.createIndex('fileId', 'fileId', { unique: false });
                store.createIndex('playedAt', 'playedAt', { unique: false });
            }
        };
    });
}

// ----- GENERIC HELPERS -----
function performTransaction(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
        if (!db) {
            openDB().then(() => {
                performTransaction(storeName, mode, callback).then(resolve).catch(reject);
            }).catch(reject);
            return;
        }
        
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = callback(store);
        
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
    });
}

// ----- SETTINGS -----
export function saveSettings(settings) {
    return performTransaction('settings', 'readwrite', (store) => {
        return store.put({ id: 'app_settings', ...settings });
    });
}

export function getSettings() {
    return performTransaction('settings', 'readonly', (store) => {
        return store.get('app_settings');
    });
}

// ----- PLAYLISTS -----
export function savePlaylist(name, files) {
    return performTransaction('playlists', 'readwrite', (store) => {
        // Check if exists
        const index = store.index('name');
        const request = index.get(name);
        
        request.onsuccess = () => {
            if (request.result) {
                // Update existing
                const data = request.result;
                data.files = files;
                data.updatedAt = Date.now();
                store.put(data);
            } else {
                // Create new
                store.add({
                    name: name,
                    files: files,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
        };
        return request;
    });
}

export function getPlaylists() {
    return performTransaction('playlists', 'readonly', (store) => {
        return store.getAll();
    });
}

export function getPlaylist(name) {
    return performTransaction('playlists', 'readonly', (store) => {
        const index = store.index('name');
        return index.get(name);
    });
}

export function deletePlaylist(name) {
    return performTransaction('playlists', 'readwrite', (store) => {
        const index = store.index('name');
        const request = index.get(name);
        
        request.onsuccess = () => {
            if (request.result) {
                store.delete(request.result.id);
            }
        };
        return request;
    });
}

// ----- HISTORY -----
export function addHistory(fileId, fileName, duration, completed = false) {
    return performTransaction('history', 'readwrite', (store) => {
        return store.add({
            fileId: fileId,
            fileName: fileName,
            playedAt: Date.now(),
            duration: duration,
            completed: completed
        });
    });
}

export function getHistory(limit = 50) {
    return performTransaction('history', 'readonly', (store) => {
        const index = store.index('playedAt');
        return index.getAll(null, limit);
    });
}

// ----- INIT -----
export async function initDB() {
    if (!db) {
        await openDB();
    }
    return db;
}

// Auto-init
initDB().catch(console.error);