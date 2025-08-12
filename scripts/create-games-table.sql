-- Create games table for storing chess matches
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  white_player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  black_player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  game_status TEXT CHECK (game_status IN ('waiting', 'active', 'finished', 'abandoned')) DEFAULT 'waiting',
  result TEXT CHECK (result IN ('white_wins', 'black_wins', 'draw', 'abandoned')) DEFAULT NULL,
  stake_amount DECIMAL(10,2) DEFAULT 0.00,
  moves JSONB DEFAULT '[]',
  time_control INTEGER DEFAULT 600, -- 10 minutes in seconds
  white_time_left INTEGER DEFAULT 600,
  black_time_left INTEGER DEFAULT 600,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Players can view their own games" ON games
  FOR SELECT USING (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id
  );

CREATE POLICY "Players can update their own games" ON games
  FOR UPDATE USING (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id
  );

CREATE POLICY "Users can create games" ON games
  FOR INSERT WITH CHECK (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id
  );

-- Create trigger for updated_at
CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS games_white_player_idx ON games(white_player_id);
CREATE INDEX IF NOT EXISTS games_black_player_idx ON games(black_player_id);
CREATE INDEX IF NOT EXISTS games_status_idx ON games(game_status);
CREATE INDEX IF NOT EXISTS games_created_at_idx ON games(created_at DESC);
