"use client"

import { useState, useEffect, useCallback } from "react"
import { Chess, type Square } from "chess.js"
import SimpleChessboard from "./simple-chessboard"
import PawnPromotionModal from "./pawn-promotion-modal"
import { supabase } from "@/lib/supabase/client"
import { calculateMaterialAdvantage, updatePlayerStatsAfterGame } from "@/lib/game-utils"

interface ChessBoardProps {
  gameId: string
  userId: string
  initialFen: string
  currentPlayer: "white" | "black"
  isPlayerTurn: boolean
  onError: (message: string | null) => void
  playerColor: "white" | "black"
  whitePlayerId: string
  blackPlayerId: string
  betAmount: number
}

export default function ChessBoard({
  gameId,
  userId,
  initialFen,
  currentPlayer,
  isPlayerTurn,
  onError,
  playerColor,
  whitePlayerId,
  blackPlayerId,
  betAmount,
}: ChessBoardProps) {
  const [chess] = useState(() => new Chess())
  const [selected, setSelected] = useState<Square | null>(null)
  const [legalMoves, setLegalMoves] = useState<Square[]>([])
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square
    to: Square
  } | null>(null)

  // Update chess position when initialFen changes
  useEffect(() => {
    console.log("ChessBoard: FEN updated to:", initialFen)
    try {
      chess.load(initialFen)
      // Clear selection when board updates from opponent move
      setSelected(null)
      setLegalMoves([])
      onError(null)
    } catch (err) {
      onError("Estado do tabuleiro inválido.")
    }
  }, [initialFen, chess, onError])

  const makeMove = useCallback(
    async (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") => {
      if (!gameId || !userId) {
        onError("Jogo não inicializado.")
        return false
      }

      if (!isPlayerTurn) {
        onError("Não é sua vez de jogar.")
        return false
      }

      try {
        // Check if this is a pawn promotion move
        const piece = chess.get(from)
        const isPromotion = piece?.type === "p" && 
          ((piece.color === "w" && to[1] === "8") || (piece.color === "b" && to[1] === "1"))

        if (isPromotion && !promotion) {
          // Store the move for after promotion selection
          setPendingPromotion({ from, to })
          return false
        }

        // Check if the move is legal before attempting
        const possibleMoves = chess.moves({ square: from, verbose: true })
        const isLegal = possibleMoves.some((move) => move.to === to && (!isPromotion || move.promotion === promotion))

        if (!isLegal) {
          onError("Movimento ilegal.")
          return false
        }

        // Try the move
        const move = chess.move({ from, to, promotion })
        if (!move) {
          onError("Movimento inválido.")
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
            // The current player just made a move that checkmated the opponent, so current player wins
            winner = currentPlayer
          } else if (chess.isDraw()) {
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
          chess.undo() // Revert the move if saving fails
          onError(`Falha ao salvar movimento: ${moveError.message}`)
          return false
        }

        // Update game state
        const { error: gameError } = await supabase
          .from("games")
          .update({
            board_state: newFen,
            current_player: currentPlayer === "white" ? "black" : "white", // Switch turns
            state: gameStatus,
            winner,
            updated_at: new Date().toISOString(),
          })
          .eq("id", gameId)

        if (gameError) {
          chess.undo() // Revert the move if updating game fails
          onError(`Falha ao atualizar jogo: ${gameError.message}`)
          return false
        }

        // Se o jogo terminou, atualizar estatísticas dos jogadores
        if (gameStatus === "completed") {
          try {
            const materialAdvantage = calculateMaterialAdvantage(newFen)
            await updatePlayerStatsAfterGame({
              gameId,
              winnerId: winner === "draw" ? undefined : (winner === "white" ? whitePlayerId : blackPlayerId),
              loserId: winner === "draw" ? undefined : (winner === "white" ? blackPlayerId : whitePlayerId),
              isDraw: winner === "draw",
              betAmount: betAmount,
              winnerColor: winner === "draw" ? "white" : (winner as "white" | "black"),
              materialAdvantage,
              moveCount: moveNumber
            })
          } catch (updateError) {
            console.error("Erro ao atualizar estatísticas:", updateError)
            // Não falhar o movimento por causa disso
          }
        }

        onError(null)
        setPendingPromotion(null) // Clear pending promotion
        return true
      } catch (err) {
        chess.undo() // Ensure move is undone on any error
        onError(err instanceof Error ? err.message : "O movimento falhou.")
        return false
      }
    },
    [gameId, userId, currentPlayer, isPlayerTurn, chess, onError],
  )

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!isPlayerTurn) {
        onError("Não é sua vez de jogar.")
        return
      }

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
          ((playerColor === "white" && piece.color === "w") || (playerColor === "black" && piece.color === "b"))
        ) {
          setSelected(square)
          const moves = chess.moves({ square, verbose: true })
          setLegalMoves(moves.map((move) => move.to as Square))
        } else {
          onError("Selecione uma peça sua.")
        }
      }
    },
    [selected, chess, playerColor, isPlayerTurn, makeMove, onError],
  )

  const handlePieceDrop = useCallback(
    (from: Square, to: Square) => {
      if (!isPlayerTurn) {
        onError("Não é sua vez de jogar.")
        return false
      }
      makeMove(from, to).then((success) => {
        if (success) {
          setSelected(null)
          setLegalMoves([])
        }
      })
      return true
    },
    [isPlayerTurn, makeMove, onError],
  )

  const handlePromotionSelect = useCallback(
    (piece: "q" | "r" | "b" | "n") => {
      if (pendingPromotion) {
        makeMove(pendingPromotion.from, pendingPromotion.to, piece).then((success) => {
          if (success) {
            setSelected(null)
            setLegalMoves([])
          }
        })
      }
    },
    [pendingPromotion, makeMove]
  )

  return (
    <>
      <div className="aspect-square max-w-full mx-auto">
        <SimpleChessboard
          key={chess.fen()} // Force re-render when position changes
          position={chess.fen()}
          onSquareClick={handleSquareClick}
          onPieceDrop={handlePieceDrop}
          boardOrientation={playerColor}
          highlightedSquares={legalMoves}
          selectedSquare={selected}
        />
      </div>
      
      <PawnPromotionModal
        isOpen={!!pendingPromotion}
        color={playerColor}
        onSelect={handlePromotionSelect}
      />
    </>
  )
}
