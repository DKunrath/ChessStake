"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "./use-auth"
import { supabase } from "@/lib/supabase/client"

interface WalletContextType {
  walletAddress: string | null
  balance: number
  isConnected: boolean
  isLoading: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  updateBalance: () => Promise<void>
  error: string | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch wallet data from database
  const fetchWallet = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", user.id)
        .single()

      if (profileError) {
        // Se a coluna não existe, não é um erro crítico
        if (profileError.code === "42703") {
          console.warn("wallet_address column does not exist yet")
          return
        }
        console.error("Error loading profile:", profileError)
        return
      }

      if (profileData?.wallet_address) {
        setWalletAddress(profileData.wallet_address)
        setIsConnected(true)
        // Aqui você pode buscar o saldo real da blockchain
        setBalance(1000) // Mock balance
      }
    } catch (err) {
      console.error("Error fetching wallet:", err)
      setError("Erro ao carregar carteira")
    } finally {
      setIsLoading(false)
    }
  }

  // Connect wallet (mock implementation)
  const connectWallet = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Mock wallet connection
      const mockAddress = "0x" + Math.random().toString(16).substr(2, 40)

      // Save to database
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ wallet_address: mockAddress })
        .eq("id", user?.id)

      if (updateError) {
        // Se a coluna não existe, não é um erro crítico
        if (updateError.code === "42703") {
          console.warn("wallet_address column does not exist yet")
          // Ainda assim, definir localmente para funcionalidade mock
          setWalletAddress(mockAddress)
          setIsConnected(true)
          setBalance(1000)
          return
        }
        throw updateError
      }

      setWalletAddress(mockAddress)
      setIsConnected(true)
      setBalance(1000) // Mock balance
    } catch (err) {
      console.error("Error connecting wallet:", err)
      setError("Erro ao conectar carteira")
    } finally {
      setIsLoading(false)
    }
  }

  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletAddress(null)
    setIsConnected(false)
    setBalance(0)
    setError(null)
  }

  // Update balance (mock implementation)
  const updateBalance = async () => {
    if (!isConnected) return

    try {
      setIsLoading(true)
      // Mock balance update
      setBalance(Math.floor(Math.random() * 10000))
    } catch (err) {
      console.error("Error updating balance:", err)
      setError("Erro ao atualizar saldo")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchWallet()
    } else {
      // Reset wallet state when user logs out
      setWalletAddress(null)
      setIsConnected(false)
      setBalance(0)
      setError(null)
    }
  }, [user])

  const value: WalletContextType = {
    walletAddress,
    balance,
    isConnected,
    isLoading,
    connectWallet,
    disconnectWallet,
    updateBalance,
    error,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
