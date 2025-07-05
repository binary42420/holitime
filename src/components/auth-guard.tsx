'use client';

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect if we're still loading or already on login page
    if (isLoading || pathname === "/login") {
      return
    }

    // Redirect to login if not authenticated
    if (!user) {
      router.push("/login")
      return
    }
  }, [user, isLoading, router, pathname])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render children if not authenticated (will redirect)
  if (!user && pathname !== "/login") {
    return null
  }

  return <>{children}</>
}
