"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"

interface UserStats {
  total_games: number
  wins: number
  losses: number
  draws: number
  win_rate: number
}

export function useUserStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<UserStats>({
    total_games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    win_rate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    const fetchStats = async () => {
      try {
        // Buscar estatísticas dos jogos
        const { data: games, error } = await supabase
          .from("games")
          .select("winner, white_player_id, black_player_id")
          .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
          .eq("state", "completed")

        if (error) {
          console.error("Error fetching user stats:", error)
          return
        }

        let wins = 0
        let losses = 0
        let draws = 0

        games.forEach((game) => {
          const isWhitePlayer = game.white_player_id === user.id
          
          if (game.winner === "draw") {
            draws++
          } else if (
            (game.winner === "white" && isWhitePlayer) ||
            (game.winner === "black" && !isWhitePlayer)
          ) {
            wins++
          } else {
            losses++
          }
        })

        const total_games = games.length
        const win_rate = total_games > 0 ? (wins / total_games) * 100 : 0

        setStats({
          total_games,
          wins,
          losses,
          draws,
          win_rate
        })
      } catch (error) {
        console.error("Error calculating user stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user?.id])

  return { stats, loading }
}
