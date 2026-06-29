import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-8">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white text-3xl mb-2">
          ⚡
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          CollabDoc
        </h1>
        <p className="text-xl text-gray-500 leading-relaxed">
          Local-first collaborative document editor.<br />
          Works offline. Syncs automatically. Zero data loss.
        </p>
        <div className="flex gap-4 justify-center pt-2">
          <Link
            href="/auth/login"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Get Started
          </Link>
        </div>
        <p className="text-sm text-gray-400 pt-4">
          Built with Next.js 15 · Yjs CRDT · PostgreSQL
        </p>
      </div>
    </main>
  );
}
