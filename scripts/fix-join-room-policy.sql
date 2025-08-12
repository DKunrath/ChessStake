-- Remover a política atual de UPDATE
DROP POLICY IF EXISTS "Creator or opponent can update their game room." ON game_rooms;

-- Criar políticas mais específicas
-- 1. Criador pode atualizar sua sala
CREATE POLICY "Creator can update their game room." ON game_rooms 
FOR UPDATE USING (auth.uid() = creator_id);

-- 2. Oponente pode atualizar a sala onde é oponente
CREATE POLICY "Opponent can update their game room." ON game_rooms 
FOR UPDATE USING (auth.uid() = opponent_id);

-- 3. Usuários podem se juntar como oponentes em salas vazias
CREATE POLICY "Users can join as opponents." ON game_rooms 
FOR UPDATE USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() != creator_id 
  AND opponent_id IS NULL
  AND state = 'waiting'
);
