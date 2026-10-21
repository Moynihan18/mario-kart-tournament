'use client';

import { Player, Round } from '@/lib/types';
import { computeCumulativeScores } from '@/lib/tournament';

interface ScoreboardProps {
  players: Player[];
  activePlayers: Player[];
  rounds: Round[];
  withdrawn?: string[];
  /** Omitted outside a running tournament, which hides the drop-out controls. */
  onWithdraw?: (id: string) => void;
  onRejoin?: (id: string) => void;
}

export default function Scoreboard({
  players,
  activePlayers,
  rounds,
  withdrawn = [],
  onWithdraw,
  onRejoin,
}: ScoreboardProps) {
  const cumulativeScores = computeCumulativeScores(rounds);
  const activeIds = new Set(activePlayers.map((p) => p.id));
  const withdrawnIds = new Set(withdrawn);

  const ranked = [...players]
    .sort((a, b) => (cumulativeScores.get(b.id) ?? 0) - (cumulativeScores.get(a.id) ?? 0))
    .map((player, idx) => ({
      player,
      score: cumulativeScores.get(player.id) ?? 0,
      rank: idx + 1,
      active: activeIds.has(player.id),
      hasWithdrawn: withdrawnIds.has(player.id),
    }));

  return (
    <div className="bg-mk-surface border border-mk-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-mk-border">
        <h2 className="font-bold text-sm text-white/70 tracking-wide uppercase">Standings</h2>
      </div>
      <div className="divide-y divide-mk-border/40">
        {ranked.map(({ player, score, rank, active, hasWithdrawn }) => (
          <div
            key={player.id}
            className={`group flex items-center gap-2 px-4 py-2.5 ${
              hasWithdrawn ? 'opacity-60' : !active ? 'opacity-40' : ''
            }`}
          >
            <span
              className={`text-sm font-bold w-5 text-center tabular-nums shrink-0 ${
                rank === 1 ? 'text-mk-yellow' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-white/30'
              }`}
            >
              {rank}
            </span>
            <span className={`flex-1 min-w-0 text-sm truncate flex items-center gap-1.5 ${active ? 'text-white' : 'text-white/40 line-through'}`}>
              <span className="truncate">{player.name}</span>
              {player.joinedAtRound > 0 && (
                <span
                  title={`Joined during round ${player.joinedAtRound}`}
                  className="shrink-0 text-[10px] font-bold text-mk-blue"
                >
                  R{player.joinedAtRound}
                </span>
              )}
              {hasWithdrawn && (
                <span
                  title="Dropped out"
                  className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-400"
                >
                  Out
                </span>
              )}
            </span>
            <span className="text-sm font-bold tabular-nums text-white/80">
              {score > 0 ? score.toLocaleString() : '—'}
            </span>

            {hasWithdrawn && onRejoin ? (
              <button
                onClick={() => onRejoin(player.id)}
                aria-label={`Bring ${player.name} back`}
                title="Bring them back"
                className="shrink-0 text-amber-400/60 hover:text-amber-300 transition-colors text-xs leading-none px-0.5"
              >
                ↩
              </button>
            ) : active && onWithdraw ? (
              <button
                onClick={() => onWithdraw(player.id)}
                aria-label={`${player.name} dropped out`}
                title="Dropped out"
                className="shrink-0 text-white/0 group-hover:text-white/30 hover:!text-amber-400 focus:text-white/30 transition-colors text-xs leading-none px-0.5"
              >
                ⊘
              </button>
            ) : (
              <span className="shrink-0 w-3" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
