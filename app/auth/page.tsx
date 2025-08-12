import AuthForm from "@/components/auth/auth-form"
import AuthGuard from "@/components/auth/auth-guard"

export default async function AuthPage() {
  return (
    <AuthGuard requireAuth={false} redirectTo="/dashboard">
      <AuthForm />
    </AuthGuard>
  )
}
