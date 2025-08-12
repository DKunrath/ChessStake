"use client"

import AuthGuard from "@/components/auth/auth-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAuth={true} redirectTo="/auth">
      {children}
    </AuthGuard>
  )
}
