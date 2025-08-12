export interface User {
  id: string
  email: string
  username?: string
  full_name?: string
  avatar_url?: string
  elo_rating: number
  total_games: number
  wins: number
  losses: number
  draws: number
  balance_usdc: number
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}
