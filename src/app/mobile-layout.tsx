'use client';

import { useEffect, useState } from 'react';
import { MobileLayout } from '@/components/mobile-layout';

interface MobileRootLayoutProps {
  children: React.ReactNode;
}

export function MobileRootLayout({ children }: MobileRootLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're in a mobile environment
    const checkMobile = () => {
      const isMobileEnv = process.env.NEXT_PUBLIC_IS_MOBILE === 'true';
      const isCapacitor = !!(window as any).Capacitor;
      const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      setIsMobile(isMobileEnv || isCapacitor || isMobileUA);
    };

    checkMobile();
  }, []);

  // If this is a mobile build, use the mobile layout
  if (isMobile || process.env.NEXT_PUBLIC_IS_MOBILE === 'true') {
    return <MobileLayout>{children}</MobileLayout>;
  }

  // Otherwise, render children normally (for web)
  return <>{children}</>;
}
