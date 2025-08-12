"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Users, DollarSign, Clock, Crown, CheckCircle, ArrowLeft, RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface GameRoom {
  id: string
  name: string
  bet_amount: number
  time_control: any
  creator_id: string
  opponent_id: string | null
  state: string
  creator_ready: boolean
  opponent_ready: boolean
  created_at: string
}

interface UserProfile {
  id: string
  username: string
  elo_rating: number
}

export default function LobbyPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [creator, setCreator] = useState<UserProfile | null>(null)
  const [opponent, setOpponent] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasJoinedAsOpponent, setHasJoinedAsOpponent] = useState(false)

  const isCreator = user?.id === room?.creator_id
  const isOpponent = user?.id === room?.opponent_id
  const canStartGame = room?.creator_ready && room?.opponent_ready && room?.opponent_id

  const fetchRoomData = async () => {
    try {
      console.log("Fetching room data for room:", roomId)
      
      // Buscar dados da sala
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("id", roomId)
        .single()

      if (roomError) {
        console.error("Room error:", roomError)
        setError("Sala não encontrada")
        return
      }

      console.log("Room data:", roomData)

      // Se o usuário não é o criador e não há oponente, adicionar como oponente
      if (roomData.creator_id !== user?.id && !roomData.opponent_id && !hasJoinedAsOpponent) {
        console.log("Adding user as opponent")
        console.log("Room ID:", roomId)
        console.log("User ID:", user?.id)
        console.log("Current room data:", roomData)
        
        const { data: updateResult, error: updateError } = await supabase
          .from("game_rooms")
          .update({ opponent_id: user?.id })
          .eq("id", roomId)
          .is("opponent_id", null)
          .select() // Adicionar select para ver o resultado

        console.log("Update result:", updateResult)
        console.log("Update error:", updateError)

        if (updateError) {
          console.error("Error adding opponent:", updateError)
        } else if (updateResult && updateResult.length > 0) {
          roomData.opponent_id = user?.id
          setHasJoinedAsOpponent(true)
          console.log("User successfully added as opponent")
        } else {
          console.log("No rows were updated - maybe someone else joined first")
        }

        // Verificar o estado atual da sala no banco
        const { data: verifyRoom, error: verifyError } = await supabase
          .from("game_rooms")
          .select("*")
          .eq("id", roomId)
          .single()
        
        console.log("Room verification after update:", verifyRoom)
        if (verifyError) {
          console.error("Error verifying room:", verifyError)
        }
      }

      setRoom(roomData)

      // Verificar se o usuário já está na sala como oponente
      if (roomData.opponent_id === user?.id) {
        setHasJoinedAsOpponent(true)
      }

      // Buscar perfil do criador
      const { data: creatorData, error: creatorError } = await supabase
        .from("profiles")
        .select("id, username, elo_rating")
        .eq("id", roomData.creator_id)
        .single()

      if (creatorError) {
        console.error("Creator error:", creatorError)
      } else {
        console.log("Creator data:", creatorData)
        setCreator(creatorData)
      }

      // Buscar perfil do oponente se existir
      if (roomData.opponent_id) {
        const { data: opponentData, error: opponentError } = await supabase
          .from("profiles")
          .select("id, username, elo_rating")
          .eq("id", roomData.opponent_id)
          .single()

        if (opponentError) {
          console.error("Opponent error:", opponentError)
        } else {
          console.log("Opponent data:", opponentData)
          setOpponent(opponentData)
        }
      }

      // Definir estado inicial de ready
      if (roomData.creator_id === user?.id) {
        setIsReady(roomData.creator_ready)
      } else if (roomData.opponent_id === user?.id) {
        setIsReady(roomData.opponent_ready)
      }

    } catch (err) {
      console.error("Error fetching room data:", err)
      setError(err instanceof Error ? err.message : "Erro ao carregar sala")
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchRoomData()
    setRefreshing(false)
  }

  const handleDebugUpdate = async () => {
    console.log("Debug: Attempting direct update")
    const { data, error } = await supabase
      .from("game_rooms")
      .update({ opponent_id: user?.id })
      .eq("id", roomId)
      .select()
    
    console.log("Debug update result:", data)
    console.log("Debug update error:", error)
  }

  useEffect(() => {
    if (!roomId || !user) return

    const initializeRoom = async () => {
      await fetchRoomData()
      setLoading(false)
    }

    // Só inicializar uma vez
    if (loading) {
      initializeRoom()
    }

    // Escutar mudanças em tempo real na sala
    const roomChannel = supabase
      .channel("room_" + roomId)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          console.log("Room update received:", payload)
          const updatedRoom = payload.new as GameRoom
          setRoom(updatedRoom)

          // Se o estado mudou para "in_game", redirecionar para o jogo
          if (updatedRoom.state === "in_game") {
            console.log("Game started! Redirecting to game...")
            toast({
              title: "Jogo Iniciado!",
              description: "Redirecionando para o tabuleiro...",
            })
            router.push(`/game/${roomId}`)
            return
          }

          // Atualizar estado de ready
          if (updatedRoom.creator_id === user.id) {
            setIsReady(updatedRoom.creator_ready)
          } else if (updatedRoom.opponent_id === user.id) {
            setIsReady(updatedRoom.opponent_ready)
          }

          // Buscar perfil do oponente se foi adicionado
          if (updatedRoom.opponent_id && !opponent) {
            console.log("Fetching opponent profile via realtime:", updatedRoom.opponent_id)
            supabase
              .from("profiles")
              .select("id, username, elo_rating")
              .eq("id", updatedRoom.opponent_id)
              .single()
              .then(({ data, error }) => {
                if (error) {
                  console.error("Error fetching opponent:", error)
                } else if (data) {
                  console.log("Opponent profile loaded via realtime:", data)
                  setOpponent(data)
                }
              })
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_rooms" },
        (payload) => {
          console.log("Room insert received:", payload)
        }
      )
      .subscribe((status) => {
        console.log("Room subscription status:", status)
        if (status === 'SUBSCRIBED') {
          console.log("Successfully subscribed to room updates")
        } else if (status === 'CHANNEL_ERROR') {
          console.error("Error subscribing to room channel")
        }
      })

    // Fallback: polling a cada 3 segundos se não houver opponent (mais agressivo)
    const pollingInterval = setInterval(async () => {
      if (!room?.opponent_id && room?.creator_id === user?.id) {
        console.log("Polling for room updates...")
        const { data: updatedRoom, error } = await supabase
          .from("game_rooms")
          .select("*")
          .eq("id", roomId)
          .single()
        
        if (error) {
          console.error("Polling error:", error)
          return
        }
        
        if (updatedRoom && updatedRoom.opponent_id && !room?.opponent_id) {
          console.log("Opponent joined via polling:", updatedRoom)
          setRoom(updatedRoom)
          
          // Buscar perfil do oponente
          const { data: opponentData, error: opponentError } = await supabase
            .from("profiles")
            .select("id, username, elo_rating")
            .eq("id", updatedRoom.opponent_id)
            .single()
          
          if (opponentError) {
            console.error("Error fetching opponent via polling:", opponentError)
          } else if (opponentData) {
            console.log("Opponent profile loaded via polling:", opponentData)
            setOpponent(opponentData)
          }
        }
      }
    }, 3000) // Polling mais agressivo: 3 segundos

    return () => {
      supabase.removeChannel(roomChannel)
      clearInterval(pollingInterval)
    }
  }, [roomId, user]) // Removendo 'opponent' das dependências

  const handleToggleReady = async () => {
    if (!room || !user) return

    try {
      const newReadyState = !isReady
      const updateField = isCreator ? "creator_ready" : "opponent_ready"

      const { error } = await supabase
        .from("game_rooms")
        .update({ [updateField]: newReadyState })
        .eq("id", roomId)

      if (error) throw error

      setIsReady(newReadyState)
      toast({
        title: newReadyState ? "Você está pronto!" : "Você não está mais pronto",
        description: newReadyState ? "Aguardando o outro jogador..." : "Marque-se como pronto quando estiver preparado",
      })
    } catch (err) {
      console.error("Error toggling ready:", err)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar seu status",
        variant: "destructive",
      })
    }
  }

  const handleStartGame = async () => {
    if (!room || !user || !canStartGame) return

    try {
      console.log("Starting game for room:", roomId)
      console.log("Room data:", room)
      console.log("User:", user.id)
      
      // Sortear cores aleatoriamente
      const isCreatorWhite = Math.random() < 0.5
      const whitePlayerId = isCreatorWhite ? room.creator_id : room.opponent_id!
      const blackPlayerId = isCreatorWhite ? room.opponent_id! : room.creator_id

      console.log("Game setup:", {
        whitePlayerId,
        blackPlayerId,
        isCreatorWhite
      })

      // Criar o jogo
      const timeControlMinutes = room.time_control?.minutes || 10
      const timeControlSeconds = timeControlMinutes * 60

      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .insert({
          room_id: roomId,
          white_player_id: whitePlayerId,
          black_player_id: blackPlayerId,
          current_player: "white",
          board_state: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          state: "active",
          bet_amount: room.bet_amount,
          time_control: timeControlSeconds,
          white_time_left: timeControlSeconds,
          black_time_left: timeControlSeconds,
          last_move_time: new Date().toISOString(),
        })
        .select()
        .single()

      console.log("Game creation result:", { gameData, gameError })

      if (gameError) throw gameError

      // Atualizar estado da sala
      const { error: roomError } = await supabase.from("game_rooms").update({ state: "in_game" }).eq("id", roomId)

      console.log("Room update result:", { roomError })

      if (roomError) throw roomError

      toast({
        title: "Jogo Iniciado!",
        description: `Você é as peças ${whitePlayerId === user.id ? "brancas" : "pretas"}`,
      })

      // Redirecionar para o jogo
      console.log("Redirecting to game:", `/game/${roomId}`)
      router.push(`/game/${roomId}`)
    } catch (err) {
      console.error("Error starting game:", err)
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o jogo",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <div className="text-white text-lg">Carregando lobby...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-red-500/50 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="text-red-400 text-lg mb-4">Erro: {error}</div>
            <Button onClick={() => router.push("/dashboard")} variant="outline">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="text-white text-lg">Sala não encontrada</div>
            <Button onClick={() => router.push("/dashboard")} variant="outline" className="mt-4">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={() => router.push("/dashboard")}
              variant="ghost"
              className="text-slate-300 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
            
            <Button
              onClick={handleRefresh}
              variant="ghost"
              className="text-slate-300 hover:text-white"
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            {/* Debug button - remover depois */}
            <Button
              onClick={handleDebugUpdate}
              variant="ghost"
              className="text-red-300 hover:text-red-200"
            >
              Debug Update
            </Button>
          </div>

          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-white flex items-center">
                  <Crown className="mr-3 h-6 w-6 text-yellow-400" />
                  {room.name}
                </CardTitle>
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="text-slate-300">
                    <Users className="mr-1 h-3 w-3" />
                    {room.opponent_id ? "2/2" : "1/2"} Jogadores
                  </Badge>
                  <div className="flex items-center text-green-400">
                    <DollarSign className="h-4 w-4 mr-1" />
                    {room.bet_amount} USDC
                  </div>
                  <div className="flex items-center text-blue-400">
                    <Clock className="h-4 w-4 mr-1" />
                    {room.time_control?.minutes || 10}+{room.time_control?.increment || 0}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Criador da Sala */}
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center">
                <Crown className="mr-2 h-5 w-5 text-yellow-400" />
                Criador da Sala
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-xl font-bold">
                    {creator?.username?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-white font-semibold text-lg">{creator?.username || "Carregando..."}</div>
                  <div className="text-slate-400">ELO: {creator?.elo_rating || 1200}</div>
                  <div className="flex items-center mt-2">
                    {room.creator_ready ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Pronto
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400">
                        Aguardando...
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {isCreator && (
                <Button
                  onClick={handleToggleReady}
                  variant={isReady ? "destructive" : "default"}
                  className="w-full"
                  disabled={!room.opponent_id}
                >
                  {isReady ? "Cancelar" : "Estou Pronto"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Oponente */}
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center">
                <Users className="mr-2 h-5 w-5 text-blue-400" />
                Oponente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {opponent ? (
                <>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xl font-bold">
                        {opponent.username?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-white font-semibold text-lg">{opponent.username}</div>
                      <div className="text-slate-400">ELO: {opponent.elo_rating}</div>
                      <div className="flex items-center mt-2">
                        {room.opponent_ready ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Pronto
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400">
                            Aguardando...
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {isOpponent && (
                    <Button
                      onClick={handleToggleReady}
                      variant={isReady ? "destructive" : "default"}
                      className="w-full"
                    >
                      {isReady ? "Cancelar" : "Estou Pronto"}
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-slate-400 text-lg mb-2">Aguardando oponente...</div>
                  <div className="text-slate-500 text-sm">Compartilhe o link da sala para convidar alguém</div>
                  <div className="mt-4">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Botão de Iniciar Jogo - Apenas para o Criador */}
        {canStartGame && isCreator && (
          <div className="mt-8 text-center">
            <Card className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/50 backdrop-blur-sm max-w-md mx-auto">
              <CardContent className="p-6">
                <div className="text-green-400 text-lg font-semibold mb-4">Ambos os jogadores estão prontos!</div>
                <Button onClick={handleStartGame} size="lg" className="w-full bg-green-600 hover:bg-green-700">
                  <Crown className="mr-2 h-5 w-5" />
                  Começar Partida
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mensagem para o Oponente quando ambos estão prontos */}
        {canStartGame && isOpponent && (
          <div className="mt-8 text-center">
            <Card className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-blue-500/50 backdrop-blur-sm max-w-md mx-auto">
              <CardContent className="p-6">
                <div className="text-blue-400 text-lg font-semibold mb-2">Ambos estão prontos!</div>
                <div className="text-slate-300">Aguardando o criador da sala iniciar a partida...</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Informações da Sala */}
        <div className="mt-8">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-white text-lg">Informações da Partida</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-slate-400 text-sm">Aposta</div>
                <div className="text-green-400 font-semibold text-lg">{room.bet_amount} USDC</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-sm">Tempo</div>
                <div className="text-blue-400 font-semibold text-lg">
                  {room.time_control?.minutes || 10}+{room.time_control?.increment || 0}
                </div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-sm">Estado</div>
                <div className="text-white font-semibold text-lg">
                  {room.state === "waiting" ? "Aguardando" : "Em Jogo"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
