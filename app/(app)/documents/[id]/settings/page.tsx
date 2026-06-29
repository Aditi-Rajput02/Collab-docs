import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export default async function DocumentSettingsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect('/auth/login');

  return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold mb-4">Document Settings</h1>
      <p className="text-muted-foreground">
        Collaborators and permissions for <span className="font-mono">{params.id}</span> — coming soon.
      </p>
    </div>
  );
}
