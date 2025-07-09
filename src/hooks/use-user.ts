"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useAppStore } from '@/lib/stores/app-store'
import type { User } from '@/lib/types'

export const useUser = () => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { session: appSession, setSession, setIsLoading } = useAppStore()

  useEffect(() => {
    setSession(session)
    setIsLoading(status === 'loading')
  }, [session, status, setSession, setIsLoading])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        console.error('Login failed:', result.error)
        return false
      }

      return true
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await signOut({ redirect: false })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const user: User | null = appSession?.user
    ? {
        id: appSession.user.id as string,
        email: appSession.user.email!,
        name: appSession.user.name!,
        role: appSession.user.role as any,
        avatar: appSession.user.image || `https://i.pravatar.cc/32?u=${appSession.user.email}`,
        clientCompanyId: appSession.user.clientCompanyId as string | undefined,
      }
    : null

  return {
    user,
    isLoading: status === 'loading',
    login,
    logout,
    refreshUser: async () => {}, // Kept for compatibility, but NextAuth handles this.
  }
}
