import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect('/auth/login');

  return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="space-y-2 text-sm text-gray-500">
        <p>Name: {session.user?.name}</p>
        <p>Email: {session.user?.email}</p>
      </div>
    </div>
  );
}
