'use client';

import { useUser } from '@/hooks/use-user';

export default function ManagerDashboard() {
  const { user } = useUser();

  return (
    <div>
      <h1>Manager Dashboard</h1>
      <p>Welcome, {user?.name}!</p>
    </div>
  );
}