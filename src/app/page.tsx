'use client';

import { useEffect } from 'react';
import { MobileDashboard } from '@/components/mobile-dashboard';
import { MobileRootLayout } from './mobile-layout';

export default function Home() {
  const isMobile = process.env.NEXT_PUBLIC_IS_MOBILE === 'true';

  useEffect(() => {
    // If not mobile, redirect to dashboard
    if (!isMobile && typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  }, [isMobile]);

  // For mobile builds, show the mobile dashboard
  if (isMobile) {
    return (
      <MobileRootLayout>
        <MobileDashboard />
      </MobileRootLayout>
    );
  }

  // For web builds, this will redirect via useEffect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to dashboard...</p>
    </div>
  );
}
