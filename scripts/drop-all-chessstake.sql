-- Script para limpar o banco de dados ChessStake (Supabase)
-- Executar antes de rodar o novo setup-database-fixed.sql

-- Drop triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
DROP TRIGGER IF EXISTS update_game_rooms_updated_at ON game_rooms;
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Drop policies (para cada tabela)
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can insert own wallet" ON wallets;

DROP POLICY IF EXISTS "Users can view all game rooms" ON game_rooms;
DROP POLICY IF EXISTS "Authenticated users can create game rooms" ON game_rooms;
DROP POLICY IF EXISTS "Users can update own game rooms or as opponent" ON game_rooms;
DROP POLICY IF EXISTS "Users can delete own game rooms" ON game_rooms;

DROP POLICY IF EXISTS "Users can view games they participate in" ON games;
DROP POLICY IF EXISTS "Users can insert games they participate in" ON games;
DROP POLICY IF EXISTS "Users can update games they participate in" ON games;

DROP POLICY IF EXISTS "Users can view moves from their games" ON moves;
DROP POLICY IF EXISTS "Users can insert moves in their games" ON moves;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;

DROP POLICY IF EXISTS "Users can view all tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can create tournaments" ON tournaments;

-- Drop tables (ordem para evitar dependências)
DROP TABLE IF EXISTS moves CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS game_rooms CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Pronto para rodar o novo setup-database-fixed.sql
