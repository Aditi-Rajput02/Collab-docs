import { describe, it, expect } from 'vitest';

type SyncState = 'saved' | 'saving' | 'offline' | 'error';
type SyncEvent = 'go_offline' | 'go_online' | 'start_save' | 'save_ok' | 'save_fail';

function transition(state: SyncState, event: SyncEvent): SyncState {
  if (event === 'go_offline') return 'offline';
  if (state === 'offline') {
    return event === 'go_online' ? 'saving' : 'offline';
  }
  switch (event) {
    case 'go_online':  return state;
    case 'start_save': return 'saving';
    case 'save_ok':    return 'saved';
    case 'save_fail':  return 'error';
    default:           return state;
  }
}

describe('Sync state machine', () => {
  it('goes offline from any state', () => {
    expect(transition('saved',  'go_offline')).toBe('offline');
    expect(transition('saving', 'go_offline')).toBe('offline');
    expect(transition('error',  'go_offline')).toBe('offline');
  });

  it('starts saving when back online', () => {
    expect(transition('offline', 'go_online')).toBe('saving');
  });

  it('stays offline on other events while offline', () => {
    expect(transition('offline', 'start_save')).toBe('offline');
    expect(transition('offline', 'save_ok')).toBe('offline');
    expect(transition('offline', 'save_fail')).toBe('offline');
  });

  it('transitions to saved on successful sync', () => {
    expect(transition('saving', 'save_ok')).toBe('saved');
  });

  it('transitions to error on failed sync', () => {
    expect(transition('saving', 'save_fail')).toBe('error');
    expect(transition('saved',  'save_fail')).toBe('error');
  });

  it('full happy path: edit → save → saved', () => {
    let s: SyncState = 'saved';
    s = transition(s, 'start_save');
    expect(s).toBe('saving');
    s = transition(s, 'save_ok');
    expect(s).toBe('saved');
  });

  it('full offline-recovery path', () => {
    let s: SyncState = 'saving';
    s = transition(s, 'go_offline');
    expect(s).toBe('offline');
    s = transition(s, 'go_online');
    expect(s).toBe('saving');
    s = transition(s, 'save_ok');
    expect(s).toBe('saved');
  });
});
