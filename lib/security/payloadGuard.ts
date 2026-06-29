import * as Y from 'yjs';

export const MAX_SYNC_PAYLOAD = 512 * 1024;      // 512 KB
export const MAX_DOC_SIZE     = 10 * 1024 * 1024; // 10 MB

export class PayloadTooLargeError extends Error {
  status = 413;
  constructor() { super('Payload exceeds 512KB limit'); }
}

export class MalformedUpdateError extends Error {
  status = 422;
  constructor() { super('Malformed Yjs binary update'); }
}

export function assertPayloadSize(bytes: Uint8Array): void {
  if (bytes.byteLength > MAX_SYNC_PAYLOAD) throw new PayloadTooLargeError();
}

export function assertContentLength(req: Request): void {
  const cl = parseInt(req.headers.get('content-length') ?? '0');
  if (cl > MAX_SYNC_PAYLOAD) throw new PayloadTooLargeError();
}

export function assertValidYjsUpdate(update: Uint8Array): void {
  try {
    const testDoc = new Y.Doc();
    Y.applyUpdate(testDoc, update);
    testDoc.destroy();
  } catch {
    throw new MalformedUpdateError();
  }
}

export function assertDocumentSize(currentBytes: number, incomingBytes: number): void {
  if (currentBytes + incomingBytes > MAX_DOC_SIZE) {
    throw new PayloadTooLargeError();
  }
}
