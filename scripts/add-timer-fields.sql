-- Add timer fields to games table for timer persistence
ALTER TABLE games 
ADD COLUMN time_control INTEGER DEFAULT 600, -- Time control in seconds (10 minutes default)
ADD COLUMN white_time_left INTEGER DEFAULT 600, -- White player time left in seconds
ADD COLUMN black_time_left INTEGER DEFAULT 600, -- Black player time left in seconds
ADD COLUMN last_move_time TIMESTAMP WITH TIME ZONE; -- Timestamp of last move for timer calculations

-- Create index for better performance on timer queries
CREATE INDEX IF NOT EXISTS games_timer_idx ON games(last_move_time, state);

-- Add comment for documentation
COMMENT ON COLUMN games.time_control IS 'Initial time control for the game in seconds';
COMMENT ON COLUMN games.white_time_left IS 'Remaining time for white player in seconds';
COMMENT ON COLUMN games.black_time_left IS 'Remaining time for black player in seconds';
COMMENT ON COLUMN games.last_move_time IS 'Timestamp when the last move was made, used for timer calculations';
