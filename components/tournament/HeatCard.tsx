'use client';

import { useState } from 'react';
import { Heat } from '@/lib/types';

interface HeatCardProps {
  heat: Heat;
  heatNumber: number;
  roundNumber: number;
  isActive: boolean;
  isPast: boolean;
  /** This heat is the one currently being raced — its line-up is frozen. */
  isRunning: boolean;
  /** Another heat in this round is running, so this one can't be started yet. */
  otherHeatRunning: boolean;
  onScoreChange: (playerId: string, score: number) => void;
  onComplete: () => void;
  onToggleRunning: () => void;
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
  roundNumber,
  isActive,
  isPast,
  isRunning,
  otherHeatRunning,
  onScoreChange,
  onComplete,
  onToggleRunning,
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

  function scoreOf(playerId: string): string {
    // Players slotted in after this card mounted have no local entry yet.
    return localScores[playerId] ?? '';
  }

  const allFilled = heat.players.every((p) => {
    const raw = scoreOf(p.id);
    return raw !== '' && !isNaN(Number(raw)) && Number(raw) >= 0;
  });

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
      const num = Number(scoreOf(p.id));
      onScoreChange(p.id, num);
    });
    onComplete();
  }

  // Determine sorted scores for past/completed display
  const sortedScores = [...heat.scores].sort((a, b) => b.score - a.score);

  const cardBg = isActive ? 'bg-mk-surface' : 'bg-mk-surface/50';
  const cardBorder = heat.completed
    ? 'border-green-600/60'
    : isRunning
    ? 'border-mk-yellow'
    : isActive
    ? 'border-mk-yellow/30'
    : 'border-mk-border';
  const cardRing = isRunning ? 'ring-2 ring-mk-yellow/40' : '';

  return (
    <div
      className={`rounded-xl border-l-4 border ${accentColor} ${cardBorder} ${cardRing} ${cardBg} overflow-hidden transition-all`}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-mk-border/50">
        <span className="font-semibold text-sm text-white/70">
          Heat {heatNumber}
          <span className="ml-2 text-xs font-normal text-white/30">
            {heat.players.length}p
          </span>
        </span>
        {heat.completed ? (
          <span className="text-green-400 text-sm font-medium flex items-center gap-1">
            <span>✓</span> Locked
          </span>
        ) : isRunning ? (
          <span className="text-mk-yellow text-xs font-bold animate-pulse">▶ RUNNING</span>
        ) : isActive ? (
          <span className="text-white/30 text-xs font-medium">Open</span>
        ) : null}
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
              <span className="text-sm text-white flex-1 truncate flex items-center gap-1.5">
                {player.name}
                {player.joinedAtRound === roundNumber && (
                  <span
                    title="Joined mid-tournament"
                    className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-mk-blue bg-mk-blue/15 border border-mk-blue/30 rounded px-1 py-0.5"
                  >
                    New
                  </span>
                )}
              </span>
              <input
                type="number"
                min={0}
                value={scoreOf(player.id)}
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

      {/* Running / lock controls */}
      {isActive && !heat.completed && (
        <div className="px-4 pb-4 space-y-2">
          {isRunning ? (
            <>
              <p className="text-[11px] text-mk-yellow/70 text-center">
                🔒 Line-up frozen while this heat runs
              </p>
              <button
                onClick={handleLock}
                disabled={!allFilled}
                className="w-full py-2 rounded-xl bg-mk-yellow text-mk-dark font-bold text-sm disabled:opacity-30 hover:brightness-110 transition-all active:scale-95"
              >
                Lock In Result
              </button>
              <button
                onClick={onToggleRunning}
                className="w-full py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Not running after all
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onToggleRunning}
                disabled={otherHeatRunning}
                className="w-full py-2 rounded-xl border border-mk-yellow/50 text-mk-yellow font-bold text-sm disabled:opacity-25 disabled:border-mk-border disabled:text-white/30 hover:bg-mk-yellow/10 transition-all active:scale-95"
              >
                ▶ Set as Running
              </button>
              <button
                onClick={handleLock}
                disabled={!allFilled}
                className="w-full py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
              >
                Lock In Result
              </button>
            </>
          )}
        </div>
      )}

      {/* Locked heats can never be edited again */}
      {isActive && heat.completed && (
        <div className="px-4 pb-3">
          <p className="text-[11px] text-green-400/60 text-center">Result is final</p>
        </div>
      )}
    </div>
  );
}
