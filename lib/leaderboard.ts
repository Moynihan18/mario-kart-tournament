import { LeaderboardEntry, Player, Round, TournamentState } from './types';
import { computeCumulativeScores } from './tournament';

/**
 * Racers carry a fresh id each tournament, so the leaderboard matches them by
 * name instead — case- and spacing-insensitively, so "ana" and "Ana " are the
 * same person.
 */
export function leaderboardKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface TournamentResult {
  player: Player;
  score: number;
  /** 1-based finishing position; tied scores share a position. */
  rank: number;
}

/** Final standings for a single tournament, best first. */
export function rankTournament(players: Player[], rounds: Round[]): TournamentResult[] {
  const totals = computeCumulativeScores(rounds);
  const sorted = [...players].sort(
    (a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0)
  );

  const results: TournamentResult[] = [];
  let rank = 0;
  let previousScore: number | null = null;
  sorted.forEach((player, idx) => {
    const score = totals.get(player.id) ?? 0;
    // Equal scores share a position, and the next racer skips the gap (1, 2, 2, 4).
    if (previousScore === null || score !== previousScore) rank = idx + 1;
    previousScore = score;
    results.push({ player, score, rank });
  });
  return results;
}

/** Points each racer earned in this tournament, keyed for leaderboard lookup. */
export function tournamentGains(results: TournamentResult[]): Map<string, number> {
  const gains = new Map<string, number>();
  for (const { player, score } of results) {
    const key = leaderboardKey(player.name);
    if (!key) continue;
    gains.set(key, (gains.get(key) ?? 0) + score);
  }
  return gains;
}

export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      b.wins - a.wins ||
      a.bestFinish - b.bestFinish ||
      a.name.localeCompare(b.name)
  );
}

/**
 * Fold a finished tournament into the running leaderboard: every racer's points
 * are added to their total, their appearance is counted, and a first-place
 * finish is banked as a win.
 */
export function recordTournament(
  leaderboard: LeaderboardEntry[],
  state: TournamentState,
  playedAt: string
): LeaderboardEntry[] {
  const results = rankTournament(state.players, state.rounds);

  // Collapse any same-named racers within this one tournament first, so the
  // tournament is only ever counted once against a given name.
  const perName = new Map<string, { name: string; score: number; rank: number }>();
  for (const { player, score, rank } of results) {
    const key = leaderboardKey(player.name);
    if (!key) continue;
    const seen = perName.get(key);
    perName.set(key, {
      name: player.name.trim(),
      score: (seen?.score ?? 0) + score,
      rank: Math.min(seen?.rank ?? rank, rank),
    });
  }

  const byKey = new Map(leaderboard.map((entry) => [leaderboardKey(entry.name), entry]));
  for (const [key, { name, score, rank }] of perName) {
    const existing = byKey.get(key);
    byKey.set(
      key,
      existing
        ? {
            // Keep the most recent spelling of the name.
            name,
            totalScore: existing.totalScore + score,
            tournamentsPlayed: existing.tournamentsPlayed + 1,
            wins: existing.wins + (rank === 1 ? 1 : 0),
            bestFinish: Math.min(existing.bestFinish, rank),
            lastPlayed: playedAt,
          }
        : {
            name,
            totalScore: score,
            tournamentsPlayed: 1,
            wins: rank === 1 ? 1 : 0,
            bestFinish: rank,
            lastPlayed: playedAt,
          }
    );
  }

  return sortLeaderboard([...byKey.values()]);
}
