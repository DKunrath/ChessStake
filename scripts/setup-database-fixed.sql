-- Drop existing tables if they exist
DROP TABLE IF EXISTS moves CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS game_rooms CASCADE;
DROP TABLE IF EXISTS matchmaking_queue CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  elo_rating INT DEFAULT 1000 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy for profiles: Users can view all profiles, but only update their own
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can create their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);


-- Create game_rooms table
CREATE TABLE game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bet_amount NUMERIC(10, 2) NOT NULL,
  min_elo INT,
  max_elo INT,
  time_control JSONB NOT NULL, -- e.g., { "minutes": 10, "increment": 5 }
  state TEXT DEFAULT 'waiting' NOT NULL, -- 'waiting', 'active', 'completed'
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  opponent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for game_rooms
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Policy for game_rooms:
-- Creator can insert
CREATE POLICY "Creator can create game rooms." ON game_rooms FOR INSERT WITH CHECK (auth.uid() = creator_id);
-- Anyone can view waiting rooms
CREATE POLICY "Anyone can view waiting game rooms." ON game_rooms FOR SELECT USING (state = 'waiting' OR creator_id = auth.uid() OR opponent_id = auth.uid());
-- Creator or opponent can update their own room
CREATE POLICY "Creator or opponent can update their game room." ON game_rooms FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = opponent_id);
-- Creator can delete their own room if waiting
CREATE POLICY "Creator can delete their own waiting room." ON game_rooms FOR DELETE USING (auth.uid() = creator_id AND state = 'waiting');


-- Create games table
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE NOT NULL,
  white_player_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  black_player_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_player TEXT DEFAULT 'white' NOT NULL, -- 'white' or 'black'
  board_state TEXT NOT NULL, -- FEN notation
  state TEXT DEFAULT 'active' NOT NULL, -- 'active', 'completed', 'abandoned'
  bet_amount NUMERIC(10, 2) NOT NULL,
  winner TEXT, -- 'white', 'black', 'draw'
  time_control INTEGER DEFAULT 600, -- Time control in seconds (10 minutes default)
  white_time_left INTEGER DEFAULT 600, -- White player time left in seconds
  black_time_left INTEGER DEFAULT 600, -- Black player time left in seconds
  last_move_time TIMESTAMP WITH TIME ZONE, -- Timestamp of last move for timer calculations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for games
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policy for games:
-- Players can insert new games (when room becomes active)
CREATE POLICY "Players can create games for their rooms." ON games FOR INSERT WITH CHECK (auth.uid() = white_player_id OR auth.uid() = black_player_id);
-- Players can view games they are part of
CREATE POLICY "Players can view their games." ON games FOR SELECT USING (auth.uid() = white_player_id OR auth.uid() = black_player_id);
-- Players can update their games
CREATE POLICY "Players can update their games." ON games FOR UPDATE USING (auth.uid() = white_player_id OR auth.uid() = black_player_id);


-- Create moves table
CREATE TABLE moves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  from_square TEXT NOT NULL,
  to_square TEXT NOT NULL,
  piece TEXT NOT NULL,
  promotion TEXT,
  capture BOOLEAN DEFAULT FALSE,
  checkF BOOLEAN DEFAULT FALSE,
  checkmate BOOLEAN DEFAULT FALSE,
  fen_after TEXT NOT NULL,
  move_number INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for moves
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

-- Policy for moves:
-- Players can insert moves for their games
CREATE POLICY "Players can insert moves for their games." ON moves FOR INSERT WITH CHECK (auth.uid() = player_id);
-- Players can view moves for games they are part of
CREATE POLICY "Players can view moves for their games." ON moves FOR SELECT USING (EXISTS (SELECT 1 FROM games WHERE games.id = moves.game_id AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())));


-- Create wallets table
CREATE TABLE wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance_usdc NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
  total_deposited NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
  total_withdrawn NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
  total_winnings NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
  total_losses NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for wallets
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Policy for wallets: Users can view and update their own wallet
CREATE POLICY "Users can view their own wallet." ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own wallet." ON wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own wallet." ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);


-- Create transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'bet', 'win', 'loss'
  amount NUMERIC(10, 2) NOT NULL,
  state TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'completed', 'failed'
  transaction_hash TEXT,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy for transactions: Users can view and insert their own transactions
CREATE POLICY "Users can view their own transactions." ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions." ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);


-- Create matchmaking_queue table
CREATE TABLE matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  bet_amount NUMERIC(10, 2) NOT NULL,
  time_control JSONB NOT NULL,
  min_elo INT,
  max_elo INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for matchmaking_queue
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Policy for matchmaking_queue: Users can insert and delete their own queue entries, view all
CREATE POLICY "Users can insert their own matchmaking queue entry." ON matchmaking_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own matchmaking queue entry." ON matchmaking_queue FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view matchmaking queue entries." ON matchmaking_queue FOR SELECT USING (true);


-- Set up function for new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.email); -- Using email as initial username
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- Set up function for updating updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_rooms_updated_at
BEFORE UPDATE ON game_rooms
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
