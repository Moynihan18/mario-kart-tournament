'use client';

import { Player, Round } from '@/lib/types';
import { computeCumulativeScores } from '@/lib/tournament';

interface ScoreboardProps {
  players: Player[];
  activePlayers: Player[];
  rounds: Round[];
}

export default function Scoreboard({ players, activePlayers, rounds }: ScoreboardProps) {
  const cumulativeScores = computeCumulativeScores(rounds);
  const activeIds = new Set(activePlayers.map((p) => p.id));

  const ranked = [...players]
    .sort((a, b) => (cumulativeScores.get(b.id) ?? 0) - (cumulativeScores.get(a.id) ?? 0))
    .map((player, idx) => ({
      player,
      score: cumulativeScores.get(player.id) ?? 0,
      rank: idx + 1,
      active: activeIds.has(player.id),
    }));

  return (
    <div className="bg-mk-surface border border-mk-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-mk-border">
        <h2 className="font-bold text-sm text-white/70 tracking-wide uppercase">Standings</h2>
      </div>
      <div className="divide-y divide-mk-border/40">
        {ranked.map(({ player, score, rank, active }) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 px-4 py-2.5 ${!active ? 'opacity-40' : ''}`}
          >
            <span
              className={`text-sm font-bold w-5 text-center tabular-nums ${
                rank === 1 ? 'text-mk-yellow' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-white/30'
              }`}
            >
              {rank}
            </span>
            <span className={`flex-1 text-sm truncate ${active ? 'text-white' : 'text-white/40 line-through'}`}>
              {player.name}
            </span>
            <span className="text-sm font-bold tabular-nums text-white/80">
              {score > 0 ? score.toLocaleString() : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
