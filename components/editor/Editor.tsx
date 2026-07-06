'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import EditorToolbar from './EditorToolbar';
import SyncStatusDot from '../sync/SyncStatusDot';

type Props = {
  documentId: string;
  title:      string;
  userName:   string;
};

type SyncState = 'saved' | 'saving' | 'offline' | 'error';

export default function Editor({ documentId, title, userName }: Props) {
  const ydocRef      = useRef<Y.Doc>(new Y.Doc());
  const idbRef       = useRef<IndexeddbPersistence | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docTitleRef  = useRef(title);

  const [docTitle,   setDocTitle]   = useState(title);
  const [syncState,  setSyncState]  = useState<SyncState>('saved');
  const [wordCount,  setWordCount]  = useState(0);
  const [idbReady,   setIdbReady]   = useState(false);
  const [isOnline,   setIsOnline]   = useState(true);

  const updateTitle = (t: string) => {
    setDocTitle(t);
    docTitleRef.current = t;
  };

  // ── Bidirectional sync with server ────────────────────────────────────────
  const pushToServer = useCallback(async () => {
    const ydoc = ydocRef.current;
    if (!navigator.onLine) return;

    setSyncState('saving');
    try {
      const update      = Y.encodeStateAsUpdate(ydoc);
      const stateVector = Y.encodeStateVector(ydoc);

      const toB64 = (arr: Uint8Array) =>
        btoa(Array.from(arr, b => String.fromCharCode(b)).join(''));

      const res = await fetch(`/api/documents/${documentId}/sync`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yjsUpdate:   toB64(update),
          stateVector: toB64(stateVector),
          title:       docTitleRef.current,
        }),
      });

      if (!res.ok) {
        setSyncState('error');
        return;
      }

      const { serverDiff } = await res.json();

      if (serverDiff) {
        const diffBytes = Uint8Array.from(atob(serverDiff), c => c.charCodeAt(0));
        Y.applyUpdate(ydocRef.current, diffBytes);
      }

      setSyncState('saved');
    } catch {
      setSyncState('error');
    }
  }, [documentId]);

  // Debounced save — waits 1.5s after last keystroke
  const scheduleSave = useCallback(() => {
    if (!navigator.onLine) return;
    setSyncState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(pushToServer, 1500);
  }, [pushToServer]);

  // ── Yjs + IndexedDB setup ─────────────────────────────────────────────────
  useEffect(() => {
    const ydoc = ydocRef.current;

    // Persist ALL changes immediately to IndexedDB (offline-first)
    const idb = new IndexeddbPersistence(`collab-doc-${documentId}`, ydoc);
    idbRef.current = idb;

    idb.on('synced', () => {
      setIdbReady(true);
    });

    const handleOnline = () => {
      setIsOnline(true);
      pushToServer();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncState('offline');
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      idb.destroy();
      ydoc.destroy();
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [documentId, pushToServer]);

  // Push any offline edits once IDB has rehydrated and we're online
  useEffect(() => {
    if (idbReady && navigator.onLine) {
      pushToServer();
    }
  }, [idbReady, pushToServer]);

  // ── TipTap editor ────────────────────────────────────────────────────────
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false }),
        // ydocRef.current is always defined now (eager init above)
        Collaboration.configure({ document: ydocRef.current }),
        Placeholder.configure({ placeholder: 'Start writing…' }),
        CharacterCount,
      ],
      editorProps: {
        attributes: {
          class:
            'prose prose-sm sm:prose-base lg:prose-lg max-w-none focus:outline-none min-h-[60vh] px-1',
        },
      },
      onUpdate: ({ editor }) => {
        setWordCount(editor.storage.characterCount?.words() ?? 0);
        scheduleSave();
      },
    },
    [idbReady],
  );

  const saveTitle = async (newTitle: string) => {
    updateTitle(newTitle);
    await fetch(`/api/documents/${documentId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title: newTitle }),
    });
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>

          <span className="text-gray-300 text-lg">/</span>

          <input
            value={docTitle}
            onChange={e => updateTitle(e.target.value)}
            onBlur={e  => saveTitle(e.target.value)}
            className="text-sm font-semibold text-gray-900 bg-transparent border-none outline-none min-w-0 truncate max-w-xs"
            placeholder="Untitled Document"
          />
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-400 shrink-0">
          <span>{wordCount} words</span>
          <SyncStatusDot state={syncState} isOnline={isOnline} />
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {!idbReady ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400 animate-pulse">Loading document…</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-10">
            <EditorContent editor={editor} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>Editing as <strong className="text-gray-600">{userName}</strong></span>
        <span>
          {isOnline
            ? 'Auto-saved locally · Syncs to cloud'
            : 'Offline — saved locally, will sync when online'}
        </span>
      </div>
    </div>
  );
}
