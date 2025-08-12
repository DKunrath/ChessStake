"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "./use-auth"
import { supabase } from "@/lib/supabase/client"

interface WalletContextType {
  wallet: {
    address: string | null
    balance: number
    isConnected: boolean
  } | null
  walletAddress: string | null
  balance: number
  isConnected: boolean
  isLoading: boolean
  transactions: Array<{
    id: string
    type: 'deposit' | 'withdrawal' | 'bet' | 'win'
    amount: number
    status: 'pending' | 'completed' | 'failed'
    createdAt: string
    hash?: string
  }>
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  updateBalance: () => Promise<void>
  depositUSDC: (amount: number) => Promise<void>
  fetchWallet: () => Promise<void>
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
  const [transactions, setTransactions] = useState<Array<{
    id: string
    type: 'deposit' | 'withdrawal' | 'bet' | 'win'
    amount: number
    status: 'pending' | 'completed' | 'failed'
    createdAt: string
    hash?: string
  }>>([])

  // Create wallet object for components that expect it
  const wallet = walletAddress ? {
    address: walletAddress,
    balance,
    isConnected
  } : null

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

      // Fetch transactions (mock data for now)
      setTransactions([
        {
          id: '1',
          type: 'deposit',
          amount: 100,
          status: 'completed',
          createdAt: new Date().toISOString(),
          hash: '0x123...'
        },
        {
          id: '2',
          type: 'bet',
          amount: 50,
          status: 'completed',
          createdAt: new Date().toISOString()
        }
      ])
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

  // Deposit USDC (mock implementation)
  const depositUSDC = async (amount: number) => {
    try {
      setIsLoading(true)
      setError(null)

      // Mock deposit process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update balance
      setBalance(prev => prev + amount)

      // Add transaction
      const newTransaction = {
        id: Date.now().toString(),
        type: 'deposit' as const,
        amount,
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
        hash: '0x' + Math.random().toString(16).substr(2, 40)
      }
      setTransactions(prev => [newTransaction, ...prev])

    } catch (err) {
      console.error("Error depositing USDC:", err)
      setError("Erro ao depositar USDC")
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
    wallet,
    walletAddress,
    balance,
    isConnected,
    isLoading,
    transactions,
    connectWallet,
    disconnectWallet,
    updateBalance,
    depositUSDC,
    fetchWallet,
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
