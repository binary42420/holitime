'use client';

import { useUser } from '@/hooks/use-user';

export default function ClientDashboard() {
  const { user } = useUser();

  return (
    <div>
      <h1>Client Dashboard</h1>
      <p>Welcome, {user?.name}!</p>
    </div>
  );
}