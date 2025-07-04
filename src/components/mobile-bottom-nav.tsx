'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Calendar, 
  Clock, 
  User, 
  FileText,
  Bell,
  Settings
} from 'lucide-react'

interface NavItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: number
}

interface MobileBottomNavProps {
  className?: string
  pendingApprovals?: number
  notifications?: number
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  className = "",
  pendingApprovals = 0,
  notifications = 0
}) => {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Home'
    },
    {
      href: '/shifts',
      icon: Calendar,
      label: 'Shifts'
    },
    {
      href: '/timesheets',
      icon: Clock,
      label: 'Time',
      badge: pendingApprovals
    },
    {
      href: '/profile',
      icon: User,
      label: 'Profile'
    }
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className={cn(
      "md:hidden fixed bottom-0 left-0 right-0 z-50",
      "bg-white border-t border-gray-200 shadow-lg",
      "safe-area-inset-bottom", // For devices with home indicator
      className
    )}>
      <div className="grid grid-cols-4 gap-1 px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "py-2 px-1 min-h-[60px] rounded-lg",
                "transition-all duration-200 ease-in-out",
                "touch-manipulation", // Optimize for touch
                active 
                  ? "text-primary bg-primary/10" 
                  : "text-gray-600 hover:text-primary hover:bg-gray-50"
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-6 w-6 mb-1 transition-transform duration-200",
                  active ? "scale-110" : "scale-100"
                )} />
                
                {/* Badge for notifications/pending items */}
                {item.badge && item.badge > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </div>
              
              <span className={cn(
                "text-xs font-medium transition-all duration-200",
                active ? "text-primary" : "text-gray-600"
              )}>
                {item.label}
              </span>
              
              {/* Active indicator */}
              {active && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Quick action floating button for common tasks
interface QuickActionButtonProps {
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  className?: string
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  onClick,
  icon: Icon,
  label,
  className = ""
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "md:hidden fixed bottom-20 right-4 z-40",
        "w-14 h-14 bg-primary text-primary-foreground",
        "rounded-full shadow-lg",
        "flex items-center justify-center",
        "transition-all duration-200 ease-in-out",
        "hover:scale-110 active:scale-95",
        "touch-manipulation",
        className
      )}
      aria-label={label}
    >
      <Icon className="h-6 w-6" />
    </button>
  )
}

// Mobile-specific page wrapper that accounts for bottom navigation
interface MobilePageWrapperProps {
  children: React.ReactNode
  className?: string
  hasBottomNav?: boolean
}

export const MobilePageWrapper: React.FC<MobilePageWrapperProps> = ({
  children,
  className = "",
  hasBottomNav = true
}) => {
  return (
    <div className={cn(
      "min-h-screen",
      hasBottomNav ? "pb-16 md:pb-0" : "", // Add bottom padding for nav on mobile
      className
    )}>
      {children}
    </div>
  )
}

// Hook for managing mobile navigation state
export const useMobileNav = () => {
  const pathname = usePathname()
  
  const shouldShowBottomNav = React.useMemo(() => {
    // Hide bottom nav on certain pages
    const hiddenPaths = [
      '/login',
      '/register',
      '/onboarding'
    ]
    
    return !hiddenPaths.some(path => pathname.startsWith(path))
  }, [pathname])
  
  return {
    shouldShowBottomNav,
    currentPath: pathname
  }
}

export default MobileBottomNav
