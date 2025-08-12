export interface UserProfile {
  id: string
  username: string
  elo_rating: number
  created_at: string
  updated_at: string
}

export interface TimeControl {
  type: "bullet" | "blitz" | "rapid" | "classical"
  minutes: number
  increment: number
}

export interface GameState {
  id: string
  room_id: string
  white_player_id: string
  black_player_id: string
  current_player: "white" | "black"
  board_state: string // FEN notation
  state: "active" | "completed" | "abandoned"
  bet_amount: number
  winner?: "white" | "black" | "draw"
  moves: Move[]
  time_control: number // Time in seconds
  white_time_left: number // Time left for white player in seconds
  black_time_left: number // Time left for black player in seconds
  last_move_time?: string // Timestamp of last move for timer calculations
  created_at: string
  updated_at: string
}

export interface Move {
  id: string
  game_id: string
  player_id: string
  from_square: string // Changed from 'from' to 'from_square' to match DB
  to_square: string // Changed from 'to' to 'to_square' to match DB
  piece: string
  promotion?: string
  capture?: boolean
  checkf?: boolean
  checkmate?: boolean
  fen_after: string
  move_number: number
  created_at: string
}

export interface GameRoom {
  id: string
  name: string
  bet_amount: number
  min_elo?: number
  max_elo?: number
  time_control: TimeControl
  state: "waiting" | "full" | "active"
  creator_id: string
  opponent_id?: string // Added opponent_id to GameRoom type
  created_at: string
}

export interface Tournament {
  id: string
  name: string
  description: string
  entry_fee: number
  prize_pool: number
  max_participants: number
  current_participants: number
  state: "registration" | "active" | "completed"
  start_date: string
  end_date?: string
  created_at: string
}

export interface Wallet {
  id: string
  user_id: string
  balance_usdc: number
  total_deposited: number
  total_withdrawn: number
  total_winnings: number
  total_losses: number
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: "deposit" | "withdrawal" | "bet" | "win" | "loss"
  amount: number
  state: "pending" | "completed" | "failed"
  transaction_hash?: string
  game_id?: string
  created_at: string
}
