"use client"

import { useState } from 'react'
import type { Square } from 'chess.js'
// import ChessPieceSVG from './chess-piece-svg' // Opcional: descomente para usar peças SVG

interface SimpleChessboardProps {
  position: string // FEN string
  onSquareClick?: (square: Square) => void
  onPieceDrop?: (from: Square, to: Square) => boolean
  boardOrientation?: 'white' | 'black'
  highlightedSquares?: Square[]
  selectedSquare?: Square | null
}

// Peças Unicode com melhor styling
const pieceSymbols: Record<string, string> = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
}

export default function SimpleChessboard({
  position,
  onSquareClick,
  onPieceDrop,
  boardOrientation = 'white',
  highlightedSquares = [],
  selectedSquare = null
}: SimpleChessboardProps) {
  const [draggedPiece, setDraggedPiece] = useState<{ piece: string; from: Square } | null>(null)

  // Parse FEN to get board position
  const parseFEN = (fen?: string) => {
    const safeFen = fen && typeof fen === 'string' && fen.includes('/') ? fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const board: (string | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null))
    const rows = safeFen.split(' ')[0].split('/')
    for (let row = 0; row < 8; row++) {
      const fenRow = rows[row]
      let col = 0
      for (const char of fenRow) {
        if (char >= '1' && char <= '8') {
          col += parseInt(char)
        } else {
          const color = char === char.toUpperCase() ? 'w' : 'b'
          const piece = char.toLowerCase()
          board[row][col] = `${color}${piece.toUpperCase()}`
          col++
        }
      }
    }
    
    return board
  }

  const board = parseFEN(position)
  
  // Criar uma versão do tabuleiro baseada na orientação
  const displayBoard = boardOrientation === 'black' 
    ? board.slice().reverse().map(row => row.slice().reverse())
    : board
  
  const getSquareName = (row: number, col: number): Square => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']
    
    if (boardOrientation === 'black') {
      // Para orientação preta, as coordenadas visuais precisam ser mapeadas de volta para as coordenadas reais
      const realRow = 7 - row
      const realCol = 7 - col
      return `${files[realCol]}${ranks[realRow]}` as Square
    }
    return `${files[col]}${ranks[row]}` as Square
  }

  const getSquareColor = (row: number, col: number) => {
    const isLight = (row + col) % 2 === 0
    // Cores inspiradas no chess.com
    return isLight 
      ? 'bg-gradient-to-br from-amber-50 to-orange-100' 
      : 'bg-gradient-to-br from-amber-800 to-orange-900'
  }

  const getCoordinates = () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']
    
    if (boardOrientation === 'black') {
      return {
        files: files.slice().reverse(),
        ranks: ranks.slice().reverse()
      }
    }
    return { files, ranks }
  }

  const isHighlighted = (square: Square) => {
    return highlightedSquares.includes(square)
  }

  const isSelected = (square: Square) => {
    return selectedSquare === square
  }

  const handleSquareClick = (row: number, col: number) => {
    const square = getSquareName(row, col)
    onSquareClick?.(square)
  }

  const handleDragStart = (e: React.DragEvent, row: number, col: number) => {
    const square = getSquareName(row, col)
    const piece = displayBoard[row][col]
    if (piece) {
      setDraggedPiece({ piece, from: square })
      e.dataTransfer.effectAllowed = 'move'
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault()
    if (draggedPiece) {
      const to = getSquareName(row, col)
      const success = onPieceDrop?.(draggedPiece.from, to)
      if (success) {
        // Move was successful
      }
      setDraggedPiece(null)
    }
  }

  return (
    <div className="relative inline-block">
      {/* Tabuleiro principal com coordenadas */}
      <div className="relative bg-amber-900 p-2 rounded-lg shadow-2xl">
        {/* Coordenadas superiores (arquivos) */}
        <div className="flex justify-center mb-1">
          {getCoordinates().files.map((file, index) => (
            <div key={file} className="w-16 h-4 flex items-center justify-center text-amber-100 text-sm font-semibold">
              {file}
            </div>
          ))}
        </div>

        <div className="flex">
          {/* Coordenadas laterais esquerdas (ranks) */}
          <div className="flex flex-col justify-center mr-1">
            {getCoordinates().ranks.map((rank, index) => (
              <div key={rank} className="w-4 h-16 flex items-center justify-center text-amber-100 text-sm font-semibold">
                {rank}
              </div>
            ))}
          </div>

          {/* Tabuleiro */}
          <div className="grid grid-cols-8 gap-0 border-2 border-amber-800 rounded-md overflow-hidden">
            {displayBoard.map((row, rowIndex) =>
              row.map((piece, colIndex) => {
                const square = getSquareName(rowIndex, colIndex)
                const isLightSquare = (rowIndex + colIndex) % 2 === 0
                const baseColor = getSquareColor(rowIndex, colIndex)
                const highlighted = isHighlighted(square)
                const selected = isSelected(square)
                
                let squareColor = baseColor
                let borderClass = ''
                
                if (selected) {
                  squareColor = isLightSquare 
                    ? 'bg-gradient-to-br from-yellow-200 to-yellow-300' 
                    : 'bg-gradient-to-br from-yellow-600 to-yellow-700'
                  borderClass = 'ring-4 ring-yellow-400 ring-inset'
                } else if (highlighted) {
                  squareColor = isLightSquare 
                    ? 'bg-gradient-to-br from-green-200 to-green-300' 
                    : 'bg-gradient-to-br from-green-600 to-green-700'
                }

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`
                      w-16 h-16 flex items-center justify-center cursor-pointer
                      transition-all duration-150 relative group
                      ${squareColor} ${borderClass}
                      hover:brightness-110 hover:scale-105
                    `}
                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                  >
                    {/* Indicador de movimento possível */}
                    {highlighted && !piece && (
                      <div className="w-6 h-6 rounded-full bg-gray-600 bg-opacity-60 shadow-lg"></div>
                    )}
                    
                    {/* Indicador de captura possível */}
                    {highlighted && piece && (
                      <div className="absolute inset-1 border-4 border-gray-600 border-opacity-60 rounded-full shadow-inner"></div>
                    )}

                    {piece && (
                      <div
                        className={`
                          text-5xl select-none cursor-grab active:cursor-grabbing
                          transition-transform duration-150 hover:scale-110 active:scale-95
                          drop-shadow-lg filter
                          ${piece.startsWith('w') ? 'text-white' : 'text-gray-900'}
                          hover:brightness-110 hover:drop-shadow-2xl
                        `}
                        style={{
                          textShadow: piece.startsWith('w') 
                            ? '3px 3px 6px rgba(0,0,0,0.8), -1px -1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)' 
                            : '3px 3px 6px rgba(255,255,255,0.8), -1px -1px 3px rgba(255,255,255,0.6), 0 0 8px rgba(255,255,255,0.4)'
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, rowIndex, colIndex)}
                      >
                        {pieceSymbols[piece] || '?'}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Coordenadas laterais direitas (ranks) */}
          <div className="flex flex-col justify-center ml-1">
            {getCoordinates().ranks.map((rank, index) => (
              <div key={rank} className="w-4 h-16 flex items-center justify-center text-amber-100 text-sm font-semibold">
                {rank}
              </div>
            ))}
          </div>
        </div>

        {/* Coordenadas inferiores (arquivos) */}
        <div className="flex justify-center mt-1">
          {getCoordinates().files.map((file, index) => (
            <div key={file} className="w-16 h-4 flex items-center justify-center text-amber-100 text-sm font-semibold">
              {file}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
