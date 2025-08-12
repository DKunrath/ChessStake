import DashboardHeader from "@/components/dashboard/dashboard-header"
import DashboardStats from "@/components/dashboard/dashboard-stats"
import GameRooms from "@/components/game/game-rooms"
import { CreateRoomDialog } from "@/components/game/create-room-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Users, Trophy, Plus } from "lucide-react"

export default async function DashboardPage() {

  return (
    <div className="min-h-screen bg-slate-900">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
            <p className="text-slate-300">Bem-vindo de volta! Pronto para sua próxima partida?</p>
          </div>

          <DashboardStats />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Play className="mr-2 h-5 w-5 text-green-500" />
                  Partida Rápida
                </CardTitle>
                <CardDescription className="text-slate-300">Encontre um oponente para uma partida 1x1</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-green-600 hover:bg-green-700">Jogar Agora</Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Plus className="mr-2 h-5 w-5 text-blue-500" />
                  Criar Sala
                </CardTitle>
                <CardDescription className="text-slate-300">Crie uma sala personalizada com suas regras</CardDescription>
              </CardHeader>
              <CardContent>
                <CreateRoomDialog 
                  buttonText="Criar Sala"
                  variant="dashboard"
                />
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                  Torneios
                </CardTitle>
                <CardDescription className="text-slate-300">Participe de torneios com grandes prêmios</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-yellow-600 hover:bg-yellow-700">Ver Torneios</Button>
              </CardContent>
            </Card>
          </div>

          {/* Active Game Rooms */}
          <GameRooms />
        </div>
      </main>
    </div>
  )
}
