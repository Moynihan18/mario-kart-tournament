import { Player, Heat, HeatScore, Round } from './types';

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

function createHeat(players: Player[]): Heat {
  return {
    id: generateId(),
    players,
    scores: [],
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

export function predictNextHeatCount(
  currentRound: Round,
  advanceCount: number,
  nextHeatSize: number
): number {
  const totalAdvancing = currentRound.heats.length * advanceCount;
  return Math.ceil(totalAdvancing / nextHeatSize);
}
