'use client';

import { useReducer, useEffect } from 'react';
import {
  TournamentState,
  Player,
  Heat,
  HeatScore,
  Round,
  Placement,
  LeaderboardEntry,
} from '@/lib/types';
import {
  shuffleAssign,
  seedAssign,
  computeCumulativeScores,
  getAdvancingPlayers,
  addPlayerToHeat,
  reconfigureOpenHeats,
} from '@/lib/tournament';
import { recordTournament, sortLeaderboard } from '@/lib/leaderboard';

const STORAGE_KEY = 'mk-tournament-state';
const LEADERBOARD_KEY = 'mk-leaderboard';

const initialState: TournamentState = {
  phase: 'signup',
  players: [],
  activePlayers: [],
  rounds: [],
  currentRoundIndex: -1,
};

export type TournamentAction =
  | { type: 'HYDRATE'; state: TournamentState; leaderboard: LeaderboardEntry[] }
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'REMOVE_PLAYER'; id: string }
  | { type: 'START_TOURNAMENT'; heatSize: 2 | 3 | 4 }
  | { type: 'ADD_LATE_PLAYER'; name: string; placement: Placement }
  | { type: 'SET_ACTIVE_HEAT'; heatId: string | null }
  | { type: 'REBALANCE_HEATS' }
  | { type: 'UPDATE_SCORE'; heatId: string; playerId: string; score: number }
  | { type: 'COMPLETE_HEAT'; heatId: string }
  | { type: 'PROCEED_TO_TRANSITION' }
  | { type: 'START_NEXT_ROUND'; heatSize: 2 | 3 | 4; advanceCount: number }
  // `at` is supplied by the caller so the reducer stays free of clock reads.
  | { type: 'FINALIZE_TOURNAMENT'; at: string }
  | { type: 'CLEAR_LEADERBOARD' }
  | { type: 'RESET' };

/** Apply a change to the round in progress, leaving every other round alone. */
function mapCurrentRound(
  state: TournamentState,
  fn: (round: Round) => Round
): Round[] {
  return state.rounds.map((round, idx) => (idx === state.currentRoundIndex ? fn(round) : round));
}

function reducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case 'ADD_PLAYER': {
      const trimmed = action.name.trim();
      if (!trimmed) return state;
      const player: Player = { id: crypto.randomUUID(), name: trimmed, joinedAtRound: 0 };
      return { ...state, players: [...state.players, player] };
    }

    case 'REMOVE_PLAYER': {
      return { ...state, players: state.players.filter((p) => p.id !== action.id) };
    }

    case 'START_TOURNAMENT': {
      const heats = shuffleAssign(state.players, action.heatSize);
      const round: Round = {
        id: crypto.randomUUID(),
        roundNumber: 1,
        heatSize: action.heatSize,
        heats,
        activeHeatId: null,
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

    case 'ADD_LATE_PLAYER': {
      const trimmed = action.name.trim();
      if (!trimmed || state.phase !== 'tournament') return state;
      const currentRound = state.rounds[state.currentRoundIndex];
      if (!currentRound) return state;

      const player: Player = {
        id: crypto.randomUUID(),
        name: trimmed,
        joinedAtRound: currentRound.roundNumber,
      };

      let updated: Round;
      if (action.placement.mode === 'heat') {
        updated = addPlayerToHeat(currentRound, action.placement.heatId, player);
        // The chosen heat started or got locked in the meantime — fall back to a
        // rebuild so the new racer always ends up somewhere.
        if (updated === currentRound) updated = reconfigureOpenHeats(currentRound, [player]);
      } else {
        updated = reconfigureOpenHeats(currentRound, [player]);
      }

      return {
        ...state,
        players: [...state.players, player],
        activePlayers: [...state.activePlayers, player],
        rounds: mapCurrentRound(state, () => updated),
      };
    }

    case 'SET_ACTIVE_HEAT': {
      const currentRound = state.rounds[state.currentRoundIndex];
      if (!currentRound) return state;
      // Locked-in heats can't be put back on the track.
      if (action.heatId !== null) {
        const target = currentRound.heats.find((h) => h.id === action.heatId);
        if (!target || target.completed) return state;
      }
      return {
        ...state,
        rounds: mapCurrentRound(state, (round) => ({ ...round, activeHeatId: action.heatId })),
      };
    }

    case 'REBALANCE_HEATS': {
      const currentRound = state.rounds[state.currentRoundIndex];
      if (!currentRound || state.phase !== 'tournament') return state;
      return { ...state, rounds: mapCurrentRound(state, (round) => reconfigureOpenHeats(round)) };
    }

    case 'UPDATE_SCORE': {
      const rounds = mapCurrentRound(state, (round) => {
        const heats: Heat[] = round.heats.map((heat) => {
          // A locked-in heat's result is final.
          if (heat.id !== action.heatId || heat.completed) return heat;
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
      const rounds = mapCurrentRound(state, (round) => {
        const heats: Heat[] = round.heats.map((heat) =>
          heat.id === action.heatId ? { ...heat, completed: true } : heat
        );
        // Locking in the heat that was running frees the slot for the next one.
        const activeHeatId = round.activeHeatId === action.heatId ? null : round.activeHeatId;
        return { ...round, heats, activeHeatId };
      });
      return { ...state, rounds };
    }

    case 'PROCEED_TO_TRANSITION': {
      const rounds = mapCurrentRound(state, (round) => ({
        ...round,
        activeHeatId: null,
        completed: true,
      }));
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

      const nextRound: Round = {
        id: crypto.randomUUID(),
        roundNumber: currentRound.roundNumber + 1,
        heatSize: action.heatSize,
        heats,
        activeHeatId: null,
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
      if (state.phase === 'complete') return state;
      // The last round is closed out here rather than through a transition, so
      // mark it complete — cumulative scores skip unfinished rounds, and without
      // this the deciding round would never count towards anyone's total.
      const rounds = state.rounds.map((round, idx) =>
        idx === state.currentRoundIndex
          ? { ...round, activeHeatId: null, completed: true }
          : round
      );
      return { ...state, phase: 'complete', rounds };
    }

    case 'RESET': {
      return initialState;
    }

    default:
      return state;
  }
}

/** Backfill fields added after a tournament may already have been saved. */
function normalize(state: TournamentState): TournamentState {
  return {
    ...state,
    players: (state.players ?? []).map((p) => ({ ...p, joinedAtRound: p.joinedAtRound ?? 0 })),
    activePlayers: (state.activePlayers ?? []).map((p) => ({
      ...p,
      joinedAtRound: p.joinedAtRound ?? 0,
    })),
    rounds: (state.rounds ?? []).map((r) => ({ ...r, activeHeatId: r.activeHeatId ?? null })),
  };
}

function loadFromStorage(): TournamentState {
  if (typeof window === 'undefined') return initialState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    return normalize(JSON.parse(raw) as TournamentState);
  } catch {
    return initialState;
  }
}

/** Only entries that still look like leaderboard rows survive a read-back. */
function normalizeLeaderboard(entries: unknown): LeaderboardEntry[] {
  if (!Array.isArray(entries)) return [];
  return sortLeaderboard(
    entries.filter(
      (e): e is LeaderboardEntry =>
        !!e && typeof e.name === 'string' && typeof e.totalScore === 'number'
    )
  );
}

function loadLeaderboardFromStorage(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    return normalizeLeaderboard(JSON.parse(raw));
  } catch {
    return [];
  }
}

interface TournamentStore {
  /** False until the saved tournament has been read back from localStorage. */
  hydrated: boolean;
  tournament: TournamentState;
  leaderboard: LeaderboardEntry[];
}

const initialStore: TournamentStore = {
  hydrated: false,
  tournament: initialState,
  leaderboard: [],
};

function storeReducer(store: TournamentStore, action: TournamentAction): TournamentStore {
  if (action.type === 'HYDRATE') {
    return { hydrated: true, tournament: action.state, leaderboard: action.leaderboard };
  }
  if (action.type === 'CLEAR_LEADERBOARD') {
    return store.leaderboard.length === 0 ? store : { ...store, leaderboard: [] };
  }

  const tournament = reducer(store.tournament, action);
  // Nothing moved — in particular, finalizing an already-finished tournament is
  // a no-op, so its results can never be banked twice.
  if (tournament === store.tournament) return store;

  if (action.type === 'FINALIZE_TOURNAMENT') {
    return {
      ...store,
      tournament,
      leaderboard: recordTournament(store.leaderboard, tournament, action.at),
    };
  }
  return { ...store, tournament };
}

export function useTournament() {
  // The server has no localStorage, so the saved tournament is read after mount
  // rather than during the first render — otherwise the server and the client
  // would render different screens and React would throw the tree out on
  // hydration. Components show a placeholder while `hydrated` is false.
  const [store, dispatch] = useReducer(storeReducer, initialStore);

  useEffect(() => {
    dispatch({
      type: 'HYDRATE',
      state: loadFromStorage(),
      leaderboard: loadLeaderboardFromStorage(),
    });
  }, []);

  useEffect(() => {
    // Don't write before the read-back lands, or the empty starting state would
    // overwrite the saved tournament.
    if (!store.hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store.tournament));
    } catch {
      // storage quota exceeded — silently ignore
    }
  }, [store.hydrated, store.tournament]);

  useEffect(() => {
    // Kept under its own key so resetting or corrupting a tournament can't take
    // the accumulated history down with it.
    if (!store.hydrated) return;
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(store.leaderboard));
    } catch {
      // storage quota exceeded — silently ignore
    }
  }, [store.hydrated, store.leaderboard]);

  return {
    state: store.tournament,
    leaderboard: store.leaderboard,
    dispatch,
    hydrated: store.hydrated,
  };
}
