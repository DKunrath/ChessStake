-- Add matchmaking_sessions table for automated matchmaking
CREATE TABLE IF NOT EXISTS matchmaking_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('searching', 'matched', 'cancelled')) DEFAULT 'searching',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_matchmaking_sessions_status ON matchmaking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_matchmaking_sessions_user_id ON matchmaking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_matchmaking_sessions_created_at ON matchmaking_sessions(created_at);

-- Enable RLS
ALTER TABLE matchmaking_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own matchmaking sessions" ON matchmaking_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create their own sessions
CREATE POLICY "Users can create own matchmaking sessions" ON matchmaking_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own sessions
CREATE POLICY "Users can update own matchmaking sessions" ON matchmaking_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own sessions
CREATE POLICY "Users can delete own matchmaking sessions" ON matchmaking_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_matchmaking_sessions_updated_at BEFORE UPDATE
  ON matchmaking_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
