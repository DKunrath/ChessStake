"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CapturedPiecesProps {
  capturedPieces: {
    white: string[]
    black: string[]
  }
  playerColor: "white" | "black"
}

const pieceSymbols = {
  white: {
    p: "♙", // pawn
    r: "♖", // rook
    n: "♘", // knight
    b: "♗", // bishop
    q: "♕", // queen
    k: "♔", // king
  },
  black: {
    p: "♟", // pawn
    r: "♜", // rook
    n: "♞", // knight
    b: "♝", // bishop
    q: "♛", // queen
    k: "♚", // king
  },
}

// Valores das peças para calcular vantagem material
const pieceValues = {
  p: 1, // pawn
  r: 5, // rook
  n: 3, // knight
  b: 3, // bishop
  q: 9, // queen
  k: 0, // king (não conta para vantagem material)
}

export default function CapturedPieces({ capturedPieces, playerColor }: CapturedPiecesProps) {
  // Calcular vantagem material
  const whiteMaterial = capturedPieces.black.reduce((sum, piece) => sum + pieceValues[piece as keyof typeof pieceValues], 0)
  const blackMaterial = capturedPieces.white.reduce((sum, piece) => sum + pieceValues[piece as keyof typeof pieceValues], 0)
  const materialDifference = whiteMaterial - blackMaterial

  // Ordenar peças capturadas por valor (mais valiosas primeiro)
  const sortPieces = (pieces: string[]) => {
    return pieces.sort((a, b) => pieceValues[b as keyof typeof pieceValues] - pieceValues[a as keyof typeof pieceValues])
  }

  return (
    <div className="space-y-4">
      {/* Peças capturadas do oponente (que eu capturei) */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-slate-300 flex items-center justify-between">
            <span>Suas Capturas</span>
            {materialDifference > 0 && playerColor === "white" && (
              <span className="text-green-400 text-xs">+{materialDifference}</span>
            )}
            {materialDifference < 0 && playerColor === "black" && (
              <span className="text-green-400 text-xs">+{Math.abs(materialDifference)}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1 min-h-[32px] items-center">
            {playerColor === "white" && 
              sortPieces(capturedPieces.black).map((piece, index) => (
                <span key={index} className="text-2xl text-slate-800 drop-shadow-sm bg-white/10 rounded px-1">
                  {pieceSymbols.black[piece as keyof typeof pieceSymbols.black]}
                </span>
              ))
            }
            {playerColor === "black" && 
              sortPieces(capturedPieces.white).map((piece, index) => (
                <span key={index} className="text-2xl text-white drop-shadow-sm bg-black/10 rounded px-1">
                  {pieceSymbols.white[piece as keyof typeof pieceSymbols.white]}
                </span>
              ))
            }
            {((playerColor === "white" && capturedPieces.black.length === 0) ||
              (playerColor === "black" && capturedPieces.white.length === 0)) && (
              <span className="text-slate-500 text-xs italic">Nenhuma captura</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Peças capturadas minhas (que o oponente capturou) */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-slate-300 flex items-center justify-between">
            <span>Capturas do Oponente</span>
            {materialDifference < 0 && playerColor === "white" && (
              <span className="text-red-400 text-xs">+{Math.abs(materialDifference)}</span>
            )}
            {materialDifference > 0 && playerColor === "black" && (
              <span className="text-red-400 text-xs">+{materialDifference}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1 min-h-[32px] items-center">
            {playerColor === "white" && 
              sortPieces(capturedPieces.white).map((piece, index) => (
                <span key={index} className="text-2xl text-white drop-shadow-sm bg-black/10 rounded px-1">
                  {pieceSymbols.white[piece as keyof typeof pieceSymbols.white]}
                </span>
              ))
            }
            {playerColor === "black" && 
              sortPieces(capturedPieces.black).map((piece, index) => (
                <span key={index} className="text-2xl text-slate-800 drop-shadow-sm bg-white/10 rounded px-1">
                  {pieceSymbols.black[piece as keyof typeof pieceSymbols.black]}
                </span>
              ))
            }
            {((playerColor === "white" && capturedPieces.white.length === 0) ||
              (playerColor === "black" && capturedPieces.black.length === 0)) && (
              <span className="text-slate-500 text-xs italic">Nenhuma captura</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
