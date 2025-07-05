'use client';

import { useUser } from "@/hooks/use-user"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  hasAccess: (role: string) => boolean
) {
  return function WithAuth(props: P) {
    const { user, loading } = useUser()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !user) {
        router.push("/login")
      } else if (!loading && user && !hasAccess(user.role)) {
        router.push("/unauthorized")
      }
    }, [user, loading, router])

    if (loading || !user || !hasAccess(user.role)) {
      return <div>Loading...</div> // Or a proper loading spinner
    }

    return <WrappedComponent {...props} />
  }
}
