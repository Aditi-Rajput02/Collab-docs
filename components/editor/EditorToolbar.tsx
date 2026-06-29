'use client';

import type { Editor } from '@tiptap/react';

type Props = { editor: Editor | null };

type ToolBtn = {
  label: string;
  action: () => void;
  active?: boolean;
  disabled?: boolean;
};

export default function EditorToolbar({ editor }: Props) {
  if (!editor) return null;

  const groups: ToolBtn[][] = [
    [
      { label: 'B',   action: () => editor.chain().focus().toggleBold().run(),        active: editor.isActive('bold') },
      { label: 'I',   action: () => editor.chain().focus().toggleItalic().run(),      active: editor.isActive('italic') },
      { label: 'S',   action: () => editor.chain().focus().toggleStrike().run(),      active: editor.isActive('strike') },
      { label: '</>', action: () => editor.chain().focus().toggleCode().run(),         active: editor.isActive('code') },
    ],
    [
      { label: 'H1',  action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
      { label: 'H2',  action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
      { label: 'H3',  action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
    ],
    [
      { label: '• List',  action: () => editor.chain().focus().toggleBulletList().run(),  active: editor.isActive('bulletList') },
      { label: '1. List', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
      { label: '❝',       action: () => editor.chain().focus().toggleBlockquote().run(),  active: editor.isActive('blockquote') },
      { label: '─',       action: () => editor.chain().focus().setHorizontalRule().run() },
    ],
    [
      { label: '↩', action: () => editor.chain().focus().undo().run(), disabled: !editor.can().undo() },
      { label: '↪', action: () => editor.chain().focus().redo().run(), disabled: !editor.can().redo() },
    ],
  ];

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50 flex-wrap">
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-1">
          {gi > 0 && <div className="w-px h-5 bg-gray-300 mx-1" />}
          {group.map((btn) => (
            <button
              key={btn.label}
              onMouseDown={e => { e.preventDefault(); btn.action(); }}
              disabled={btn.disabled}
              className={[
                'px-2.5 py-1 rounded text-sm font-medium transition-colors',
                btn.active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200',
                btn.disabled ? 'opacity-30 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {btn.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
