"use client"

import { useState, useEffect } from "react"
import { Chess } from "chess.js"

interface CapturedPieces {
  white: string[]
  black: string[]
}

// Função para contar peças em uma posição FEN
function countPieces(fen: string) {
  const chess = new Chess(fen)
  const board = chess.board()
  const counts = {
    white: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 },
    black: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 }
  }

  board.forEach(row => {
    row.forEach(square => {
      if (square) {
        const color = square.color === 'w' ? 'white' : 'black'
        counts[color][square.type as keyof typeof counts.white]++
      }
    })
  })

  return counts
}

export function useCapturedPieces(gameId: string, fen: string): CapturedPieces {
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({
    white: [],
    black: [],
  })

  useEffect(() => {
    if (!fen) return

    try {
      // Posição inicial do xadrez
      const initialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
      
      // Contar peças na posição inicial e atual
      const initialCounts = countPieces(initialFen)
      const currentCounts = countPieces(fen)
      
      const captured: CapturedPieces = {
        white: [],
        black: [],
      }

      // Calcular diferenças para peças brancas capturadas
      Object.entries(initialCounts.white).forEach(([piece, initialCount]) => {
        const currentCount = currentCounts.white[piece as keyof typeof currentCounts.white]
        const capturedCount = initialCount - currentCount
        for (let i = 0; i < capturedCount; i++) {
          captured.white.push(piece)
        }
      })

      // Calcular diferenças para peças pretas capturadas
      Object.entries(initialCounts.black).forEach(([piece, initialCount]) => {
        const currentCount = currentCounts.black[piece as keyof typeof currentCounts.black]
        const capturedCount = initialCount - currentCount
        for (let i = 0; i < capturedCount; i++) {
          captured.black.push(piece)
        }
      })

      setCapturedPieces(captured)
    } catch (error) {
      console.error("Error calculating captured pieces:", error)
      setCapturedPieces({ white: [], black: [] })
    }
  }, [gameId, fen])

  return capturedPieces
}
