-- Script para corrigir a tabela moves com a coluna checkF

-- Primeiro, verificar se a tabela moves existe
DO $$
BEGIN
    -- Verificar se a tabela moves existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'moves') THEN
        RAISE NOTICE 'Tabela moves já existe. Verificando colunas...';
        
        -- Verificar se a coluna checkF existe
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'moves' AND column_name = 'checkf') THEN
            RAISE NOTICE 'Coluna checkF não encontrada. Adicionando...';
            ALTER TABLE moves ADD COLUMN checkF BOOLEAN DEFAULT FALSE;
        ELSE
            RAISE NOTICE 'Coluna checkF já existe.';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela moves não existe. Criando...';
        
        -- Criar a tabela moves completa
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
        
        RAISE NOTICE 'Tabela moves criada com sucesso.';
    END IF;
END
$$;

-- Verificar as colunas da tabela moves
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'moves'
ORDER BY ordinal_position;
