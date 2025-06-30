'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MobileDashboard } from '@/components/mobile-dashboard';
import { MobileRootLayout } from './mobile-layout';
import { ClientPortalLanding } from '@/components/client-portal-landing';

export default function Home() {
  const isMobile = process.env.NEXT_PUBLIC_IS_MOBILE === 'true';
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated and not mobile, redirect to dashboard
    if (!isMobile && session && typeof window !== 'undefined') {
      router.push('/dashboard');
    }
  }, [isMobile, session, router]);

  // For mobile builds, show the mobile dashboard
  if (isMobile) {
    return (
      <MobileRootLayout>
        <MobileDashboard />
      </MobileRootLayout>
    );
  }

  // For web builds, show client portal landing if not authenticated
  // or loading screen if checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <ClientPortalLanding />;
  }

  // If authenticated, show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to dashboard...</p>
    </div>
  );
}
