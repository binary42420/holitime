"use client"

import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/types'

export const useUser = () => {
  const { data: session, status } = useSession()
  const router = useRouter()

  const login = async (email: string, password: string): Promise<boolean> => {
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })
    return !result?.error
  }

  const logout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  const user: User | null = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        avatar: session.user.image,
        clientCompanyId: session.user.clientCompanyId,
      }
    : null

  return {
    user,
    isLoading: status === 'loading',
    login,
    logout,
  }
}
