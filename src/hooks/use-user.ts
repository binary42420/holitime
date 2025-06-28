"use client"

import type { User } from '@/lib/types'
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

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

  // Check for existing authentication on mount and when session changes
  useEffect(() => {
    checkAuth()
  }, [session, status])

  const checkAuth = async () => {
    try {
      // First check if we have a NextAuth session
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.name!,
          role: session.user.role as any, // Type assertion for NextAuth role
          avatar: session.user.image || `https://i.pravatar.cc/32?u=${session.user.email}`,
          clientId: session.user.clientId || null,
        })
        setIsLoading(false)
        return
      }

      // If no NextAuth session, check for custom JWT token
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store', // Prevent caching of auth checks
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data.user)
      } else {
        // Clear user state on any auth failure
        setCurrentUser(null)

        // If it's a 401, the token is invalid/expired
        if (response.status === 401) {
          console.log('Authentication expired, clearing state')
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setCurrentUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data.user)
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      // Clear user state immediately
      setCurrentUser(null)

      // Clear any cached data and force a hard redirect
      // This prevents stale authentication state
      window.location.href = '/login'
    }
  }

  const refreshUser = async () => {
    await checkAuth()
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
