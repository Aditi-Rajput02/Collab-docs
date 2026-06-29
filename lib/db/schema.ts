// Schema definitions have moved to lib/db/models/
// This file kept for backwards-compatibility imports only.

export const yjsToBase64 = (data: Uint8Array): string =>
  Buffer.from(data).toString('base64');

export const base64ToYjs = (data: string): Uint8Array =>
  new Uint8Array(Buffer.from(data, 'base64'));
