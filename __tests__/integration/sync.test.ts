import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Y from 'yjs';

// ── Helpers (mirror server-side helpers) ──────────────────────────────────────
function toB64(arr: Uint8Array): string {
  return Buffer.from(arr).toString('base64');
}

function fromB64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

// ── CRDT merge logic (extracted from sync/route.ts for unit-level testing) ───
function serverMerge(
  serverYjsState: string | undefined,
  clientUpdate: string,
  clientSV?: string,
): { mergedB64: string; diffB64: string | null } {
  const serverDoc = new Y.Doc();

  if (serverYjsState) {
    Y.applyUpdate(serverDoc, fromB64(serverYjsState));
  }

  Y.applyUpdate(serverDoc, fromB64(clientUpdate));

  const mergedB64 = toB64(Y.encodeStateAsUpdate(serverDoc));

  let diffB64: string | null = null;
  if (clientSV) {
    const diff = Y.encodeStateAsUpdate(serverDoc, fromB64(clientSV));
    if (diff.length > 2) diffB64 = toB64(diff);
  }

  serverDoc.destroy();
  return { mergedB64, diffB64 };
}

describe('Sync CRDT merge logic', () => {
  it('merges client update into empty server state', () => {
    const client = new Y.Doc();
    client.getText('content').insert(0, 'Hello from client');

    const update = toB64(Y.encodeStateAsUpdate(client));
    const { mergedB64 } = serverMerge(undefined, update);

    const verify = new Y.Doc();
    Y.applyUpdate(verify, fromB64(mergedB64));
    expect(verify.getText('content').toString()).toBe('Hello from client');

    client.destroy();
    verify.destroy();
  });

  it('server diff contains ops the client was missing', () => {
    const server = new Y.Doc();
    const client = new Y.Doc();

    server.getText('content').insert(0, 'Server line');
    // Client does NOT have server content yet
    client.getText('content').insert(0, 'Client line');

    const clientUpdate = toB64(Y.encodeStateAsUpdate(client));
    const clientSV     = toB64(Y.encodeStateVector(client));
    const serverState  = toB64(Y.encodeStateAsUpdate(server));

    const { diffB64 } = serverMerge(serverState, clientUpdate, clientSV);

    // diff must exist — server had ops client didn't
    expect(diffB64).not.toBeNull();

    // Applying diff to client converges them
    Y.applyUpdate(client, fromB64(diffB64!));
    Y.applyUpdate(server, fromB64(clientUpdate));

    expect(client.getText('content').toString()).toBe(server.getText('content').toString());

    server.destroy();
    client.destroy();
  });

  it('returns null diff when client is up to date', () => {
    const server = new Y.Doc();
    server.getText('content').insert(0, 'Shared content');

    const client = new Y.Doc();
    Y.applyUpdate(client, Y.encodeStateAsUpdate(server));

    const clientUpdate = toB64(Y.encodeStateAsUpdate(client));
    const clientSV     = toB64(Y.encodeStateVector(client));
    const serverState  = toB64(Y.encodeStateAsUpdate(server));

    const { diffB64 } = serverMerge(serverState, clientUpdate, clientSV);

    expect(diffB64).toBeNull();

    server.destroy();
    client.destroy();
  });

  it('merge is deterministic — same inputs always produce same output', () => {
    const client = new Y.Doc();
    client.getText('content').insert(0, 'Deterministic');

    const update = toB64(Y.encodeStateAsUpdate(client));

    const { mergedB64: first }  = serverMerge(undefined, update);
    const { mergedB64: second } = serverMerge(undefined, update);

    // Restore both and compare content
    const d1 = new Y.Doc();
    const d2 = new Y.Doc();
    Y.applyUpdate(d1, fromB64(first));
    Y.applyUpdate(d2, fromB64(second));

    expect(d1.getText('content').toString()).toBe(d2.getText('content').toString());

    client.destroy();
    d1.destroy();
    d2.destroy();
  });
});

describe('Rate limiter', () => {
  it('allows requests within the limit', async () => {
    vi.resetModules();
    const { checkSyncLimit } = await import('@/lib/security/rateLimiter');

    const result = checkSyncLimit('user-test-1');
    expect(result.allowed).toBe(true);
  });

  it('blocks requests exceeding the limit', async () => {
    vi.resetModules();
    const { checkSyncLimit } = await import('@/lib/security/rateLimiter');

    // Exhaust the 60-per-minute limit
    for (let i = 0; i < 60; i++) {
      checkSyncLimit('user-test-burst');
    }
    const blocked = checkSyncLimit('user-test-burst');
    expect(blocked.allowed).toBe(false);
  });
});
