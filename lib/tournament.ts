import { Player, Heat, HeatScore, Round, TournamentState } from './types';

function generateId(): string {
  return crypto.randomUUID();
}

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createHeat(players: Player[], scores: HeatScore[] = []): Heat {
  return {
    id: generateId(),
    players,
    scores,
    completed: false,
  };
}

function splitIntoHeats(players: Player[], heatSize: number): Heat[] {
  const heats: Heat[] = [];
  let i = 0;
  while (i < players.length) {
    const group = players.slice(i, i + heatSize);
    heats.push(createHeat(group));
    i += heatSize;
  }
  // Absorb a solo last heat into the previous one
  if (heats.length > 1 && heats[heats.length - 1].players.length === 1) {
    const solo = heats.pop()!;
    heats[heats.length - 1].players.push(...solo.players);
  }
  return heats;
}

/**
 * Split `players` into the fewest heats of at most `heatSize`, spreading players
 * as evenly as possible so no heat is left with a lone racer.
 * Order is preserved, so re-splitting a pool after a small change moves as few
 * players as possible.
 */
export function balancedHeatSizes(playerCount: number, heatSize: number): number[] {
  if (playerCount <= 0) return [];
  const heatCount = Math.max(1, Math.ceil(playerCount / heatSize));
  const base = Math.floor(playerCount / heatCount);
  const remainder = playerCount % heatCount;
  return Array.from({ length: heatCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function shuffleAssign(players: Player[], heatSize: number): Heat[] {
  const shuffled = fisherYatesShuffle(players);
  return splitIntoHeats(shuffled, heatSize);
}

export function seedAssign(
  players: Player[],
  cumulativeScores: Map<string, number>,
  heatSize: number
): Heat[] {
  const sorted = [...players].sort(
    (a, b) => (cumulativeScores.get(b.id) ?? 0) - (cumulativeScores.get(a.id) ?? 0)
  );
  return splitIntoHeats(sorted, heatSize);
}

/**
 * A heat's line-up can only change while it is neither the heat currently being
 * raced nor already locked in.
 */
export function isHeatEditable(heat: Heat, activeHeatId: string | null): boolean {
  return !heat.completed && heat.id !== activeHeatId;
}

/** Heats in the round whose line-ups are still open to change. */
export function getEditableHeats(round: Round): Heat[] {
  return round.heats.filter((h) => isHeatEditable(h, round.activeHeatId));
}

/** Add a player to one specific still-open heat, leaving every other heat untouched. */
export function addPlayerToHeat(round: Round, heatId: string, player: Player): Round {
  const target = round.heats.find((h) => h.id === heatId);
  if (!target || !isHeatEditable(target, round.activeHeatId)) return round;

  const heats = round.heats.map((heat) =>
    heat.id === heatId ? { ...heat, players: [...heat.players, player] } : heat
  );
  return { ...round, heats };
}

/**
 * Rebuild the round's still-open heats from scratch around the current field,
 * optionally folding in new arrivals. The heat being raced and every locked-in
 * heat are left exactly as they are; the regenerated heats take the place of the
 * first open heat so the running order stays intuitive.
 *
 * Scores already entered for a player follow them into their new heat.
 */
export function reconfigureOpenHeats(round: Round, newPlayers: Player[] = []): Round {
  const open = round.heats.filter((h) => isHeatEditable(h, round.activeHeatId));

  const carriedScores = new Map<string, number>();
  for (const heat of open) {
    for (const hs of heat.scores) carriedScores.set(hs.playerId, hs.score);
  }

  const pool = [...open.flatMap((h) => h.players), ...newPlayers];

  const sizes = balancedHeatSizes(pool.length, round.heatSize);
  const rebuilt: Heat[] = [];
  let cursor = 0;
  for (const size of sizes) {
    const group = pool.slice(cursor, cursor + size);
    cursor += size;
    const scores = group
      .filter((p) => carriedScores.has(p.id))
      .map((p) => ({ playerId: p.id, score: carriedScores.get(p.id)! }));
    rebuilt.push(createHeat(group, scores));
  }

  // Splice the rebuilt heats in where the first open heat used to sit, so locked
  // and running heats keep their position in the running order.
  const heats: Heat[] = [];
  let inserted = false;
  for (const heat of round.heats) {
    if (isHeatEditable(heat, round.activeHeatId)) {
      if (!inserted) {
        heats.push(...rebuilt);
        inserted = true;
      }
      continue;
    }
    heats.push(heat);
  }
  if (!inserted) heats.push(...rebuilt);

  return { ...round, heats };
}

/** Standalone label for a tournament, e.g. "Round 2 · 9 racers". */
export function describeTournament(state: TournamentState): string {
  const racers = `${state.players.length} racer${state.players.length === 1 ? '' : 's'}`;
  if (state.phase === 'complete') return `Finished tournament · ${racers}`;

  const round = state.rounds[state.currentRoundIndex];
  if (!round) return racers;
  return `${round.isFinal ? 'Final round' : `Round ${round.roundNumber}`} · ${racers}`;
}

export function computeCumulativeScores(rounds: Round[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const round of rounds) {
    if (!round.completed) continue;
    for (const heat of round.heats) {
      for (const hs of heat.scores) {
        totals.set(hs.playerId, (totals.get(hs.playerId) ?? 0) + hs.score);
      }
    }
  }
  return totals;
}

export function getAdvancingPlayers(round: Round): Player[] {
  const advancing: Player[] = [];
  for (const heat of round.heats) {
    const sorted = [...heat.scores].sort((a, b) => b.score - a.score);
    const topScores = sorted.slice(0, round.advanceCount);
    for (const hs of topScores) {
      const player = heat.players.find((p) => p.id === hs.playerId);
      if (player) advancing.push(player);
    }
  }
  return advancing;
}

export function computeRoundScores(round: Round): Map<string, number> {
  const scores = new Map<string, number>();
  for (const heat of round.heats) {
    for (const hs of heat.scores) {
      scores.set(hs.playerId, (scores.get(hs.playerId) ?? 0) + hs.score);
    }
  }
  return scores;
}

export function wouldBeFinal(playerCount: number, heatSize: number): boolean {
  return Math.ceil(playerCount / heatSize) === 1;
}

/**
 * How many players actually move on. Heats can hold fewer than `heatSize`
 * racers once the field has been reshuffled mid-round, and a heat can never
 * advance more players than it has.
 */
export function predictAdvancingCount(currentRound: Round, advanceCount: number): number {
  return currentRound.heats.reduce(
    (total, heat) => total + Math.min(advanceCount, heat.players.length),
    0
  );
}

export function predictNextHeatCount(
  currentRound: Round,
  advanceCount: number,
  nextHeatSize: number
): number {
  return Math.ceil(predictAdvancingCount(currentRound, advanceCount) / nextHeatSize);
}
