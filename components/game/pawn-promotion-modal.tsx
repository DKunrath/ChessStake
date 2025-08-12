"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PawnPromotionModalProps {
  isOpen: boolean
  color: "white" | "black"
  onSelect: (piece: "q" | "r" | "b" | "n") => void
}

const promotionPieces = {
  white: {
    q: { symbol: "♕", name: "Dama" },
    r: { symbol: "♖", name: "Torre" },
    b: { symbol: "♗", name: "Bispo" },
    n: { symbol: "♘", name: "Cavalo" },
  },
  black: {
    q: { symbol: "♛", name: "Dama" },
    r: { symbol: "♜", name: "Torre" },
    b: { symbol: "♝", name: "Bispo" },
    n: { symbol: "♞", name: "Cavalo" },
  },
}

export default function PawnPromotionModal({ isOpen, color, onSelect }: PawnPromotionModalProps) {
  const pieces = promotionPieces[color]

  return (
    <Dialog open={isOpen}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white text-center">Promoção do Peão</DialogTitle>
          <DialogDescription className="text-slate-300 text-center">
            Escolha uma peça para promover seu peão:
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 p-4">
          {Object.entries(pieces).map(([piece, data]) => (
            <button
              key={piece}
              onClick={() => onSelect(piece as "q" | "r" | "b" | "n")}
              className="flex flex-col items-center p-4 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors border border-slate-600 hover:border-slate-500"
            >
              <span className="text-4xl mb-2">{data.symbol}</span>
              <span className="text-white text-sm">{data.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
