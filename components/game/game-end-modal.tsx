"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Coins, TrendingUp, TrendingDown } from "lucide-react"
import { calculateNetWinnings } from "@/lib/game-utils"

interface GameEndModalProps {
  isOpen: boolean
  winner: "white" | "black" | "draw" | null
  playerColor: "white" | "black"
  betAmount: number
  gameResult: "win" | "loss" | "draw"
  onClose: () => void
  onPlayAgain?: () => void
  onReturnToLobby: () => void
}

export default function GameEndModal({
  isOpen,
  winner,
  playerColor,
  betAmount,
  gameResult,
  onClose,
  onPlayAgain,
  onReturnToLobby,
}: GameEndModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen && gameResult === "win") {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, gameResult])

  const getResultTitle = () => {
    if (gameResult === "win") return "🎉 Vitória!"
    if (gameResult === "loss") return "😔 Derrota"
    return "🤝 Empate"
  }

  const getResultDescription = () => {
    if (winner === "draw") return "O jogo terminou em empate"
    if (gameResult === "win") return `Você venceu como ${playerColor === "white" ? "Brancas" : "Pretas"}!`
    return `Você perdeu como ${playerColor === "white" ? "Brancas" : "Pretas"}`
  }

  const getTokenChange = () => {
    if (gameResult === "win") {
      const { netWinnings } = calculateNetWinnings(betAmount)
      return netWinnings - betAmount // Ganho líquido após taxa
    }
    if (gameResult === "loss") return -betAmount
    return 0
  }

  const tokenChange = getTokenChange()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-center text-xl">
            {getResultTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-4">
          {/* Resultado Principal */}
          <div className="text-center">
            <div className="mb-4">
              {gameResult === "win" && (
                <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-2" />
              )}
              {gameResult === "loss" && (
                <div className="h-16 w-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">😔</span>
                </div>
              )}
              {gameResult === "draw" && (
                <div className="h-16 w-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">🤝</span>
                </div>
              )}
            </div>
            <p className="text-slate-300 text-sm">{getResultDescription()}</p>
          </div>

          {/* Mudança de Tokens */}
          <Card className="bg-slate-700 border-slate-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coins className="h-5 w-5 text-yellow-400" />
                  <span className="text-white text-sm">Tokens USDC</span>
                </div>
                <div className="flex items-center space-x-2">
                  {tokenChange > 0 && (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        +{tokenChange}
                      </Badge>
                    </>
                  )}
                  {tokenChange < 0 && (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-400" />
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                        {tokenChange}
                      </Badge>
                    </>
                  )}
                  {tokenChange === 0 && (
                    <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/50">
                      0
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {gameResult === "win" && "Você ganhou após taxa da plataforma (10%)!"}
                {gameResult === "loss" && "Você perdeu a aposta."}
                {gameResult === "draw" && "Aposta devolvida devido ao empate."}
              </div>
            </CardContent>
          </Card>

          {/* Detalhes do Jogo */}
          <Card className="bg-slate-700 border-slate-600">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Resultado:</span>
                <span className="text-white">
                  {winner === "white" ? "Vitória das Brancas" : 
                   winner === "black" ? "Vitória das Pretas" : "Empate"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Sua cor:</span>
                <span className="text-white">
                  {playerColor === "white" ? "Brancas" : "Pretas"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Aposta:</span>
                <span className="text-green-400">{betAmount} USDC</span>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="space-y-3">
            {onPlayAgain && (
              <Button 
                onClick={onPlayAgain}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Jogar Novamente
              </Button>
            )}
            <Button 
              onClick={onReturnToLobby}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
