"use client"

import type { User } from '@/lib/types'
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn, signOut } from 'next-auth/react'

interface UserContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { data: session, status } = useSession()

  // Update user state when session changes
  useEffect(() => {
    if (session?.user) {
      setCurrentUser({
        id: session.user.id as string,
        email: session.user.email!,
        name: session.user.name!,
        role: session.user.role as any,
        avatar: session.user.image || `https://i.pravatar.cc/32?u=${session.user.email}`,
        clientId: session.user.clientId as string || null,
      })
    } else if (status === 'unauthenticated') {
      setCurrentUser(null)
    }
    setIsLoading(status === 'loading')
  }, [session, status])

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

  const refreshUser = async () => {
    // No need to implement - NextAuth handles session refresh
  }

  const value = useMemo(() => ({
    user: currentUser,
    isLoading,
    login,
    logout,
    refreshUser,
  }), [currentUser, isLoading])

  return React.createElement(UserContext.Provider, { value }, children)
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
