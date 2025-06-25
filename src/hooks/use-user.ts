"use client"

import type { User, UserRole } from '@/lib/types'
import { mockUsers } from '@/lib/mock-data'
import React, { createContext, useContext, useState, useMemo } from 'react'

interface UserContextType {
  user: User
  setUserRole: (role: UserRole) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User>(mockUsers['Employee'])

  const setUserRole = (role: UserRole) => {
    const newUser = mockUsers[role]
    if (newUser) {
      setCurrentUser(newUser)
    }
  }

  const value = useMemo(() => ({
    user: currentUser,
    setUserRole,
  }), [currentUser])

  return React.createElement(UserContext.Provider, { value }, children)
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
