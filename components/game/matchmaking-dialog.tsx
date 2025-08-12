"use client"

import { useState } from 'react'
import { useMatchmaking } from '@/hooks/use-matchmaking'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Search, Clock, Users, Target, Zap, Timer, Crown } from 'lucide-react'
import type { TimeControl } from '@/lib/types/game'

interface MatchmakingPreferences {
  timeControl: TimeControl
  minElo?: number
  maxElo?: number
  betAmount?: number
  autoAccept?: boolean
}

export function MatchmakingDialog() {
  const { 
    isSearching, 
    estimatedWaitTime, 
    activeSearches, 
    startSearch, 
    cancelSearch 
  } = useMatchmaking()
  
  const [open, setOpen] = useState(false)
  const [preferences, setPreferences] = useState<MatchmakingPreferences>({
    timeControl: { type: 'blitz', minutes: 5, increment: 0 },
    autoAccept: true
  })

  const handleStartSearch = async () => {
    try {
      await startSearch(preferences)
      setOpen(false)
    } catch (error) {
      console.error('Erro ao iniciar busca:', error)
    }
  }

  const getTimeControlDisplay = (timeControl: TimeControl) => {
    return `${timeControl.minutes}+${timeControl.increment}`
  }

  const getTimeControlType = (minutes: number) => {
    if (minutes < 3) return 'bullet'
    if (minutes < 10) return 'blitz'
    if (minutes < 30) return 'rapid'
    return 'classical'
  }

  const handleTimeControlChange = (value: string) => {
    const [minutes, increment] = value.split('+').map(Number)
    const type = getTimeControlType(minutes)
    setPreferences(prev => ({
      ...prev,
      timeControl: { type: type as TimeControl['type'], minutes, increment }
    }))
  }

  if (isSearching) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center text-green-400">
            <Search className="mr-2 h-5 w-5 animate-pulse" />
            Buscando Oponente...
          </CardTitle>
          <CardDescription className="text-slate-300">
            Procurando um oponente compatível
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {estimatedWaitTime ? `~${estimatedWaitTime}s` : '--'}
              </div>
              <div className="text-sm text-slate-400">Tempo estimado</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-lg font-semibold text-white">{activeSearches}</div>
              <div className="text-xs text-slate-400">Jogadores procurando</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-lg font-semibold text-purple-400">
                {getTimeControlDisplay(preferences.timeControl)}
              </div>
              <div className="text-xs text-slate-400">Controle de tempo</div>
            </div>
          </div>

          <Button 
            onClick={cancelSearch}
            variant="outline" 
            className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
          >
            Cancelar Busca
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Search className="mr-2 h-4 w-4" />
          Buscar Oponente
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5 text-green-400" />
            Buscar Oponente Automático
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Configure suas preferências para encontrar um oponente compatível
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Time Control */}
          <div>
            <Label className="text-slate-300">Controle de Tempo</Label>
            <Select 
              value={getTimeControlDisplay(preferences.timeControl)}
              onValueChange={handleTimeControlChange}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="1+0">
                  <div className="flex items-center">
                    <Zap className="mr-2 h-4 w-4 text-yellow-400" />
                    1+0 (Bullet)
                  </div>
                </SelectItem>
                <SelectItem value="2+1">
                  <div className="flex items-center">
                    <Zap className="mr-2 h-4 w-4 text-yellow-400" />
                    2+1 (Bullet)
                  </div>
                </SelectItem>
                <SelectItem value="3+0">
                  <div className="flex items-center">
                    <Timer className="mr-2 h-4 w-4 text-blue-400" />
                    3+0 (Blitz)
                  </div>
                </SelectItem>
                <SelectItem value="5+0">
                  <div className="flex items-center">
                    <Timer className="mr-2 h-4 w-4 text-blue-400" />
                    5+0 (Blitz)
                  </div>
                </SelectItem>
                <SelectItem value="5+3">
                  <div className="flex items-center">
                    <Timer className="mr-2 h-4 w-4 text-blue-400" />
                    5+3 (Blitz)
                  </div>
                </SelectItem>
                <SelectItem value="10+0">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-green-400" />
                    10+0 (Rapid)
                  </div>
                </SelectItem>
                <SelectItem value="15+10">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-green-400" />
                    15+10 (Rapid)
                  </div>
                </SelectItem>
                <SelectItem value="30+0">
                  <div className="flex items-center">
                    <Crown className="mr-2 h-4 w-4 text-purple-400" />
                    30+0 (Classical)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ELO Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">ELO Mínimo</Label>
              <Input
                type="number"
                placeholder="Opcional"
                value={preferences.minElo || ''}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  minElo: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">ELO Máximo</Label>
              <Input
                type="number"
                placeholder="Opcional"
                value={preferences.maxElo || ''}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  maxElo: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Bet Amount */}
          <div>
            <Label className="text-slate-300">Valor da Aposta (USDC)</Label>
            <Select 
              value={preferences.betAmount?.toString() || '0'}
              onValueChange={(value) => setPreferences(prev => ({
                ...prev,
                betAmount: parseInt(value)
              }))}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="0">Sem aposta</SelectItem>
                <SelectItem value="1">$1 USDC</SelectItem>
                <SelectItem value="5">$5 USDC</SelectItem>
                <SelectItem value="10">$10 USDC</SelectItem>
                <SelectItem value="25">$25 USDC</SelectItem>
                <SelectItem value="50">$50 USDC</SelectItem>
                <SelectItem value="100">$100 USDC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto Accept */}
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Auto-aceitar partidas</Label>
            <Switch
              checked={preferences.autoAccept}
              onCheckedChange={(checked) => setPreferences(prev => ({
                ...prev,
                autoAccept: checked
              }))}
            />
          </div>

          {/* Active Searches Info */}
          <Card className="bg-slate-700 border-slate-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-slate-300">
                  <Users className="mr-2 h-4 w-4" />
                  {activeSearches} jogadores procurando
                </div>
                <Badge variant="secondary" className="bg-green-600 text-white">
                  Online
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Start Search Button */}
          <Button 
            onClick={handleStartSearch}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Search className="mr-2 h-4 w-4" />
            Iniciar Busca
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
