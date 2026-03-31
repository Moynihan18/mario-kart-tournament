'use client';

import { useState } from 'react';
import { Round, Player } from '@/lib/types';
import { computeCumulativeScores, computeRoundScores, getAdvancingPlayers, predictNextHeatCount } from '@/lib/tournament';

interface RoundTransitionProps {
  completedRound: Round;
  allRounds: Round[];
  players: Player[];
  activePlayers: Player[];
  onStartNextRound: (heatSize: 2 | 3 | 4, advanceCount: number) => void;
  onFinalize: () => void;
}

export default function RoundTransition({
  completedRound,
  allRounds,
  players,
  activePlayers,
  onStartNextRound,
  onFinalize,
}: RoundTransitionProps) {
  const maxAdvance = completedRound.heatSize - 1;
  const [advanceCount, setAdvanceCount] = useState<number>(Math.min(1, maxAdvance));
  const [nextHeatSize, setNextHeatSize] = useState<2 | 3 | 4>(completedRound.heatSize);

  const roundScores = computeRoundScores(completedRound);
  const cumulativeScores = computeCumulativeScores(allRounds);
  const activeIds = new Set(activePlayers.map((p) => p.id));

  // Simulate advancing players based on selected advanceCount
  const simulatedRound = { ...completedRound, advanceCount };
  const advancingIds = new Set(getAdvancingPlayers(simulatedRound).map((p) => p.id));
  const nextHeatCount = predictNextHeatCount(completedRound, advanceCount, nextHeatSize);
  const wouldBeFinal = nextHeatCount === 1;

  const ranked = [...activePlayers]
    .sort((a, b) => (cumulativeScores.get(b.id) ?? 0) - (cumulativeScores.get(a.id) ?? 0));

  // Show all players (active + eliminated already) for full standings
  const allRanked = [...players]
    .sort((a, b) => (cumulativeScores.get(b.id) ?? 0) - (cumulativeScores.get(a.id) ?? 0));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <h1 className="text-3xl font-bold text-white">
            Round {completedRound.roundNumber} Results
          </h1>
          <p className="text-white/50 mt-1">Choose how to set up the next round</p>
        </div>

        {/* Results table */}
        <div className="bg-mk-surface border border-mk-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-mk-border bg-mk-surface2">
            <div className="grid grid-cols-4 text-xs font-semibold text-white/40 uppercase tracking-wide">
              <span>Player</span>
              <span className="text-right">This Round</span>
              <span className="text-right">Total</span>
              <span className="text-right">Status</span>
            </div>
          </div>
          <div className="divide-y divide-mk-border/30">
            {allRanked.map((player, idx) => {
              const isActive = activeIds.has(player.id);
              const isAdvancing = advancingIds.has(player.id);
              const roundScore = roundScores.get(player.id) ?? 0;
              const total = cumulativeScores.get(player.id) ?? 0;

              return (
                <div
                  key={player.id}
                  className={`px-5 py-3 grid grid-cols-4 items-center ${!isActive ? 'opacity-30' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-4 ${idx === 0 ? 'text-mk-yellow' : 'text-white/30'}`}>
                      {idx + 1}
                    </span>
                    <span className="text-sm text-white truncate">{player.name}</span>
                  </div>
                  <span className="text-right text-sm tabular-nums text-white/70">
                    {isActive ? (roundScore > 0 ? roundScore.toLocaleString() : '—') : '—'}
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums text-white">
                    {total > 0 ? total.toLocaleString() : '—'}
                  </span>
                  <div className="text-right">
                    {!isActive ? (
                      <span className="text-xs text-white/30">Eliminated</span>
                    ) : isAdvancing ? (
                      <span className="text-xs text-green-400 font-medium">✓ Advances</span>
                    ) : (
                      <span className="text-xs text-mk-red font-medium">Eliminated</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next round config */}
        <div className="bg-mk-surface border border-mk-border rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-white">Configure Next Round</h2>

          {/* Advance count */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Advance per heat</label>
            <div className="flex gap-2">
              {Array.from({ length: maxAdvance }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setAdvanceCount(n)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                    advanceCount === n
                      ? 'bg-mk-yellow text-mk-dark'
                      : 'bg-mk-dark border border-mk-border text-white/60 hover:border-mk-yellow/50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/40">
              {completedRound.heats.length} heat{completedRound.heats.length > 1 ? 's' : ''} × {advanceCount} advancing = {completedRound.heats.length * advanceCount} players
            </p>
          </div>

          {/* Heat size */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Players per heat (next round)</label>
            <div className="flex gap-2">
              {([2, 3, 4] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setNextHeatSize(size)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                    nextHeatSize === size
                      ? 'bg-mk-yellow text-mk-dark'
                      : 'bg-mk-dark border border-mk-border text-white/60 hover:border-mk-yellow/50'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className={`rounded-xl px-4 py-3 text-sm ${wouldBeFinal ? 'bg-mk-yellow/10 border border-mk-yellow/30 text-mk-yellow' : 'bg-mk-blue/10 border border-mk-blue/30 text-mk-blue'}`}>
            {wouldBeFinal
              ? `🏆 This will be the FINAL round — all ${completedRound.heats.length * advanceCount} players in 1 heat!`
              : `Next round: ${completedRound.heats.length * advanceCount} players → ${nextHeatCount} heat${nextHeatCount > 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onFinalize}
            className="flex-1 py-3 rounded-xl border border-mk-border text-white/60 font-medium text-sm hover:border-white/40 hover:text-white transition-all"
          >
            End Tournament Now
          </button>
          <button
            onClick={() => onStartNextRound(nextHeatSize, advanceCount)}
            className="flex-2 flex-grow-[2] py-3 rounded-xl bg-mk-red text-white font-bold text-sm hover:brightness-110 transition-all active:scale-95"
          >
            {wouldBeFinal ? '🏆 Start Final Round' : '▶ Start Next Round'}
          </button>
        </div>
      </div>
    </div>
  );
}
