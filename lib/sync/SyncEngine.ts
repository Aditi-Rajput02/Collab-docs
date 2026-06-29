'use client';

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';

type SyncState = 'idle' | 'editing' | 'syncing' | 'offline' | 'reconnecting' | 'error';

type SyncEngineOptions = {
  documentId: string;
  userId: string;
  wsUrl: string;
  token: string;
};

export class SyncEngine {
  private ydoc: Y.Doc;
  private idbProvider: IndexeddbPersistence;
  private wsProvider: WebsocketProvider | null = null;
  private state: SyncState = 'idle';
  private queue: Uint8Array[] = [];
  private listeners = new Set<(state: SyncState) => void>();
  private documentId: string;

  constructor(private opts: SyncEngineOptions) {
    this.documentId = opts.documentId;
    this.ydoc = new Y.Doc({ guid: opts.documentId });
    this.idbProvider = new IndexeddbPersistence(`doc-${opts.documentId}`, this.ydoc);
    this.idbProvider.on('synced', () => this.transition('idle'));
  }

  async connect() {
    const { wsUrl, documentId, token } = this.opts;

    this.wsProvider = new WebsocketProvider(wsUrl, documentId, this.ydoc, {
      params: { token },
      connect: navigator.onLine,
    });

    this.wsProvider.on('status', ({ status }: { status: string }) => {
      if (status === 'connected') this.onReconnect();
      if (status === 'disconnected') this.transition('offline');
    });

    this.ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== this) this.handleLocalUpdate(update);
    });

    window.addEventListener('online', () => this.wsProvider?.connect());
    window.addEventListener('offline', () => this.transition('offline'));
  }

  private handleLocalUpdate(update: Uint8Array) {
    this.transition('editing');
    if (!this.wsProvider?.wsconnected) {
      this.queue.push(update);
    }
  }

  private async onReconnect() {
    this.transition('reconnecting');
    try {
      await this.flushQueue();
      await this.fetchServerDelta();
      this.transition('idle');
    } catch {
      this.transition('error');
    }
  }

  private async flushQueue() {
    if (this.queue.length === 0) return;
    const merged = Y.mergeUpdates(this.queue);
    await this.pushToServer(merged);
    this.queue = [];
  }

  private async pushToServer(update: Uint8Array) {
    this.transition('syncing');
    const res = await fetch(`/api/documents/${this.documentId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: update,
    });
    if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
    const { serverUpdate } = await res.json();
    if (serverUpdate) {
      Y.applyUpdate(this.ydoc, new Uint8Array(serverUpdate), this);
    }
  }

  private async fetchServerDelta() {
    const sv = Y.encodeStateVector(this.ydoc);
    await this.pushToServer(sv);
  }

  private transition(next: SyncState) {
    this.state = next;
    this.listeners.forEach(fn => fn(next));
  }

  getYDoc() { return this.ydoc; }
  getState() { return this.state; }
  isOnline() { return this.wsProvider?.wsconnected ?? false; }
  onStateChange(fn: (state: SyncState) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  destroy() {
    this.wsProvider?.destroy();
    this.idbProvider.destroy();
    this.ydoc.destroy();
    this.listeners.clear();
  }
}
