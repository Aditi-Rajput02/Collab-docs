import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let session = null;
  try {
    session = await auth();
  } catch (err) {
    console.error('[AppLayout] auth() failed:', err);
    redirect('/auth/login');
  }

  if (!session) redirect('/auth/login');

  return (
    <div className="flex h-screen bg-white">
      {children}
    </div>
  );
}
