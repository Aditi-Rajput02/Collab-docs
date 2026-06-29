'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import EditorToolbar from './EditorToolbar';
import SyncStatusDot from '../sync/SyncStatusDot';

type Props = {
  documentId: string;
  title: string;
  userName: string;
};

type SyncState = 'saved' | 'saving' | 'offline' | 'error';

export default function Editor({ documentId, title, userName }: Props) {
  const ydocRef       = useRef<Y.Doc | null>(null);
  const idbRef        = useRef<IndexeddbPersistence | null>(null);
  const saveTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [docTitle, setDocTitle]     = useState(title);
  const [syncState, setSyncState]   = useState<SyncState>('saved');
  const [wordCount, setWordCount]   = useState(0);
  const [idbReady, setIdbReady]     = useState(false);
  const [isOnline, setIsOnline]     = useState(true);

  // Initialise Yjs doc + IndexedDB persistence once
  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const idb = new IndexeddbPersistence(`collab-doc-${documentId}`, ydoc);
    idbRef.current = idb;
    idb.on('synced', () => setIdbReady(true));

    const goOnline  = () => { setIsOnline(true);  scheduleSave(); };
    const goOffline = () => { setIsOnline(false); setSyncState('offline'); };
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    setIsOnline(navigator.onLine);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      idb.destroy();
      ydoc.destroy();
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const scheduleSave = () => {
    if (!navigator.onLine) return;
    setSyncState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => pushToServer(), 1500);
  };

  const pushToServer = async () => {
    try {
      const state = ydocRef.current
        ? Buffer.from(Y.encodeStateAsUpdate(ydocRef.current)).toString('base64')
        : null;

      const res = await fetch(`/api/documents/${documentId}/sync`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ yjsState: state, title: docTitle }),
      });

      setSyncState(res.ok ? 'saved' : 'error');
    } catch {
      setSyncState('error');
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydocRef.current ?? new Y.Doc() }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      CharacterCount,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg max-w-none focus:outline-none min-h-[60vh] px-1',
      },
    },
    onUpdate: ({ editor }) => {
      setWordCount(editor.storage.characterCount?.words() ?? 0);
      scheduleSave();
    },
  }, [idbReady]);

  const saveTitle = async (newTitle: string) => {
    setDocTitle(newTitle);
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
        {/* Left: back + title */}
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
            onChange={e => setDocTitle(e.target.value)}
            onBlur={e  => saveTitle(e.target.value)}
            className="text-sm font-semibold text-gray-900 bg-transparent border-none outline-none min-w-0 truncate max-w-xs"
            placeholder="Untitled Document"
          />
        </div>

        {/* Right: word count + sync */}
        <div className="flex items-center gap-4 text-sm text-gray-400 shrink-0">
          <span>{wordCount} words</span>
          <SyncStatusDot state={syncState} isOnline={isOnline} />
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor canvas */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>Editing as <strong className="text-gray-600">{userName}</strong></span>
        <span>Auto-saved locally · Syncs when online</span>
      </div>
    </div>
  );
}
