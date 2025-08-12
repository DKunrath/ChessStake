"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import ChessBoard from "@/components/game/chess-board"
import CapturedPieces from "@/components/game/captured-pieces"
import GameEndModal from "@/components/game/game-end-modal"
import PersistentGameTimer from "@/components/game/persistent-game-timer"
import { useCapturedPieces } from "@/hooks/use-captured-pieces"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Clock, Flag, RotateCcw, ArrowLeft } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Game {
  id: string
  room_id: string
  white_player_id: string
  black_player_id: string
  current_player: "white" | "black"
  board_state: string
  state: string
  bet_amount: number
  winner?: string
  created_at: string
}

interface GameRoom {
  id: string
  name: string
  bet_amount: number
  time_control: any
  creator_id: string
  opponent_id: string
  state: string
}

interface UserProfile {
  id: string
  username: string
  elo_rating: number
}

export default function GamePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [game, setGame] = useState<Game | null>(null)
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [whitePlayer, setWhitePlayer] = useState<UserProfile | null>(null)
  const [blackPlayer, setBlackPlayer] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chessError, setChessError] = useState<string | null>(null)
  const [showGameEndModal, setShowGameEndModal] = useState(false)

  const isWhitePlayer = user?.id === game?.white_player_id
  const isBlackPlayer = user?.id === game?.black_player_id
  const isCurrentPlayer =
    (isWhitePlayer && game?.current_player === "white") || (isBlackPlayer && game?.current_player === "black")

  // Debug logs for turn system
  useEffect(() => {
    if (game && user) {
      console.log("Turn system debug:", {
        userId: user.id,
        whitePlayerId: game.white_player_id,
        blackPlayerId: game.black_player_id,
        isWhitePlayer,
        isBlackPlayer,
        currentPlayer: game.current_player,
        isCurrentPlayer
      })
    }
  }, [game?.current_player, user?.id, isWhitePlayer, isBlackPlayer, isCurrentPlayer])

  // Use captured pieces hook
  const capturedPieces = useCapturedPieces(game?.id || "", game?.board_state || "")

  // Determine game result for current player
  const getGameResult = (): "win" | "loss" | "draw" => {
    if (!game?.winner) return "draw"
    if (game.winner === "draw") return "draw"
    if ((game.winner === "white" && isWhitePlayer) || (game.winner === "black" && isBlackPlayer)) {
      return "win"
    }
    return "loss"
  }

  // Calcular tempo de jogo em milissegundos
  const getGameTimeMs = () => {
    const minutes = room?.time_control?.minutes || 10
    return minutes * 60 * 1000 // Converter para milissegundos
  }

  // Função chamada quando o tempo de um jogador acaba
  const handleTimeUp = async (playerColor: "white" | "black") => {
    if (!game || game.state !== "active") return

    try {
      const winner = playerColor === "white" ? "black" : "white"

      const { error } = await supabase
        .from("games")
        .update({
          state: "completed",
          winner: winner,
          updated_at: new Date().toISOString(),
        })
        .eq("id", game.id)

      if (error) throw error

      toast({
        title: "Tempo Esgotado!",
        description: `${playerColor === "white" ? "Brancas" : "Pretas"} perderam por tempo`,
        variant: "destructive",
      })
    } catch (err) {
      console.error("Error ending game by time:", err)
    }
  }

  useEffect(() => {
    if (!roomId || !user) return

    const fetchGameData = async () => {
      try {
        // Buscar dados da sala
        const { data: roomData, error: roomError } = await supabase
          .from("game_rooms")
          .select("*")
          .eq("id", roomId)
          .single()

        if (roomError) {
          setError("Sala não encontrada")
          setLoading(false)
          return
        }

        setRoom(roomData)

        // Buscar jogo ativo para esta sala
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("*")
          .eq("room_id", roomId)
          .eq("state", "active")
          .single()

        if (gameError) {
          // Se não há jogo ativo, redirecionar para o lobby
          if (gameError.code === "PGRST116") {
            router.push(`/lobby/${roomId}`)
            return
          }
          throw gameError
        }

        setGame(gameData)

        // Buscar perfis dos jogadores
        const { data: whitePlayerData } = await supabase
          .from("profiles")
          .select("id, username, elo_rating")
          .eq("id", gameData.white_player_id)
          .single()

        const { data: blackPlayerData } = await supabase
          .from("profiles")
          .select("id, username, elo_rating")
          .eq("id", gameData.black_player_id)
          .single()

        if (whitePlayerData) setWhitePlayer(whitePlayerData)
        if (blackPlayerData) setBlackPlayer(blackPlayerData)

        setLoading(false)
      } catch (err) {
        console.error("Error fetching game data:", err)
        setError(err instanceof Error ? err.message : "Erro ao carregar jogo")
        setLoading(false)
      }
    }

    fetchGameData()

    // Escutar mudanças em tempo real no jogo
    const gameChannel = supabase
      .channel("game_" + roomId)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `room_id=eq.${roomId}` },
        (payload) => {
          console.log("Game update received via realtime:", payload)
          const updatedGame = payload.new as Game
          console.log("Updated game state - current_player:", updatedGame.current_player)
          console.log("Updated game state - board_state:", updatedGame.board_state)
          console.log("Previous game state - current_player:", game?.current_player)
          console.log("Previous game state - board_state:", game?.board_state)
          
          // Check if current_player actually changed
          if (game && game.current_player !== updatedGame.current_player) {
            console.log(`Turn switched from ${game.current_player} to ${updatedGame.current_player}`)
          }
          
          setGame(updatedGame)

          if (updatedGame.state === "completed") {
            const winnerText =
              updatedGame.winner === "white" ? "Brancas" : updatedGame.winner === "black" ? "Pretas" : "Empate"
            toast({
              title: "Jogo Finalizado!",
              description: `Resultado: ${winnerText}`,
            })
            setShowGameEndModal(true)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(gameChannel)
    }
  }, [roomId, user, router])

  const handleResign = async () => {
    if (!game || !user) return

    if (window.confirm("Tem certeza que deseja desistir da partida?")) {
      try {
        const winner = isWhitePlayer ? "black" : "white"

        const { error } = await supabase
          .from("games")
          .update({
            state: "completed",
            winner: winner,
          })
          .eq("id", game.id)

        if (error) throw error

        toast({
          title: "Você desistiu da partida",
          description: "O jogo foi finalizado",
          variant: "destructive",
        })
      } catch (err) {
        console.error("Error resigning:", err)
        toast({
          title: "Erro",
          description: "Não foi possível desistir da partida",
          variant: "destructive",
        })
      }
    }
  }

  const handleOfferDraw = async () => {
    toast({
      title: "Proposta de Empate",
      description: "Funcionalidade em desenvolvimento",
    })
  }

  const handleReturnToLobby = () => {
    router.push("/dashboard")
  }

  const handlePlayAgain = () => {
    // TODO: Implement play again functionality
    toast({
      title: "Jogar Novamente",
      description: "Funcionalidade em desenvolvimento",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <div className="text-white text-lg">Carregando jogo...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-red-500">
          <CardContent className="p-6 text-center">
            <div className="text-red-400 text-lg mb-4">Erro: {error}</div>
            <Button onClick={() => router.push("/dashboard")} className="bg-blue-600 hover:bg-blue-700 text-white">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!game || !room) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <div className="text-white text-lg">Jogo não encontrado</div>
            <Button onClick={() => router.push("/dashboard")} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push(`/lobby/${roomId}`)}
            variant="ghost"
            className="text-slate-300 hover:text-white hover:bg-slate-800 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Lobby
          </Button>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-white">{room.name}</CardTitle>
                <div className="flex items-center space-x-4">
                  <Badge className={game.state === "active" ? "bg-green-600 text-white" : "bg-gray-600 text-white"}>
                    {game.state === "active" ? "Em andamento" : "Finalizado"}
                  </Badge>
                  <div className="text-green-400 font-semibold">{room.bet_amount} USDC</div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Sidebar com informações dos jogadores */}
          <div className="lg:col-span-1 space-y-4">
            {/* Jogador das Pretas (topo) */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center">
                  <div className="w-4 h-4 bg-gray-900 border border-slate-600 rounded mr-2"></div>
                  Pretas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-slate-700 text-white text-sm">
                      {blackPlayer?.username?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-white font-medium text-sm">{blackPlayer?.username || "Carregando..."}</div>
                    <div className="text-slate-400 text-xs">ELO: {blackPlayer?.elo_rating || 1200}</div>
                  </div>
                </div>
                {game.current_player === "black" && (
                  <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    Sua vez
                  </Badge>
                )}
                <div className="mt-2">
                  <PersistentGameTimer
                    gameId={game.id}
                    playerId={game.black_player_id}
                    playerColor="black"
                    onTimeUp={() => handleTimeUp("black")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Informações da Partida */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">Informações da Partida</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="text-slate-300 text-xs">
                  <div className="flex justify-between">
                    <span>Sala:</span>
                    <span className="text-white">{room.name}</span>
                  </div>
                </div>
                <div className="text-slate-300 text-xs">
                  <div className="flex justify-between">
                    <span>Aposta:</span>
                    <span className="text-green-400">{game.bet_amount} USDC</span>
                  </div>
                </div>
                <div className="text-slate-300 text-xs">
                  <div className="flex justify-between">
                    <span>Tempo:</span>
                    <span className="text-blue-400">
                      {room.time_control?.minutes || 10}+{room.time_control?.increment || 0}
                    </span>
                  </div>
                </div>
                <div className="text-slate-300 text-xs">
                  <div className="flex justify-between">
                    <span>Estado:</span>
                    <Badge variant="outline" className="text-xs h-5">
                      {game.state === "active" ? "Em andamento" : "Finalizado"}
                    </Badge>
                  </div>
                </div>
                {game.winner && (
                  <div className="text-slate-300 text-xs">
                    <div className="flex justify-between">
                      <span>Vencedor:</span>
                      <span className="text-yellow-400">
                        {game.winner === "white" ? "Brancas" : game.winner === "black" ? "Pretas" : "Empate"}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Jogador das Brancas (baixo) */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center">
                  <div className="w-4 h-4 bg-white border border-slate-600 rounded mr-2"></div>
                  Brancas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-white text-slate-800 text-sm">
                      {whitePlayer?.username?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-white font-medium text-sm">{whitePlayer?.username || "Carregando..."}</div>
                    <div className="text-slate-400 text-xs">ELO: {whitePlayer?.elo_rating || 1200}</div>
                  </div>
                </div>
                {game.current_player === "white" && (
                  <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    Sua vez
                  </Badge>
                )}
                <div className="mt-2">
                  <PersistentGameTimer
                    gameId={game.id}
                    playerId={game.white_player_id}
                    playerColor="white"
                    onTimeUp={() => handleTimeUp("white")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ações do Jogo */}
            {game.state === "active" && (isWhitePlayer || isBlackPlayer) && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm">Ações</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <Button
                    onClick={handleOfferDraw}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Propor Empate
                  </Button>
                  <Button onClick={handleResign} variant="destructive" size="sm" className="w-full text-xs">
                    <Flag className="mr-1 h-3 w-3" />
                    Desistir
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tabuleiro de Xadrez */}
          <div className="lg:col-span-3">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                {chessError && (
                  <div className="text-red-400 text-sm mb-4 p-3 bg-red-900/20 rounded-lg border border-red-500/50">
                    {chessError}
                  </div>
                )}
                <ChessBoard
                  gameId={game.id}
                  userId={user?.id || ""}
                  initialFen={game.board_state}
                  currentPlayer={game.current_player}
                  isPlayerTurn={isCurrentPlayer}
                  onError={setChessError}
                  playerColor={isWhitePlayer ? "white" : "black"}
                  whitePlayerId={game.white_player_id}
                  blackPlayerId={game.black_player_id}
                  betAmount={game.bet_amount}
                />
              </CardContent>
            </Card>
          </div>

          {/* Peças Capturadas */}
          <div className="lg:col-span-1">
            <CapturedPieces 
              capturedPieces={capturedPieces} 
              playerColor={isWhitePlayer ? "white" : "black"} 
            />
          </div>
        </div>

        {/* Game End Modal */}
        {game && (
          <GameEndModal
            isOpen={showGameEndModal}
            winner={game.winner as "white" | "black" | "draw" | null}
            playerColor={isWhitePlayer ? "white" : "black"}
            betAmount={game.bet_amount}
            gameResult={getGameResult()}
            onClose={() => setShowGameEndModal(false)}
            onPlayAgain={handlePlayAgain}
            onReturnToLobby={handleReturnToLobby}
          />
        )}
      </div>
    </div>
  )
}
