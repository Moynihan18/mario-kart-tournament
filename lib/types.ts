export interface Player {
  id: string;
  name: string;
  /** Round number the player entered on. 0 = signed up before the tournament started. */
  joinedAtRound: number;
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
  /** The heat currently being raced. Its line-up is frozen while selected. */
  activeHeatId: string | null;
  advanceCount: number;
  isFinal: boolean;
  completed: boolean;
}

export type TournamentPhase = 'signup' | 'tournament' | 'roundTransition' | 'complete';

/** How a mid-tournament entrant is slotted into the current round. */
export type Placement =
  | { mode: 'heat'; heatId: string }
  | { mode: 'reconfigure' };

export interface TournamentState {
  phase: TournamentPhase;
  players: Player[];
  activePlayers: Player[];
  rounds: Round[];
  currentRoundIndex: number;
}
