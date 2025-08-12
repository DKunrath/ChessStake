"use client"

import { Clock } from "lucide-react"
import usePersistentTimer from "@/hooks/use-persistent-timer"

interface PersistentGameTimerProps {
  gameId: string
  playerId: string
  playerColor: "white" | "black"
  onTimeUp: () => void
}

export default function PersistentGameTimer({ 
  gameId, 
  playerId, 
  playerColor, 
  onTimeUp 
}: PersistentGameTimerProps) {
  const {
    isActive,
    formatTime,
    getTimeColor,
    shouldBlink
  } = usePersistentTimer({
    gameId,
    playerId,
    playerColor,
    onTimeUp
  })

  return (
    <div className={`flex items-center space-x-2 ${shouldBlink ? 'animate-pulse' : ''}`}>
      <Clock className={`h-4 w-4 ${getTimeColor()}`} />
      <span className={`font-mono text-sm font-semibold ${getTimeColor()}`}>
        {formatTime()}
      </span>
      {isActive && (
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      )}
    </div>
  )
}
