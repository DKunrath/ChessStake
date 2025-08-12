"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Crown } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export default function AuthGuard({ 
  children, 
  requireAuth = false, 
  redirectTo 
}: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user && redirectTo) {
        router.replace(redirectTo)
      } else if (!requireAuth && user && redirectTo) {
        router.replace(redirectTo)
      }
    }
  }, [user, loading, requireAuth, redirectTo, router])

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    )
  }

  // Don't render if redirect is needed
  if (requireAuth && !user) {
    return null
  }

  if (!requireAuth && user) {
    return null
  }

  return <>{children}</>
}
