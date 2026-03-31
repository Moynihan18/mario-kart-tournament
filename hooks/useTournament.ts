'use client';

import { useReducer, useEffect } from 'react';
import { TournamentState, Player, Heat, HeatScore } from '@/lib/types';
import {
  shuffleAssign,
  seedAssign,
  computeCumulativeScores,
  getAdvancingPlayers,
} from '@/lib/tournament';

const STORAGE_KEY = 'mk-tournament-state';

const initialState: TournamentState = {
  phase: 'signup',
  players: [],
  activePlayers: [],
  rounds: [],
  currentRoundIndex: -1,
};

export type TournamentAction =
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'REMOVE_PLAYER'; id: string }
  | { type: 'START_TOURNAMENT'; heatSize: 2 | 3 | 4 }
  | { type: 'UPDATE_SCORE'; heatId: string; playerId: string; score: number }
  | { type: 'COMPLETE_HEAT'; heatId: string }
  | { type: 'PROCEED_TO_TRANSITION' }
  | { type: 'START_NEXT_ROUND'; heatSize: 2 | 3 | 4; advanceCount: number }
  | { type: 'FINALIZE_TOURNAMENT' }
  | { type: 'RESET' };

function reducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case 'ADD_PLAYER': {
      const trimmed = action.name.trim();
      if (!trimmed) return state;
      const player: Player = { id: crypto.randomUUID(), name: trimmed };
      return { ...state, players: [...state.players, player] };
    }

    case 'REMOVE_PLAYER': {
      return { ...state, players: state.players.filter((p) => p.id !== action.id) };
    }

    case 'START_TOURNAMENT': {
      const heats = shuffleAssign(state.players, action.heatSize);
      const round = {
        id: crypto.randomUUID(),
        roundNumber: 1,
        heatSize: action.heatSize,
        heats,
        advanceCount: 1, // will be set at transition
        isFinal: false,
        completed: false,
      };
      return {
        ...state,
        phase: 'tournament',
        activePlayers: [...state.players],
        rounds: [round],
        currentRoundIndex: 0,
      };
    }

    case 'UPDATE_SCORE': {
      const rounds = state.rounds.map((round, idx) => {
        if (idx !== state.currentRoundIndex) return round;
        const heats: Heat[] = round.heats.map((heat) => {
          if (heat.id !== action.heatId) return heat;
          const existing = heat.scores.find((s) => s.playerId === action.playerId);
          let scores: HeatScore[];
          if (existing) {
            scores = heat.scores.map((s) =>
              s.playerId === action.playerId ? { ...s, score: action.score } : s
            );
          } else {
            scores = [...heat.scores, { playerId: action.playerId, score: action.score }];
          }
          return { ...heat, scores };
        });
        return { ...round, heats };
      });
      return { ...state, rounds };
    }

    case 'COMPLETE_HEAT': {
      const rounds = state.rounds.map((round, idx) => {
        if (idx !== state.currentRoundIndex) return round;
        const heats: Heat[] = round.heats.map((heat) =>
          heat.id === action.heatId ? { ...heat, completed: true } : heat
        );
        return { ...round, heats };
      });
      return { ...state, rounds };
    }

    case 'PROCEED_TO_TRANSITION': {
      const rounds = state.rounds.map((round, idx) => {
        if (idx !== state.currentRoundIndex) return round;
        return { ...round, completed: true };
      });
      return { ...state, phase: 'roundTransition', rounds };
    }

    case 'START_NEXT_ROUND': {
      const currentRound = { ...state.rounds[state.currentRoundIndex], advanceCount: action.advanceCount };
      const updatedRounds = state.rounds.map((r, i) =>
        i === state.currentRoundIndex ? currentRound : r
      );

      const advancing = getAdvancingPlayers(currentRound);
      const cumulativeScores = computeCumulativeScores(updatedRounds);
      const heats = seedAssign(advancing, cumulativeScores, action.heatSize);

      const nextHeatCount = heats.length;
      const isFinal = nextHeatCount === 1;

      const nextRound = {
        id: crypto.randomUUID(),
        roundNumber: currentRound.roundNumber + 1,
        heatSize: action.heatSize,
        heats,
        advanceCount: action.advanceCount,
        isFinal,
        completed: false,
      };

      return {
        ...state,
        phase: 'tournament',
        activePlayers: advancing,
        rounds: [...updatedRounds, nextRound],
        currentRoundIndex: state.currentRoundIndex + 1,
      };
    }

    case 'FINALIZE_TOURNAMENT': {
      return { ...state, phase: 'complete' };
    }

    case 'RESET': {
      return initialState;
    }

    default:
      return state;
  }
}

function loadFromStorage(): TournamentState {
  if (typeof window === 'undefined') return initialState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    return JSON.parse(raw) as TournamentState;
  } catch {
    return initialState;
  }
}

export function useTournament() {
  const [state, dispatch] = useReducer(reducer, initialState, loadFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage quota exceeded — silently ignore
    }
  }, [state]);

  return { state, dispatch };
}
