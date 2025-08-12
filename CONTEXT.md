# ChessStake - Plataforma de Xadrez com Apostas

## Visão Geral
ChessStake é uma plataforma de xadrez online onde jogadores podem apostar USDC em partidas. A plataforma utiliza Next.js, Supabase para backend e autenticação, e integração com MetaMask para transações em criptomoeda.

## Tecnologias Utilizadas
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Blockchain**: Polygon Network, USDC, MetaMask
- **UI Components**: shadcn/ui
- **Chess Logic**: chess.js para validação de movimentos

## Estrutura do Projeto

### Autenticação
- Sistema de login/registro via Supabase Auth
- Suporte a email/senha e provedores OAuth
- Proteção de rotas com AuthGuard

### Sistema de Carteira
- Integração com MetaMask
- Suporte à rede Polygon
- Transações em USDC
- Histórico de transações

### Sistema de Jogos
- Criação de salas de jogo
- Sistema de matchmaking
- Tabuleiro de xadrez interativo
- Validação de movimentos em tempo real
- Sistema de apostas

### Banco de Dados (Supabase)
- **profiles**: Dados dos usuários (username, ELO, wallet_address)
- **game_rooms**: Salas de jogo com configurações
- **games**: Partidas ativas com estado do tabuleiro
- **moves**: Histórico de movimentos
- **wallets**: Saldos dos usuários
- **transactions**: Histórico de transações
- **matchmaking_queue**: Fila de matchmaking

### Funcionalidades Principais
1. **Criação de Salas**: Usuários podem criar salas com apostas personalizadas
2. **Lobby System**: Sistema de lobby onde jogadores se preparam antes da partida
3. **Sorteio de Cores**: Cores são sorteadas automaticamente quando a partida inicia
4. **Jogo em Tempo Real**: Movimentos sincronizados via Supabase Realtime
5. **Sistema de Apostas**: Integração com USDC na rede Polygon

### Fluxo do Jogo
1. Usuário cria uma sala ou entra em uma existente
2. Ambos os jogadores vão para o lobby
3. Cada jogador marca-se como "Pronto"
4. Quando ambos estão prontos, podem iniciar a partida
5. Cores são sorteadas automaticamente
6. Jogo inicia com validação de movimentos em tempo real

### Segurança
- Row Level Security (RLS) habilitado em todas as tabelas
- Validação de movimentos no backend
- Autenticação obrigatória para todas as ações
- Proteção contra movimentos inválidos

## Próximos Passos
- Implementar sistema de timer para as partidas
- Adicionar chat em tempo real
- Sistema de espectadores
- Histórico detalhado de partidas
- Sistema de ranking e torneios
