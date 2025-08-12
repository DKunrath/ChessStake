"use client"

import { supabase } from "@/lib/supabase/client"

// Configurações da plataforma
const PLATFORM_FEE_PERCENTAGE = 0.10 // 10% de taxa
const PLATFORM_WALLET_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678" // Placeholder - endereço da plataforma

interface GameResult {
  gameId: string
  winnerId?: string
  loserId?: string
  isDraw: boolean
  betAmount: number
  winnerColor: "white" | "black"
  materialAdvantage: number // Diferença de material final
  moveCount: number // Número de movimentos
}

// Função para calcular ganhos líquidos após taxa da plataforma
export function calculateNetWinnings(betAmount: number): {
  totalPot: number
  platformFee: number
  netWinnings: number
  winningsPercentage: number
} {
  const totalPot = betAmount * 2 // Total apostado pelos dois jogadores
  const platformFee = totalPot * PLATFORM_FEE_PERCENTAGE
  const netWinnings = totalPot - platformFee
  const winningsPercentage = ((netWinnings - betAmount) / betAmount) * 100

  return {
    totalPot,
    platformFee,
    netWinnings,
    winningsPercentage
  }
}

// Função para calcular a vantagem material baseada no FEN final
export function calculateMaterialAdvantage(fen: string): number {
  try {
    const pieceValues = { p: 1, r: 5, n: 3, b: 3, q: 9, k: 0 }
    
    // Extrair apenas a parte do tabuleiro do FEN
    const boardPart = fen.split(' ')[0]
    let whiteMaterial = 0
    let blackMaterial = 0
    
    for (const char of boardPart) {
      if ('prnbqk'.includes(char.toLowerCase())) {
        const value = pieceValues[char.toLowerCase() as keyof typeof pieceValues]
        if (char === char.toUpperCase()) {
          whiteMaterial += value
        } else {
          blackMaterial += value
        }
      }
    }
    
    return whiteMaterial - blackMaterial
  } catch {
    return 0
  }
}

// Função para calcular pontos de ELO baseado na qualidade da vitória
export function calculateEloChange(
  materialAdvantage: number,
  moveCount: number,
  isWinner: boolean,
  isDraw: boolean
): number {
  let basePoints = 0
  
  if (isDraw) {
    return 5 // Empate dá poucos pontos
  }
  
  if (!isWinner) {
    return -15 // Derrota sempre perde pontos
  }
  
  // Base para vitória
  basePoints = 20
  
  // Bônus por vantagem material (vitória dominante)
  const materialBonus = Math.min(Math.abs(materialAdvantage), 10) * 2
  
  // Bônus por partida rápida (vitória eficiente)
  const efficiencyBonus = moveCount < 30 ? 10 : moveCount < 50 ? 5 : 0
  
  return basePoints + materialBonus + efficiencyBonus
}

// Função principal para atualizar carteira e ELO após o fim de um jogo
export async function updatePlayerStatsAfterGame(result: GameResult) {
  try {
    // Buscar informações dos jogadores
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select(`
        *,
        white_player:profiles!games_white_player_id_fkey(id, username, elo_rating),
        black_player:profiles!games_black_player_id_fkey(id, username, elo_rating)
      `)
      .eq("id", result.gameId)
      .single()

    if (gameError || !game) {
      throw new Error("Erro ao buscar dados do jogo")
    }

    const whitePlayer = game.white_player
    const blackPlayer = game.black_player

    // Determinar vencedor e perdedor
    let winner, loser
    if (result.isDraw) {
      // Em caso de empate, ambos recebem de volta a aposta (sem taxa)
      await Promise.all([
        updateWallet(whitePlayer.id, 0, 0, 0), // Sem ganho nem perda
        updateWallet(blackPlayer.id, 0, 0, 0),
        updateElo(whitePlayer.id, whitePlayer.elo_rating, 5), // 5 pontos por empate
        updateElo(blackPlayer.id, blackPlayer.elo_rating, 5)
      ])
      return
    }

    if (result.winnerId === whitePlayer.id) {
      winner = whitePlayer
      loser = blackPlayer
    } else {
      winner = blackPlayer
      loser = whitePlayer
    }

    // Calcular ganhos líquidos após taxa da plataforma
    const { netWinnings, platformFee } = calculateNetWinnings(result.betAmount)

    // Calcular mudanças de ELO
    const winnerEloChange = calculateEloChange(
      result.winnerColor === "white" ? result.materialAdvantage : -result.materialAdvantage,
      result.moveCount,
      true,
      false
    )
    
    const loserEloChange = calculateEloChange(
      result.winnerColor === "white" ? -result.materialAdvantage : result.materialAdvantage,
      result.moveCount,
      false,
      false
    )

    // Atualizar carteiras e ELO
    await Promise.all([
      updateWallet(winner.id, netWinnings - result.betAmount, netWinnings - result.betAmount, 0), // Ganha após taxa
      updateWallet(loser.id, -result.betAmount, 0, result.betAmount), // Perde a aposta
      updatePlatformWallet(platformFee), // Taxa para a plataforma
      updateElo(winner.id, winner.elo_rating, winnerEloChange),
      updateElo(loser.id, loser.elo_rating, loserEloChange)
    ])

    console.log(`Jogo finalizado - Vencedor: ${winner.username} (+${winnerEloChange} ELO, +${netWinnings - result.betAmount} USDC)`)
    console.log(`Perdedor: ${loser.username} (${loserEloChange} ELO, -${result.betAmount} USDC)`)
    console.log(`Taxa da plataforma: ${platformFee} USDC`)

  } catch (error) {
    console.error("Erro ao atualizar estatísticas dos jogadores:", error)
    throw error
  }
}

// Função auxiliar para atualizar carteira da plataforma
async function updatePlatformWallet(feeAmount: number) {
  // Por enquanto, apenas logar a taxa coletada
  // Em produção, isso seria transferido para o endereço da plataforma
  console.log(`Taxa da plataforma coletada: ${feeAmount} USDC para ${PLATFORM_WALLET_ADDRESS}`)
  
  // TODO: Implementar transferência real para o endereço da plataforma
  // Pode ser via smart contract ou sistema de carteiras interno
}

// Função auxiliar para atualizar carteira
async function updateWallet(
  userId: string, 
  balanceChange: number, 
  winningsChange: number, 
  lossesChange: number
) {
  const { error } = await supabase.rpc('update_wallet_balance', {
    user_id: userId,
    balance_change: balanceChange,
    winnings_change: winningsChange,
    losses_change: lossesChange
  })

  if (error) {
    // Se a função RPC não existir, fazer update manual
    const { data: wallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (wallet) {
      await supabase
        .from("wallets")
        .update({
          balance_usdc: wallet.balance_usdc + balanceChange,
          total_winnings: wallet.total_winnings + winningsChange,
          total_losses: wallet.total_losses + lossesChange,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
    }
  }
}

// Função auxiliar para atualizar ELO
async function updateElo(userId: string, currentElo: number, eloChange: number) {
  const newElo = Math.max(100, currentElo + eloChange) // ELO mínimo de 100
  
  const { error } = await supabase
    .from("profiles")
    .update({
      elo_rating: newElo,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId)

  if (error) {
    console.error("Erro ao atualizar ELO:", error)
  }
}
