import { APP_CONFIG } from '../config.js';

/** Stores original ticket Blobs in IndexedDB and manages object URL lifetimes. */
export class TicketMedia {
  constructor() {
    this.urls = new Map();
    this.dbPromise = null;
    this.ephemeral = new Map();
  }
  db() {
    if (!this.dbPromise)
      this.dbPromise = new Promise((resolve) => {
        if (!globalThis.indexedDB) {
          resolve(null);
          return;
        }
        let request;
        try {
          request = indexedDB.open(APP_CONFIG.mediaDbName, 1);
        } catch {
          resolve(null);
          return;
        }
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('tickets'))
            request.result.createObjectStore('tickets');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      });
    return this.dbPromise;
  }
  async read(id) {
    if (this.ephemeral.has(id)) return this.ephemeral.get(id);
    const db = await this.db();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const r = db.transaction('tickets', 'readonly').objectStore('tickets').get(id);
        r.onsuccess = () => resolve(r.result || null);
        r.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  async put(id, blob, temporary = false) {
    if (!temporary) {
      const db = await this.db();
      if (!db) throw new Error('local-media-unavailable');
      await new Promise((resolve, reject) => {
        const tx = db.transaction('tickets', 'readwrite');
        tx.objectStore('tickets').put(blob, id);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } else this.ephemeral.set(id, blob);
    this.revoke(id);
    this.urls.set(id, URL.createObjectURL(blob));
  }
  async remove(id) {
    const temporary = this.ephemeral.has(id),
      db = temporary ? null : await this.db();
    if (db)
      await new Promise((resolve, reject) => {
        const tx = db.transaction('tickets', 'readwrite');
        tx.objectStore('tickets').delete(id);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    this.ephemeral.delete(id);
    this.revoke(id);
  }
  clearTemporary() {
    for (const id of this.ephemeral.keys()) this.revoke(id);
    this.ephemeral.clear();
  }
  revoke(id) {
    if (this.urls.has(id)) URL.revokeObjectURL(this.urls.get(id));
    this.urls.delete(id);
  }
  url(id) {
    return this.urls.get(id) || '';
  }
  async load(tickets) {
    await Promise.all(
      Object.entries(tickets)
        .filter(([, t]) => t.saved && t.kind === 'image')
        .map(async ([id]) => {
          const blob = await this.read(id);
          if (blob) {
            this.revoke(id);
            this.urls.set(id, URL.createObjectURL(blob));
          }
        }),
    );
  }
}
