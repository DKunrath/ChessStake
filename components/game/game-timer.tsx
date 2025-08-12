"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

interface GameTimerProps {
  initialTimeMs: number // Tempo inicial em milissegundos
  isActive: boolean // Se este timer está ativo (é a vez do jogador)
  onTimeUp: () => void // Callback quando o tempo acaba
  gameState: "active" | "completed" // Estado do jogo
}

export default function GameTimer({ initialTimeMs, isActive, onTimeUp, gameState }: GameTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTimeMs)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (gameState === "completed") {
      setIsRunning(false)
      return
    }

    setIsRunning(isActive)
  }, [isActive, gameState])

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 100 // Atualizar a cada 100ms para suavidade
        
        if (newTime <= 0) {
          setIsRunning(false)
          onTimeUp()
          return 0
        }
        
        return newTime
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isRunning, timeLeft, onTimeUp])

  // Formatar tempo em MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Determinar cor baseada no tempo restante
  const getTimeColor = () => {
    const percentage = timeLeft / initialTimeMs
    if (percentage > 0.5) return "text-green-400"
    if (percentage > 0.2) return "text-yellow-400"
    return "text-red-400"
  }

  // Determinar se deve piscar quando tempo está baixo
  const shouldBlink = timeLeft < 30000 && isRunning // Últimos 30 segundos

  return (
    <div className={`flex items-center space-x-2 ${shouldBlink ? 'animate-pulse' : ''}`}>
      <Clock className={`h-4 w-4 ${getTimeColor()}`} />
      <span className={`font-mono text-sm font-semibold ${getTimeColor()}`}>
        {formatTime(timeLeft)}
      </span>
      {isRunning && (
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      )}
    </div>
  )
}
