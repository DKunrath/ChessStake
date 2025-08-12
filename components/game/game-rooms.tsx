"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Users, DollarSign, Clock, Crown, Play, TrendingUp } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { calculateNetWinnings } from "@/lib/game-utils"

interface GameRoom {
  id: string
  name: string
  bet_amount: number
  time_control: any
  creator_id: string
  opponent_id: string | null
  state: string
  created_at: string
  creator?: {
    username: string
    elo_rating: number
  }
  opponent?: {
    username: string
    elo_rating: number
  }
}

export default function GameRooms() {
  const { user } = useAuth()
  const router = useRouter()
  const [rooms, setRooms] = useState<GameRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchRooms = async () => {
      try {
        const { data, error } = await supabase
          .from("game_rooms")
          .select(`
            *,
            creator:profiles!game_rooms_creator_id_fkey(username, elo_rating),
            opponent:profiles!game_rooms_opponent_id_fkey(username, elo_rating)
          `)
          .eq("state", "waiting")
          .order("created_at", { ascending: false })

        if (error) throw error

        setRooms(data || [])
      } catch (err) {
        console.error("Error fetching rooms:", err)
        toast({
          title: "Erro",
          description: "Não foi possível carregar as salas",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()

    // Escutar mudanças em tempo real
    const channel = supabase
      .channel("game_rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms" }, () => {
        fetchRooms()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return

    try {
      // Simplesmente redirecionar para o lobby
      // A lógica de adicionar como oponente acontece no lobby
      router.push(`/lobby/${roomId}`)
    } catch (err) {
      console.error("Error joining room:", err)
      toast({
        title: "Erro",
        description: "Não foi possível entrar na sala",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-4">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            <div className="text-slate-300">Carregando salas...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (rooms.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 text-center">
          <div className="text-slate-400 text-lg mb-2">Nenhuma sala disponível</div>
          <div className="text-slate-500 text-sm">Crie uma nova sala para começar a jogar</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {rooms.map((room) => (
        <Card
          key={room.id}
          className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg flex items-center">
                <Crown className="mr-2 h-5 w-5 text-yellow-400" />
                {room.name}
              </CardTitle>
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="text-slate-300">
                  <Users className="mr-1 h-3 w-3" />
                  {room.opponent_id ? "2/2" : "1/2"}
                </Badge>
                <div className="flex items-center text-green-400">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {room.bet_amount} USDC
                </div>
                <div className="flex items-center text-purple-400">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +{calculateNetWinnings(room.bet_amount).winningsPercentage.toFixed(0)}%
                </div>
                <div className="flex items-center text-blue-400">
                  <Clock className="h-4 w-4 mr-1" />
                  {room.time_control?.minutes || 10}+{room.time_control?.increment || 0}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Criador */}
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-sm">
                      {room.creator?.username?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-white text-sm font-medium">{room.creator?.username || "Carregando..."}</div>
                    <div className="text-slate-400 text-xs">ELO: {room.creator?.elo_rating || 1200}</div>
                  </div>
                </div>

                <div className="text-slate-500">vs</div>

                {/* Oponente */}
                {room.opponent ? (
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-sm">
                        {room.opponent.username?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-white text-sm font-medium">{room.opponent.username}</div>
                      <div className="text-slate-400 text-xs">ELO: {room.opponent.elo_rating}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-slate-700 border-2 border-dashed border-slate-500 flex items-center justify-center">
                      <Users className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="text-slate-400 text-sm">Aguardando oponente...</div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {room.creator_id === user?.id ? (
                  <Button
                    onClick={() => router.push(`/lobby/${room.id}`)}
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                  >
                    <Crown className="mr-1 h-3 w-3" />
                    Minha Sala
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleJoinRoom(room.id)}
                    variant="default"
                    size="sm"
                    disabled={!!room.opponent_id}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    {room.opponent_id ? "Sala Cheia" : "Entrar"}
                  </Button>
                )}
              </div>
            </div>

            {/* Informações de ganhos potenciais */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between text-xs">
                <div className="text-slate-400">
                  Ganho potencial: <span className="text-green-400 font-semibold">
                    +{(calculateNetWinnings(room.bet_amount).netWinnings - room.bet_amount).toFixed(2)} USDC
                  </span>
                </div>
                <div className="text-slate-400">
                  Taxa da plataforma: <span className="text-orange-400">
                    {calculateNetWinnings(room.bet_amount).platformFee.toFixed(2)} USDC (10%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
