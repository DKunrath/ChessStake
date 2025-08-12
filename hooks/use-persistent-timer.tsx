"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { GameState } from "@/lib/types/game"

interface UsePersistentTimerProps {
  gameId: string
  playerId: string
  playerColor: "white" | "black"
  onTimeUp: () => void
}

export default function usePersistentTimer({
  gameId,
  playerId,
  playerColor,
  onTimeUp
}: UsePersistentTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isActive, setIsActive] = useState(false)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<number>(Date.now())

  // Load initial game state and calculate current time
  const loadGameState = useCallback(async () => {
    try {
      const { data: game, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single()

      if (error) {
        console.error("Error loading game state:", error)
        return
      }

      setGameState(game)

      console.log(`Loading timer state for ${playerColor}:`, {
        gameId,
        current_player: game.current_player,
        white_time_left: game.white_time_left,
        black_time_left: game.black_time_left,
        last_move_time: game.last_move_time,
        state: game.state
      })

      // Calculate current time left based on last move time
      const currentTimeField = playerColor === "white" ? "white_time_left" : "black_time_left"
      const dbTimeValue = game[currentTimeField]
      
      console.log(`Timer ${playerColor} - loading from DB:`, {
        currentTimeField,
        dbTimeValue,
        type: typeof dbTimeValue,
        timeControl: game.time_control
      })
      
      // Use time_control as fallback if specific time field is null/undefined
      const timeInSeconds = dbTimeValue != null ? dbTimeValue : (game.time_control || 600)
      let currentTimeLeft = timeInSeconds * 1000 // Convert to milliseconds

      console.log(`Timer ${playerColor} - calculated time:`, {
        timeInSeconds,
        currentTimeLeft: currentTimeLeft / 1000
      })

      // Only subtract elapsed time if it's currently this player's turn AND there's a last move time
      if (game.last_move_time && game.current_player === playerColor && game.state === "active") {
        const lastMoveTime = new Date(game.last_move_time).getTime()
        const now = Date.now()
        const elapsedSinceLastMove = now - lastMoveTime
        currentTimeLeft = Math.max(0, currentTimeLeft - elapsedSinceLastMove)
        
        console.log(`Timer ${playerColor} - subtracting elapsed time:`, {
          elapsedSinceLastMove,
          currentTimeLeft: currentTimeLeft / 1000
        })
      }

      setTimeLeft(currentTimeLeft)
      setIsActive(game.current_player === playerColor && game.state === "active")
      lastUpdateRef.current = Date.now()

    } catch (error) {
      console.error("Error in loadGameState:", error)
    }
  }, [gameId, playerColor, supabase])

  // Update timer in database
  const updateTimerInDatabase = useCallback(async (newTimeLeft: number) => {
    try {
      const timeField = playerColor === "white" ? "white_time_left" : "black_time_left"
      const timeInSeconds = Math.ceil(newTimeLeft / 1000)

      // Only update the time field, don't update last_move_time here
      // last_move_time should only be updated when a move is made
      await supabase
        .from("games")
        .update({
          [timeField]: timeInSeconds,
          updated_at: new Date().toISOString()
        })
        .eq("id", gameId)

    } catch (error) {
      console.error("Error updating timer in database:", error)
    }
  }, [gameId, playerColor])

  // Start/stop timer based on game state
  useEffect(() => {
    if (!gameState) return

    const shouldBeActive = gameState.current_player === playerColor && gameState.state === "active"
    
    // Debug logs
    console.log(`Timer ${playerColor}:`, {
      current_player: gameState.current_player,
      playerColor,
      shouldBeActive,
      gameState: gameState.state
    })
    
    setIsActive(shouldBeActive)

    if (shouldBeActive && timeLeft > 0) {
      // Start timer
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 100 // Update every 100ms
          
          if (newTime <= 0) {
            setIsActive(false)
            onTimeUp()
            return 0
          }
          
          return newTime
        })
      }, 100)
    } else {
      // Stop timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [gameState, playerColor, timeLeft, onTimeUp])

  // Persist timer every 5 seconds while active
  useEffect(() => {
    if (!isActive) return

    const persistInterval = setInterval(() => {
      updateTimerInDatabase(timeLeft)
    }, 5000) // Update database every 5 seconds

    return () => clearInterval(persistInterval)
  }, [isActive, timeLeft, updateTimerInDatabase])

  // Subscribe to game changes
  useEffect(() => {
    const channel = supabase
      .channel(`game_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`
        },
        (payload: any) => {
          const updatedGame = payload.new as GameState
          if (updatedGame) {
            console.log(`Timer ${playerColor} - gameState updated via realtime:`, {
              old_current_player: gameState?.current_player,
              new_current_player: updatedGame.current_player,
              old_time_left: gameState?.[playerColor === "white" ? "white_time_left" : "black_time_left"],
              new_time_left: updatedGame[playerColor === "white" ? "white_time_left" : "black_time_left"]
            })
            
            setGameState(updatedGame)
            
            // Reload timer state from the updated game data
            const currentTimeField = playerColor === "white" ? "white_time_left" : "black_time_left"
            const dbTimeValue = updatedGame[currentTimeField]
            const timeInSeconds = dbTimeValue != null ? dbTimeValue : (updatedGame.time_control || 600)
            let newTimeLeft = timeInSeconds * 1000
            
            // Only subtract elapsed time if it's currently this player's turn
            if (updatedGame.last_move_time && updatedGame.current_player === playerColor && updatedGame.state === "active") {
              const lastMoveTime = new Date(updatedGame.last_move_time).getTime()
              const now = Date.now()
              const elapsedSinceLastMove = now - lastMoveTime
              newTimeLeft = Math.max(0, newTimeLeft - elapsedSinceLastMove)
            }
            
            setTimeLeft(newTimeLeft)
            
            // If turn changed, save current timer state
            if (updatedGame.current_player !== playerColor && isActive) {
              updateTimerInDatabase(timeLeft)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, supabase, playerColor, isActive, timeLeft, updateTimerInDatabase])

  // Load initial state
  useEffect(() => {
    loadGameState()
  }, [loadGameState])

  // Handle visibility change (when user comes back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadGameState() // Reload timer state when tab becomes visible
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [loadGameState])

  // Format time display
  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Get color for time display
  const getTimeColor = () => {
    if (!gameState) return "text-slate-400"
    
    const totalTime = gameState.time_control * 1000
    const percentage = timeLeft / totalTime
    
    if (percentage > 0.5) return "text-green-400"
    if (percentage > 0.2) return "text-yellow-400"
    return "text-red-400"
  }

  return {
    timeLeft,
    isActive,
    gameState,
    formatTime: () => formatTime(timeLeft),
    getTimeColor,
    shouldBlink: timeLeft < 30000 && isActive, // Last 30 seconds
    reloadTimer: loadGameState
  }
}
