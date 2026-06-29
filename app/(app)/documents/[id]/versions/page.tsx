import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export default async function VersionsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect('/auth/login');

  return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold mb-4">Version History</h1>
      <p className="text-muted-foreground">
        Version timeline for document <span className="font-mono">{params.id}</span> — coming soon.
      </p>
    </div>
  );
}
