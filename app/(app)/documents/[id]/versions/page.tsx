import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export default async function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect('/auth/login');

  return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">Version History</h1>
      <p className="text-gray-500">
        Version timeline for document <span className="font-mono text-sm">{id}</span>
      </p>
    </div>
  );
}
