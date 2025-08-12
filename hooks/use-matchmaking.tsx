"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './use-auth'
import type { GameRoom, TimeControl, UserProfile } from '@/lib/types/game'

interface MatchmakingPreferences {
  timeControl: TimeControl
  minElo?: number
  maxElo?: number
  betAmount?: number
  autoAccept?: boolean
}

interface MatchmakingSession {
  id: string
  user_id: string
  preferences: MatchmakingPreferences
  created_at: string
  status: 'searching' | 'matched' | 'cancelled'
  user_profile?: UserProfile
}

export function useMatchmaking() {
  const { user } = useAuth()
  const [isSearching, setIsSearching] = useState(false)
  const [matchmakingSession, setMatchmakingSession] = useState<MatchmakingSession | null>(null)
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number | null>(null)
  const [activeSearches, setActiveSearches] = useState<number>(0)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  // Load user profile
  useEffect(() => {
    if (!user) return

    const loadUserProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserProfile(profile)
      }
    }

    loadUserProfile()
  }, [user])

  // Start matchmaking search
  const startSearch = useCallback(async (preferences: MatchmakingPreferences) => {
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    try {
      setIsSearching(true)
      
      // Create matchmaking session
      const { data: session, error } = await supabase
        .from('matchmaking_sessions')
        .insert({
          user_id: user.id,
          preferences,
          status: 'searching'
        })
        .select()
        .single()

      if (error) throw error

      setMatchmakingSession(session)
      
      // Try to find immediate match
      await findMatch(session.id, preferences)
      
    } catch (error) {
      console.error('Erro ao iniciar busca:', error)
      setIsSearching(false)
      throw error
    }
  }, [user])

  // Cancel matchmaking search
  const cancelSearch = useCallback(async () => {
    if (!matchmakingSession) return

    try {
      await supabase
        .from('matchmaking_sessions')
        .update({ status: 'cancelled' })
        .eq('id', matchmakingSession.id)

      setMatchmakingSession(null)
      setIsSearching(false)
      setEstimatedWaitTime(null)
    } catch (error) {
      console.error('Erro ao cancelar busca:', error)
    }
  }, [matchmakingSession])

  // Find a suitable match
  const findMatch = useCallback(async (sessionId: string, preferences: MatchmakingPreferences) => {
    if (!user) return

    try {
      // Look for compatible open rooms first
      const { data: rooms, error: roomsError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          creator:profiles!game_rooms_creator_id_fkey(username, elo_rating)
        `)
        .eq('status', 'waiting')
        .neq('creator_id', user.id)

      if (roomsError) throw roomsError

      // Filter rooms by preferences
      const compatibleRooms = rooms?.filter(room => {
        // Check time control match
        if (room.time_control.type !== preferences.timeControl.type) return false
        if (room.time_control.minutes !== preferences.timeControl.minutes) return false
        if (room.time_control.increment !== preferences.timeControl.increment) return false

        // Check ELO restrictions
        const creatorElo = room.creator?.elo_rating || 1200
        const userElo = userProfile?.elo_rating || 1200
        if (preferences.minElo && creatorElo < preferences.minElo) return false
        if (preferences.maxElo && creatorElo > preferences.maxElo) return false
        if (room.min_elo && userElo < room.min_elo) return false
        if (room.max_elo && userElo > room.max_elo) return false

        // Check bet amount
        if (preferences.betAmount && room.bet_amount !== preferences.betAmount) return false

        return true
      }) || []

      if (compatibleRooms.length > 0) {
        // Join the first compatible room
        const room = compatibleRooms[0]
        await joinRoom(room.id, sessionId)
        return
      }

      // Look for other matchmaking sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('matchmaking_sessions')
        .select('*')
        .eq('status', 'searching')
        .neq('user_id', user.id)

      if (sessionsError) throw sessionsError

      // Find compatible sessions
      const compatibleSessions = sessions?.filter(session => {
        const sessionPrefs = session.preferences as MatchmakingPreferences
        
        // Check time control match
        if (sessionPrefs.timeControl.type !== preferences.timeControl.type) return false
        if (sessionPrefs.timeControl.minutes !== preferences.timeControl.minutes) return false
        if (sessionPrefs.timeControl.increment !== preferences.timeControl.increment) return false

        // Check bet amount
        if (sessionPrefs.betAmount !== preferences.betAmount) return false

        // Check ELO compatibility (both ways)
        const userElo = userProfile?.elo_rating || 1200
        if (sessionPrefs.minElo && userElo < sessionPrefs.minElo) return false
        if (sessionPrefs.maxElo && userElo > sessionPrefs.maxElo) return false
        // For matching sessions, we would need to fetch their profiles
        // This is simplified for now

        return true
      }) || []

      if (compatibleSessions.length > 0) {
        // Create a game room for the match
        const opponentSession = compatibleSessions[0]
        await createMatchedGame(sessionId, opponentSession.id, preferences)
      }

    } catch (error) {
      console.error('Erro ao buscar partida:', error)
    }
  }, [user])

  // Join an existing room
  const joinRoom = useCallback(async (roomId: string, sessionId: string) => {
    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({ 
          opponent_id: user?.id,
          status: 'playing'
        })
        .eq('id', roomId)

      if (error) throw error

      // Cancel matchmaking session
      await supabase
        .from('matchmaking_sessions')
        .update({ status: 'matched' })
        .eq('id', sessionId)

      setIsSearching(false)
      setMatchmakingSession(null)

      // Redirect to game
      window.location.href = `/game/${roomId}`

    } catch (error) {
      console.error('Erro ao entrar na sala:', error)
      throw error
    }
  }, [user])

  // Create a new game room for matched players
  const createMatchedGame = useCallback(async (sessionId: string, opponentSessionId: string, preferences: MatchmakingPreferences) => {
    if (!user) return

    try {
      // Get opponent user ID first
      const { data: opponentSession, error: sessionError } = await supabase
        .from('matchmaking_sessions')
        .select('user_id')
        .eq('id', opponentSessionId)
        .single()

      if (sessionError) throw sessionError

      // Get opponent profile
      const { data: opponentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', opponentSession.user_id)
        .single()

      if (profileError) throw profileError

      // Create game room
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          name: `Partida Automática: ${userProfile?.username || 'Anônimo'} vs ${opponentProfile?.username || 'Anônimo'}`,
          creator_id: user.id,
          opponent_id: opponentSession.user_id,
          time_control: preferences.timeControl,
          bet_amount: preferences.betAmount || 0,
          status: 'playing',
          is_private: false
        })
        .select()
        .single()

      if (roomError) throw roomError

      // Mark both sessions as matched
      await Promise.all([
        supabase
          .from('matchmaking_sessions')
          .update({ status: 'matched' })
          .eq('id', sessionId),
        supabase
          .from('matchmaking_sessions')
          .update({ status: 'matched' })
          .eq('id', opponentSessionId)
      ])

      setIsSearching(false)
      setMatchmakingSession(null)

      // Redirect to game
      window.location.href = `/game/${room.id}`

    } catch (error) {
      console.error('Erro ao criar partida:', error)
      throw error
    }
  }, [user])

  // Calculate estimated wait time based on active searches
  const calculateWaitTime = useCallback((preferences: MatchmakingPreferences) => {
    // Simple estimation based on number of active searches
    // In a real app, this would use historical data
    let baseTime = 30 // 30 seconds base
    
    if (activeSearches < 5) baseTime = 60 // More time if few people searching
    if (activeSearches > 20) baseTime = 15 // Less time if many people searching
    
    // Adjust for specific preferences
    if (preferences.betAmount && preferences.betAmount > 10) baseTime *= 1.5 // Betting takes longer
    if (preferences.minElo || preferences.maxElo) baseTime *= 1.3 // ELO restrictions take longer
    
    return Math.round(baseTime)
  }, [activeSearches])

  // Subscribe to matchmaking updates
  useEffect(() => {
    if (!user || !isSearching) return

    const channel = supabase
      .channel('matchmaking')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matchmaking_sessions'
      }, (payload) => {
        // Check if we got matched
        if (payload.eventType === 'UPDATE' && 
            payload.new.user_id === user.id && 
            payload.new.status === 'matched') {
          setIsSearching(false)
          setMatchmakingSession(null)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, isSearching])

  // Get active searches count
  useEffect(() => {
    const getActiveSearches = async () => {
      const { count } = await supabase
        .from('matchmaking_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'searching')

      setActiveSearches(count || 0)
    }

    getActiveSearches()
    
    // Update every 10 seconds
    const interval = setInterval(getActiveSearches, 10000)
    return () => clearInterval(interval)
  }, [])

  // Update estimated wait time when preferences or active searches change
  useEffect(() => {
    if (matchmakingSession) {
      const waitTime = calculateWaitTime(matchmakingSession.preferences as MatchmakingPreferences)
      setEstimatedWaitTime(waitTime)
    }
  }, [matchmakingSession, activeSearches, calculateWaitTime])

  return {
    isSearching,
    matchmakingSession,
    estimatedWaitTime,
    activeSearches,
    startSearch,
    cancelSearch
  }
}
