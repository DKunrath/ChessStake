"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Settings, Users, TrendingUp, DollarSign } from 'lucide-react'
import { calculateNetWinnings } from '@/lib/game-utils'

interface CreateRoomData {
  name: string
  betAmount: number
  timeControl: string
  minElo?: number
  maxElo?: number
}

interface CreateRoomDialogProps {
  buttonText?: string
  buttonClassName?: string
  variant?: 'default' | 'dashboard'
}

function CreateRoomDialog({ 
  buttonText = "Criar Nova Sala",
  buttonClassName = "bg-purple-600 hover:bg-purple-700",
  variant = 'default'
}: CreateRoomDialogProps) {
  const router = useRouter();
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateRoomData>({
    name: '',
    betAmount: 0,
    timeControl: '10+0',
    minElo: undefined,
    maxElo: undefined
  })

  const timeControls = [
    { value: '1+0', label: '1 min (Bullet)', minutes: 1, increment: 0 },
    { value: '3+0', label: '3 min (Blitz)', minutes: 3, increment: 0 },
    { value: '5+0', label: '5 min (Blitz)', minutes: 5, increment: 0 },
    { value: '10+0', label: '10 min (Rapid)', minutes: 10, increment: 0 },
    { value: '15+10', label: '15+10 (Rapid)', minutes: 15, increment: 10 },
    { value: '30+0', label: '30 min (Classical)', minutes: 30, increment: 0 }
  ]

  const parseTimeControl = (timeControlString: string) => {
    const timeControl = timeControls.find(tc => tc.value === timeControlString)
    return {
      minutes: timeControl?.minutes || 10,
      increment: timeControl?.increment || 0
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !formData.name.trim()) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('game_rooms')
        .insert({
          name: formData.name.trim(),
          bet_amount: formData.betAmount,
          time_control: parseTimeControl(formData.timeControl),
          min_elo: formData.minElo,
          max_elo: formData.maxElo,
          creator_id: user.id,
          state: 'waiting'
        })
        .select()
        .single()

      if (error) throw error

      // Reset form and close dialog
      setFormData({
        name: '',
        betAmount: 0,
        timeControl: '10+0',
        minElo: undefined,
        maxElo: undefined
      })
      setOpen(false)

      // Navega para o lobby da sala criada
      if (data?.id) {
        router.push(`/lobby/${data.id}`)
      }
    } catch (error) {
      console.error('Error creating room:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CreateRoomData, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={variant === 'dashboard' ? "w-full bg-blue-600 hover:bg-blue-700" : buttonClassName}>
          <Plus className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Criar Sala de Jogo
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Configure sua sala personalizada e aguarde um oponente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <Label htmlFor="room-name" className="text-slate-300">
              Nome da Sala
            </Label>
            <Input
              id="room-name"
              type="text"
              placeholder="Ex: Sala do João - Jogo Rápido"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          {/* Bet Amount */}
          <div>
            <Label htmlFor="bet-amount" className="text-slate-300">
              Valor da Aposta (USDC)
            </Label>
            <Input
              id="bet-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.betAmount}
              onChange={(e) => handleInputChange('betAmount', parseFloat(e.target.value) || 0)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            
            {/* Mostrar informações de ganhos potenciais */}
            {formData.betAmount > 0 && (
              <div className="mt-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-green-400">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>Ganho se vencer:</span>
                  </div>
                  <div className="font-semibold text-green-400">
                    +{(calculateNetWinnings(formData.betAmount).netWinnings - formData.betAmount).toFixed(2)} USDC
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400">Retorno total:</span>
                  <span className="text-white">
                    {calculateNetWinnings(formData.betAmount).netWinnings.toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400">Percentual de ganho:</span>
                  <span className="text-purple-400 font-semibold">
                    +{calculateNetWinnings(formData.betAmount).winningsPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400">Taxa da plataforma:</span>
                  <span className="text-orange-400">
                    {calculateNetWinnings(formData.betAmount).platformFee.toFixed(2)} USDC (10%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Time Control */}
          <div>
            <Label htmlFor="time-control" className="text-slate-300">
              Controle de Tempo
            </Label>
            <Select
              value={formData.timeControl}
              onValueChange={(value) => handleInputChange('timeControl', value)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Selecione o tempo" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {timeControls.map((control) => (
                  <SelectItem key={control.value} value={control.value} className="text-white">
                    {control.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ELO Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min-elo" className="text-slate-300">
                ELO Mínimo
              </Label>
              <Input
                id="min-elo"
                type="number"
                placeholder="Opcional"
                value={formData.minElo || ''}
                onChange={(e) => handleInputChange('minElo', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="max-elo" className="text-slate-300">
                ELO Máximo
              </Label>
              <Input
                id="max-elo"
                type="number"
                placeholder="Opcional"
                value={formData.maxElo || ''}
                onChange={(e) => handleInputChange('maxElo', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !formData.name.trim()}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Criando...' : 'Criar Sala'}
          </Button>
        </form>

        {/* Info Card */}
        <Card className="bg-slate-700 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center text-slate-300 text-sm">
              <Users className="mr-2 h-4 w-4" />
              Sua sala ficará visível para outros jogadores até alguém se juntar
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

export { CreateRoomDialog }
