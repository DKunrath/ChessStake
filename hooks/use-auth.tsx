"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import type { User, AuthState } from "@/lib/types/auth"

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, username: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchUserProfile(session.user)
      } else {
        setState((prev) => ({ ...prev, loading: false }))
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only handle non-initial events to avoid duplication
      if (event !== 'INITIAL_SESSION') {
        if (session?.user) {
          await fetchUserProfile(session.user)
        } else {
          setState({ user: null, loading: false, error: null })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", supabaseUser.id).single()

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist, create one
        const newProfile = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          username: supabaseUser.user_metadata?.username || "",
          full_name: supabaseUser.user_metadata?.full_name || "",
          elo_rating: 1200,
          total_games: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          balance_usdc: 0,
        }

        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .insert(newProfile)
          .select()
          .single()

        if (createError) throw createError

        setState({
          user: createdProfile,
          loading: false,
          error: null,
        })
      } else if (error) {
        throw error
      } else {
        setState({
          user: data,
          loading: false,
          error: null,
        })
      }
    } catch (error) {
      console.error('fetchUserProfile error:', error)
      setState({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch profile",
      })
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: username,
          },
        },
      })

      if (error) throw error
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Sign up failed",
      }))
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      console.log('Attempting sign in for:', email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Sign in error:', error)
        throw error
      }
      
      console.log('Sign in successful:', data)
    } catch (error) {
      console.error('Sign in exception:', error)
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Sign in failed",
      }))
      throw error
    }
  }

  const signInWithMagicLink = async (email: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
      setState((prev) => ({ ...prev, loading: false }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Magic link failed",
      }))
      throw error
    }
  }

  const signOut = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Sign out failed",
      }))
      throw error
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!state.user) return

    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const { data, error } = await supabase.from("profiles").update(updates).eq("id", state.user.id).select().single()

      if (error) throw error

      setState((prev) => ({
        ...prev,
        user: data,
        loading: false,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Update failed",
      }))
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signInWithMagicLink,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
