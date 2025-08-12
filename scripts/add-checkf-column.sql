-- Script simples para adicionar a coluna checkF na tabela moves
ALTER TABLE moves ADD COLUMN IF NOT EXISTS checkF BOOLEAN DEFAULT FALSE;
