import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = createServerClient()
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL("/auth?error=callback_failed", request.url))
      }
      
      // Redirect to dashboard after successful authentication
      return NextResponse.redirect(new URL("/dashboard", request.url))
    } catch (error) {
      console.error('Auth callback exception:', error)
      return NextResponse.redirect(new URL("/auth?error=callback_failed", request.url))
    }
  }

  // If no code, redirect to auth
  return NextResponse.redirect(new URL("/auth", request.url))
}
