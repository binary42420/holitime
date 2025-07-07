'use client';

import { useUser } from '@/hooks/use-user';
import QuickStats from '@/components/quick-stats';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export default function EmployeeDashboard() {
  const { user } = useUser();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome, {user?.name}!</h1>
      
      <QuickStats />

      <Card>
        <CardHeader>
          <CardTitle>My Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">View your upcoming and past shifts.</p>
          <Link href="/shifts">
            <Button>
              View My Shifts <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
