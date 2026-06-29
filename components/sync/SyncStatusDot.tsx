'use client';

type SyncState = 'saved' | 'saving' | 'offline' | 'error';

const CONFIG: Record<SyncState, { color: string; label: string }> = {
  saved:   { color: 'bg-green-500',  label: 'Saved'    },
  saving:  { color: 'bg-yellow-400', label: 'Saving…'  },
  offline: { color: 'bg-gray-400',   label: 'Offline'  },
  error:   { color: 'bg-red-500',    label: 'Sync error' },
};

type Props = { state: SyncState; isOnline: boolean };

export default function SyncStatusDot({ state, isOnline }: Props) {
  const display = !isOnline ? CONFIG.offline : CONFIG[state];

  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${display.color} ${state === 'saving' ? 'animate-pulse' : ''}`} />
      <span className="text-xs text-gray-500">{display.label}</span>
    </div>
  );
}
