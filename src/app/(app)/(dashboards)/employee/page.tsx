'use client';

import { useUser } from '@/hooks/use-user';

export default function EmployeeDashboard() {
  const { user } = useUser();

  return (
    <div>
      <h1>Employee Dashboard</h1>
      <p>Welcome, {user?.name}!</p>
    </div>
  );
}