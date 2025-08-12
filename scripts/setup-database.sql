-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  white_player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  black_player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  current_player TEXT NOT NULL DEFAULT 'white' CHECK (current_player IN ('white', 'black')),
  board_state TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
  bet_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  winner TEXT CHECK (winner IN ('white', 'black', 'draw')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create moves table
CREATE TABLE IF NOT EXISTS moves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  from_square TEXT NOT NULL,
  to_square TEXT NOT NULL,
  piece TEXT NOT NULL,
  promotion TEXT,
  capture BOOLEAN DEFAULT FALSE,
  check BOOLEAN DEFAULT FALSE,
  checkmate BOOLEAN DEFAULT FALSE,
  fen_after TEXT NOT NULL,
  move_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_rooms table
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bet_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_elo INTEGER,
  max_elo INTEGER,
  time_control TEXT NOT NULL DEFAULT '10+0',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'full', 'active')),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  entry_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  prize_pool DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_participants INTEGER NOT NULL DEFAULT 16,
  current_participants INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'registration' CHECK (status IN ('registration', 'active', 'completed')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallets table (extend profiles with wallet functionality)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance_usdc DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_deposited DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_withdrawn DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_winnings DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_losses DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win', 'loss')),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  transaction_hash TEXT,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_players ON games(white_player_id, black_player_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_player_id ON moves(player_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for games
CREATE POLICY "Users can view games they participate in" ON games
  FOR SELECT USING (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id OR
    status = 'active' -- Allow spectating active games
  );

CREATE POLICY "Users can create games" ON games
  FOR INSERT WITH CHECK (auth.uid() = white_player_id);

CREATE POLICY "Players can update their games" ON games
  FOR UPDATE USING (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id
  );

-- Create policies for moves
CREATE POLICY "Users can view moves for their games" ON moves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = moves.game_id 
      AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
    )
  );

CREATE POLICY "Players can insert moves in their games" ON moves
  FOR INSERT WITH CHECK (
    auth.uid() = player_id AND
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = moves.game_id 
      AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
      AND games.status = 'active'
    )
  );

-- Create policies for wallets
CREATE POLICY "Users can view their own wallet" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert wallets" ON wallets
  FOR INSERT WITH CHECK (true);

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions" ON transactions
  FOR INSERT WITH CHECK (true);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_games_updated_at 
  BEFORE UPDATE ON games 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at 
  BEFORE UPDATE ON wallets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
