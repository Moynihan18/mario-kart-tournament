'use client';

import { useState } from 'react';
import { Heat } from '@/lib/types';

interface HeatCardProps {
  heat: Heat;
  heatNumber: number;
  isActive: boolean;
  isPast: boolean;
  onScoreChange: (playerId: string, score: number) => void;
  onComplete: () => void;
}

const ACCENT_COLORS = [
  'border-l-mk-red',
  'border-l-mk-yellow',
  'border-l-mk-blue',
  'border-l-purple-500',
];

export default function HeatCard({
  heat,
  heatNumber,
  isActive,
  isPast,
  onScoreChange,
  onComplete,
}: HeatCardProps) {
  const [localScores, setLocalScores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    heat.players.forEach((p) => {
      const existing = heat.scores.find((s) => s.playerId === p.id);
      init[p.id] = existing ? String(existing.score) : '';
    });
    return init;
  });

  const accentColor = ACCENT_COLORS[(heatNumber - 1) % ACCENT_COLORS.length];

  const allFilled = heat.players.every(
    (p) => localScores[p.id] !== '' && !isNaN(Number(localScores[p.id])) && Number(localScores[p.id]) >= 0
  );

  function handleScoreInput(playerId: string, value: string) {
    setLocalScores((prev) => ({ ...prev, [playerId]: value }));
    const num = Number(value);
    if (value !== '' && !isNaN(num) && num >= 0) {
      onScoreChange(playerId, num);
    }
  }

  function handleLock() {
    if (!allFilled) return;
    // Flush any pending score changes
    heat.players.forEach((p) => {
      const num = Number(localScores[p.id]);
      onScoreChange(p.id, num);
    });
    onComplete();
  }

  // Determine sorted scores for past/completed display
  const sortedScores = [...heat.scores].sort((a, b) => b.score - a.score);

  const cardBg = isActive ? 'bg-mk-surface' : 'bg-mk-surface/50';
  const cardBorder = heat.completed
    ? 'border-green-600/60'
    : isActive
    ? 'border-mk-yellow/60'
    : 'border-mk-border';

  return (
    <div
      className={`rounded-xl border-l-4 border ${accentColor} ${cardBorder} ${cardBg} overflow-hidden transition-all`}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-mk-border/50">
        <span className="font-semibold text-sm text-white/70">Heat {heatNumber}</span>
        {heat.completed && (
          <span className="text-green-400 text-sm font-medium flex items-center gap-1">
            <span>✓</span> Locked
          </span>
        )}
        {isActive && !heat.completed && (
          <span className="text-mk-yellow text-xs font-medium animate-pulse">LIVE</span>
        )}
      </div>

      {/* Players */}
      <div className="px-4 py-3 space-y-2">
        {heat.completed || isPast ? (
          // Read-only scored view
          sortedScores.map((hs, rank) => {
            const player = heat.players.find((p) => p.id === hs.playerId);
            if (!player) return null;
            return (
              <div key={hs.playerId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold w-4 text-center ${
                      rank === 0 ? 'text-mk-yellow' : 'text-white/30'
                    }`}
                  >
                    {rank + 1}
                  </span>
                  <span className={`text-sm ${isPast ? 'text-white/50' : 'text-white'}`}>
                    {player.name}
                  </span>
                </div>
                <span
                  className={`font-bold text-sm tabular-nums ${
                    rank === 0 ? 'text-mk-yellow' : isPast ? 'text-white/40' : 'text-white/70'
                  }`}
                >
                  {hs.score.toLocaleString()}
                </span>
              </div>
            );
          })
        ) : (
          // Active scoring view
          heat.players.map((player) => (
            <div key={player.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-white flex-1 truncate">{player.name}</span>
              <input
                type="number"
                min={0}
                value={localScores[player.id]}
                onChange={(e) => handleScoreInput(player.id, e.target.value)}
                placeholder="Score"
                className="w-24 bg-mk-dark border border-mk-border rounded-lg px-3 py-1.5 text-right text-white text-sm tabular-nums focus:outline-none focus:border-mk-yellow transition-colors"
              />
            </div>
          ))
        )}

        {/* Show players without scores yet if active but no scores */}
        {isActive && !heat.completed && heat.players.length === 0 && (
          <p className="text-white/30 text-sm">No players</p>
        )}
      </div>

      {/* Lock button */}
      {isActive && !heat.completed && (
        <div className="px-4 pb-4">
          <button
            onClick={handleLock}
            disabled={!allFilled}
            className="w-full py-2 rounded-xl bg-mk-yellow text-mk-dark font-bold text-sm disabled:opacity-30 hover:brightness-110 transition-all active:scale-95"
          >
            Lock Scores
          </button>
        </div>
      )}
    </div>
  );
}
