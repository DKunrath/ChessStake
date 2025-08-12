"use client"

import { useState, useEffect, useCallback } from "react"
import { Chess } from "chess.js"
import { supabase } from "@/lib/supabase/client"
import type { Square } from "chess.js"

interface UseChessGameReturn {
  fen: string
  selected: Square | null
  legalMoves: Square[]
  error: string | null
  handleSquareClick: (square: Square) => void
  handlePieceDrop: (from: Square, to: Square) => boolean
}

export function useChessGame(
  gameId: string,
  userId: string,
  initialFen: string,
  currentPlayer: "white" | "black",
): UseChessGameReturn {
  const [chess] = useState(() => new Chess(initialFen))
  const [selected, setSelected] = useState<Square | null>(null)
  const [legalMoves, setLegalMoves] = useState<Square[]>([])
  const [error, setError] = useState<string | null>(null)

  // Update chess position when initialFen changes
  useEffect(() => {
    try {
      chess.load(initialFen)
      setError(null)
    } catch (err) {
      setError("Invalid board position")
    }
  }, [initialFen, chess])

  // Subscribe to game updates
  useEffect(() => {
    if (!gameId) return

    const channel = supabase
      .channel(`game_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.new && payload.new.board_state) {
            try {
              chess.load(payload.new.board_state)
              setError(null)
            } catch (err) {
              setError("Failed to update board position")
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, chess])

  const makeMove = useCallback(
    async (from: Square, to: Square) => {
      if (!gameId || !userId) {
        setError("Game not initialized")
        return false
      }

      try {
        // Try the move
        const move = chess.move({ from, to })
        if (!move) {
          setError("Invalid move")
          return false
        }

        const newFen = chess.fen()
        const moveNumber = chess.history().length

        // Check game status
        let gameStatus = "active"
        let winner = null

        if (chess.isGameOver()) {
          gameStatus = "completed"
          if (chess.isCheckmate()) {
            winner = currentPlayer === "white" ? "black" : "white"
          } else {
            winner = "draw"
          }
        }

        // Save move to database
        const { error: moveError } = await supabase.from("moves").insert({
          game_id: gameId,
          player_id: userId,
          from_square: from,
          to_square: to,
          piece: move.piece,
          promotion: move.promotion,
          capture: !!move.captured,
          checkf: chess.inCheck(),
          checkmate: chess.isCheckmate(),
          fen_after: newFen,
          move_number: moveNumber,
        })

        if (moveError) {
          chess.undo()
          setError("Failed to save move")
          return false
        }

        // Update game state
        const { error: gameError } = await supabase
          .from("games")
          .update({
            board_state: newFen,
            current_player: currentPlayer === "white" ? "black" : "white",
            state: gameStatus,
            winner,
            updated_at: new Date().toISOString(),
          })
          .eq("id", gameId)

        if (gameError) {
          chess.undo()
          setError("Failed to update game")
          return false
        }

        setError(null)
        return true
      } catch (err) {
        chess.undo()
        setError(err instanceof Error ? err.message : "Move failed")
        return false
      }
    },
    [gameId, userId, currentPlayer, chess],
  )

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (selected) {
        if (selected === square) {
          // Deselect
          setSelected(null)
          setLegalMoves([])
        } else {
          // Try to make move
          makeMove(selected, square).then((success) => {
            if (success) {
              setSelected(null)
              setLegalMoves([])
            }
          })
        }
      } else {
        // Select piece
        const piece = chess.get(square)
        if (
          piece &&
          ((currentPlayer === "white" && piece.color === "w") || (currentPlayer === "black" && piece.color === "b"))
        ) {
          setSelected(square)
          const moves = chess.moves({ square, verbose: true })
          setLegalMoves(moves.map((move) => move.to as Square))
        }
      }
    },
    [selected, chess, currentPlayer, makeMove],
  )

  const handlePieceDrop = useCallback(
    (from: Square, to: Square) => {
      makeMove(from, to).then((success) => {
        if (success) {
          setSelected(null)
          setLegalMoves([])
        }
      })
      return true
    },
    [makeMove],
  )

  return {
    fen: chess.fen(),
    selected,
    legalMoves,
    error,
    handleSquareClick,
    handlePieceDrop,
  }
}
