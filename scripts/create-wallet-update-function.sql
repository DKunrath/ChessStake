-- Função para atualizar saldo da carteira atomicamente
CREATE OR REPLACE FUNCTION update_wallet_balance(
  user_id UUID,
  balance_change DECIMAL DEFAULT 0,
  winnings_change DECIMAL DEFAULT 0,
  losses_change DECIMAL DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar a carteira do usuário
  UPDATE wallets 
  SET 
    balance_usdc = balance_usdc + balance_change,
    total_winnings = total_winnings + winnings_change,
    total_losses = total_losses + losses_change,
    updated_at = NOW()
  WHERE wallets.user_id = update_wallet_balance.user_id;
  
  -- Se a carteira não existir, criar uma nova
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance_usdc, total_winnings, total_losses)
    VALUES (
      update_wallet_balance.user_id,
      GREATEST(0, balance_change),
      GREATEST(0, winnings_change),
      GREATEST(0, losses_change)
    );
  END IF;
END;
$$;
