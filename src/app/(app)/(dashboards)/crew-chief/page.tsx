'use client';

import { useUser } from '@/hooks/use-user';

export default function CrewChiefDashboard() {
  const { user } = useUser();

  return (
    <div>
      <h1>Crew Chief Dashboard</h1>
      <p>Welcome, {user?.name}!</p>
    </div>
  );
}