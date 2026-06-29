import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export default async function DocumentSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect('/auth/login');

  return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">Document Settings</h1>
      <p className="text-gray-500">
        Collaborators and permissions for <span className="font-mono text-sm">{id}</span>
      </p>
    </div>
  );
}
