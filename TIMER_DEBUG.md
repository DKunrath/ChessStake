# Debug Timer Issue - Análise e Correções

## 🔍 **Problema Identificado:**
Timer só conta para jogador branco, não para jogador preto.

## 🧐 **Possíveis Causas Investigadas:**

### 1. **Lógica de Ativação do Timer**
- ✅ **Verificado:** `shouldBeActive = gameState.current_player === playerColor`
- ✅ **Status:** Correto, cada timer só deve ser ativo na sua vez

### 2. **Carregamento dos Campos Corretos**
- ✅ **Verificado:** `white_time_left` vs `black_time_left` 
- ✅ **Status:** Correto, cada timer carrega seu campo específico

### 3. **Atualização do last_move_time**
- ⚠️ **Problema Encontrado:** Timer atualizava `last_move_time` constantemente
- ✅ **Corrigido:** Apenas movimentos devem atualizar `last_move_time`

## 🔧 **Correções Implementadas:**

### **Correção 1: Não Atualizar last_move_time no Timer**
```tsx
// ANTES - Timer atualizava last_move_time constantemente:
await supabase.from("games").update({
  [timeField]: timeInSeconds,
  last_move_time: new Date().toISOString(), // ❌ PROBLEMA
  updated_at: new Date().toISOString()
})

// DEPOIS - Timer só atualiza o tempo:
await supabase.from("games").update({
  [timeField]: timeInSeconds,
  updated_at: new Date().toISOString() // ✅ CORRETO
})
```

### **Correção 2: Melhor Validação de Estado Ativo**
```tsx
// Só subtrai tempo se for realmente a vez do jogador E jogo ativo
if (game.last_move_time && game.current_player === playerColor && game.state === "active") {
  // Calcular tempo decorrido
}
```

### **Correção 3: Logs de Debug Adicionados**
- Console logs para verificar qual timer está ativo
- Logs de carregamento de estado do jogo
- Logs de cálculo de tempo decorrido

## 🎯 **Como Testar:**

1. **Abrir Console do Browser** (F12)
2. **Iniciar um jogo** 
3. **Verificar logs:** 
   ```
   Loading timer state for white: {...}
   Loading timer state for black: {...}
   Timer white: {current_player: "white", shouldBeActive: true}
   Timer black: {current_player: "white", shouldBeActive: false}
   ```
4. **Fazer um movimento** e verificar se os logs mostram troca:
   ```
   Timer white: {current_player: "black", shouldBeActive: false}
   Timer black: {current_player: "black", shouldBeActive: true}
   ```

## 🚨 **Se Timer Ainda Não Funcionar:**

### **Verificações Adicionais:**
1. **Database Schema:** Confirmar se campos `white_time_left`, `black_time_left`, `last_move_time` existem
2. **Inicial Game Creation:** Verificar se jogo é criado com tempos corretos
3. **Real-time Updates:** Verificar se mudanças de turno chegam via Supabase

### **Comandos para Debug Database:**
```sql
-- Verificar estado atual do jogo
SELECT id, current_player, white_time_left, black_time_left, last_move_time, state 
FROM games 
WHERE room_id = 'SEU_ROOM_ID';
```

## 📝 **Próximos Passos:**
1. Teste com logs ativos
2. Se persistir, verificar database diretamente
3. Remover logs após confirmar funcionamento
