export interface Player {
  id: string;
  name: string;
}

export interface HeatScore {
  playerId: string;
  score: number;
}

export interface Heat {
  id: string;
  players: Player[];
  scores: HeatScore[];
  completed: boolean;
}

export interface Round {
  id: string;
  roundNumber: number;
  heatSize: 2 | 3 | 4;
  heats: Heat[];
  advanceCount: number;
  isFinal: boolean;
  completed: boolean;
}

export type TournamentPhase = 'signup' | 'tournament' | 'roundTransition' | 'complete';

export interface TournamentState {
  phase: TournamentPhase;
  players: Player[];
  activePlayers: Player[];
  rounds: Round[];
  currentRoundIndex: number;
}
