"use client"

import { useState } from 'react'
import { useWallet } from '@/hooks/use-wallet'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Wallet, DollarSign, CreditCard, ArrowUpRight, ArrowDownLeft, ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function WalletCard() {
  const { wallet, transactions, connectWallet, depositUSDC, fetchWallet } = useWallet()
  const [depositAmount, setDepositAmount] = useState('')
  const [isDepositing, setIsDepositing] = useState(false)
  const [showTransactions, setShowTransactions] = useState(false)

  const handleConnectWallet = async () => {
    try {
      await connectWallet()
      toast.success('Carteira conectada com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao conectar carteira')
    }
  }

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Digite um valor válido')
      return
    }

    try {
      setIsDepositing(true)
      await depositUSDC(parseFloat(depositAmount))
      toast.success('Depósito realizado com sucesso!')
      setDepositAmount('')
      fetchWallet()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao realizar depósito')
    } finally {
      setIsDepositing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-400" />
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-400" />
      case 'bet':
        return <DollarSign className="h-4 w-4 text-blue-400" />
      case 'win':
        return <DollarSign className="h-4 w-4 text-green-400" />
      default:
        return <DollarSign className="h-4 w-4 text-slate-400" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'win':
        return 'text-green-400'
      case 'withdrawal':
      case 'bet':
        return 'text-red-400'
      default:
        return 'text-slate-400'
    }
  }

  if (!wallet) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Wallet className="mr-2 h-5 w-5" />
            Carteira
          </CardTitle>
          <CardDescription>Carregando informações da carteira...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center">
            <Wallet className="mr-2 h-5 w-5" />
            Carteira
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchWallet}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-slate-700 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(wallet.balance || 0)}
            </div>
            <div className="text-sm text-slate-400">Saldo da Plataforma</div>
          </div>
          <div className="text-center p-4 bg-slate-700 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">
              {formatCurrency(wallet.balance || 0)}
            </div>
            <div className="text-sm text-slate-400">USDC na Carteira</div>
          </div>
        </div>

        {/* Web3 Connection Status */}
        <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${wallet.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm text-slate-300">
              {wallet.isConnected ? 'MetaMask Conectada' : 'MetaMask Desconectada'}
            </span>
          </div>
          {wallet.isConnected && wallet.address && (
            <Badge variant="secondary" className="text-xs">
              {`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-2">
          {!wallet.isConnected ? (
            <Button onClick={handleConnectWallet} className="w-full bg-blue-600 hover:bg-blue-700">
              <Wallet className="mr-2 h-4 w-4" />
              Conectar MetaMask
            </Button>
          ) : (
            <>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <ArrowDownLeft className="mr-2 h-4 w-4" />
                    Depositar USDC
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle>Depositar USDC</DialogTitle>
                    <DialogDescription className="text-slate-300">
                      Transfira USDC da sua carteira MetaMask para a plataforma
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="amount" className="text-slate-300">Valor (USDC)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div className="text-sm text-slate-400">
                      Saldo disponível: {formatCurrency(wallet.balance || 0)}
                    </div>
                    <Button
                      onClick={handleDeposit}
                      disabled={isDepositing || !depositAmount}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isDepositing ? 'Processando...' : 'Confirmar Depósito'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>

        {/* Transaction History Button */}
        <Button
          variant="outline"
          onClick={() => setShowTransactions(!showTransactions)}
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          {showTransactions ? 'Ocultar' : 'Ver'} Histórico
        </Button>

        {/* Transaction History */}
        {showTransactions && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <h4 className="text-sm font-medium text-slate-300">Transações Recentes</h4>
            {transactions.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-4">
                Nenhuma transação encontrada
              </div>
            ) : (
              transactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <div className="text-sm font-medium text-white capitalize">
                        {transaction.type === 'deposit' ? 'Depósito' :
                          transaction.type === 'withdrawal' ? 'Saque' :
                            transaction.type === 'bet' ? 'Aposta' :
                              transaction.type === 'win' ? 'Ganho' : transaction.type}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDate(transaction.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}>
                      {transaction.type === 'deposit' || transaction.type === 'win' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div className="flex items-center text-xs text-slate-400">
                      <Badge
                        variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {transaction.status === 'completed' ? 'Concluído' :
                          transaction.status === 'pending' ? 'Pendente' : 'Falhou'}
                      </Badge>
                      {transaction.hash && (
                        <a
                          href={`https://polygonscan.com/tx/${transaction.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 hover:text-blue-400"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
