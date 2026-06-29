import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';

function toB64(arr: Uint8Array): string {
  return Buffer.from(arr).toString('base64');
}

function fromB64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

describe('Yjs CRDT merge', () => {
  it('two clients converge after exchanging updates', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    docA.getText('content').insert(0, 'Hello');
    docB.getText('content').insert(0, 'World');

    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));

    expect(docA.getText('content').toString()).toBe(docB.getText('content').toString());

    docA.destroy();
    docB.destroy();
  });

  it('base64 round-trip preserves Yjs state', () => {
    const doc = new Y.Doc();
    doc.getText('content').insert(0, 'Round-trip test');

    const b64 = toB64(Y.encodeStateAsUpdate(doc));
    const restored = new Y.Doc();
    Y.applyUpdate(restored, fromB64(b64));

    expect(restored.getText('content').toString()).toBe('Round-trip test');

    doc.destroy();
    restored.destroy();
  });

  it('state vector returns only missing ops to the client', () => {
    const server = new Y.Doc();
    const client = new Y.Doc();

    // Client syncs server state
    server.getText('content').insert(0, 'Server line');
    Y.applyUpdate(client, Y.encodeStateAsUpdate(server));

    // Both make independent edits
    server.getText('content').insert(11, ' + server-only');
    client.getText('content').insert(11, ' + client-only');

    // Client sends its full state + state vector
    const clientUpdate = Y.encodeStateAsUpdate(client);
    const clientSV     = Y.encodeStateVector(client);

    // Server merges
    Y.applyUpdate(server, clientUpdate);

    // Server diff is only what client was missing
    const diff = Y.encodeStateAsUpdate(server, clientSV);
    expect(diff.length).toBeGreaterThan(2); // server has ops the client didn't

    // Applying diff to client converges both
    Y.applyUpdate(client, diff);
    expect(client.getText('content').toString()).toBe(server.getText('content').toString());

    server.destroy();
    client.destroy();
  });

  it('applying an empty update does not change the document', () => {
    const doc = new Y.Doc();
    doc.getText('content').insert(0, 'Stable');

    const before = doc.getText('content').toString();
    const emptyDoc = new Y.Doc();
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(emptyDoc));

    expect(doc.getText('content').toString()).toBe(before);

    doc.destroy();
    emptyDoc.destroy();
  });

  it('merge is idempotent — applying the same update twice is safe', () => {
    const doc = new Y.Doc();
    const source = new Y.Doc();
    source.getText('content').insert(0, 'Idempotent');

    const update = Y.encodeStateAsUpdate(source);
    Y.applyUpdate(doc, update);
    Y.applyUpdate(doc, update); // duplicate — should not corrupt

    expect(doc.getText('content').toString()).toBe('Idempotent');

    doc.destroy();
    source.destroy();
  });
});
