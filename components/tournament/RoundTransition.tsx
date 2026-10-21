'use client';

import { useState } from 'react';
import { Round, Player } from '@/lib/types';
import {
  AdvanceRule,
  balancedHeatSizes,
  computeCumulativeScores,
  computeRoundScores,
  rankByPoints,
  roundField,
  selectAdvancing,
  tiedAtCut,
} from '@/lib/tournament';

interface RoundTransitionProps {
  completedRound: Round;
  allRounds: Round[];
  players: Player[];
  activePlayers: Player[];
  withdrawn: string[];
  onStartNextRound: (
    heatSize: 2 | 3 | 4,
    advanceCount: number,
    advancingIds: string[]
  ) => void;
  onWithdraw: (id: string) => void;
  onRejoin: (id: string) => void;
  onFinalize: () => void;
}

const RULES: { id: AdvanceRule; label: string; hint: string }[] = [
  { id: 'totalPoints', label: 'Best overall', hint: 'highest running totals in the tournament' },
  { id: 'roundPoints', label: 'Best this round', hint: 'highest scores of this round, across every heat' },
  { id: 'perHeat', label: 'Top per heat', hint: 'the best finishers inside each heat' },
];

export default function RoundTransition({
  completedRound,
  allRounds,
  players,
  activePlayers,
  withdrawn,
  onStartNextRound,
  onWithdraw,
  onRejoin,
  onFinalize,
}: RoundTransitionProps) {
  const withdrawnIds = new Set(withdrawn);
  const maxAdvance = completedRound.heatSize - 1;

  const roundScores = computeRoundScores(completedRound);
  const cumulativeScores = computeCumulativeScores(allRounds);
  const activeIds = new Set(activePlayers.map((p) => p.id));
  const field = roundField(completedRound, withdrawnIds);

  // Two counts, because the number means different things: racers per heat,
  // versus racers in total.
  const defaultTopCount = Math.min(Math.max(completedRound.heats.length, 2), field.length);
  const [rule, setRule] = useState<AdvanceRule>('totalPoints');
  const [perHeatCount, setPerHeatCount] = useState<number>(Math.min(1, maxAdvance));
  const [topCount, setTopCount] = useState<number>(defaultTopCount);
  const [nextHeatSize, setNextHeatSize] = useState<2 | 3 | 4>(completedRound.heatSize);

  const count = rule === 'perHeat' ? perHeatCount : topCount;
  const seed = (r: AdvanceRule, n: number) =>
    selectAdvancing(completedRound, r, n, cumulativeScores, withdrawnIds);

  const [advancing, setAdvancing] = useState<Set<string>>(() =>
    seed('totalPoints', defaultTopCount)
  );

  // Changing the rule or the count re-seeds; individual taps then edit it.
  function chooseRule(next: AdvanceRule) {
    setRule(next);
    setAdvancing(seed(next, next === 'perHeat' ? perHeatCount : topCount));
  }
  function choosePerHeatCount(n: number) {
    setPerHeatCount(n);
    setAdvancing(seed('perHeat', n));
  }
  function chooseTopCount(n: number) {
    const clamped = Math.min(Math.max(n, 1), Math.max(field.length, 1));
    setTopCount(clamped);
    setAdvancing(seed(rule, clamped));
  }

  function toggleAdvancing(id: string) {
    setAdvancing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleWithdraw(id: string) {
    setAdvancing((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    onWithdraw(id);
  }

  const ruleSeed = seed(rule, count);
  const isCustomised =
    ruleSeed.size !== advancing.size || [...advancing].some((id) => !ruleSeed.has(id));

  const ranked = rule === 'perHeat' ? [] : rankByPoints(completedRound, rule, cumulativeScores, withdrawnIds);
  const tied = isCustomised ? [] : tiedAtCut(ranked, count);

  const advancingCount = advancing.size;
  const nextHeatSizes = balancedHeatSizes(advancingCount, nextHeatSize);
  const nextHeatCount = nextHeatSizes.length;
  const wouldBeFinal = advancingCount > 0 && nextHeatCount === 1;
  const tooFewToContinue = advancingCount < 2;

  const judgedOn: 'round' | 'total' | null =
    rule === 'roundPoints' ? 'round' : rule === 'totalPoints' ? 'total' : null;
  const judgedCell = 'text-mk-yellow';
  const judgedHead = 'text-mk-yellow/70';

  // Show all players (active + eliminated already) for full standings
  const allRanked = [...players].sort(
    (a, b) => (cumulativeScores.get(b.id) ?? 0) - (cumulativeScores.get(a.id) ?? 0)
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <h1 className="text-3xl font-bold text-white">
            Round {completedRound.roundNumber} Results
          </h1>
          <p className="text-white/50 mt-1">
            Tap a status to move someone through or knock them out
          </p>
        </div>

        {/* Results table */}
        <div className="bg-mk-surface border border-mk-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-mk-border bg-mk-surface2">
            <div className="grid grid-cols-[1fr_5rem_5rem_8rem] gap-2 text-xs font-semibold text-white/40 uppercase tracking-wide">
              <span>Player</span>
              <span className={`text-right ${judgedOn === 'round' ? judgedHead : ''}`}>
                This Round
              </span>
              <span className={`text-right ${judgedOn === 'total' ? judgedHead : ''}`}>Total</span>
              <span className="text-right">Status</span>
            </div>
          </div>
          <div className="divide-y divide-mk-border/30">
            {allRanked.map((player, idx) => {
              const hasWithdrawn = withdrawnIds.has(player.id);
              const wasInRound = activeIds.has(player.id) || hasWithdrawn;
              const isAdvancing = advancing.has(player.id);
              const roundScore = roundScores.get(player.id) ?? 0;
              const total = cumulativeScores.get(player.id) ?? 0;

              return (
                <div
                  key={player.id}
                  className={`px-5 py-3 grid grid-cols-[1fr_5rem_5rem_8rem] gap-2 items-center ${
                    !wasInRound ? 'opacity-30' : hasWithdrawn ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs font-bold w-4 shrink-0 ${
                        idx === 0 ? 'text-mk-yellow' : 'text-white/30'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm text-white truncate">{player.name}</span>
                  </div>
                  <span
                    className={`text-right text-sm tabular-nums ${
                      judgedOn === 'round' ? `font-bold ${judgedCell}` : 'text-white/70'
                    }`}
                  >
                    {wasInRound && roundScore > 0 ? roundScore.toLocaleString() : '—'}
                  </span>
                  <span
                    className={`text-right text-sm font-bold tabular-nums ${
                      judgedOn === 'total' ? judgedCell : 'text-white'
                    }`}
                  >
                    {total > 0 ? total.toLocaleString() : '—'}
                  </span>

                  <div className="flex items-center justify-end gap-1">
                    {!wasInRound ? (
                      <span className="text-xs text-white/30 px-2">Out</span>
                    ) : hasWithdrawn ? (
                      <button
                        onClick={() => onRejoin(player.id)}
                        title="Bring them back into the tournament"
                        className="text-xs font-medium text-amber-400/80 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400/60 rounded-lg px-2 py-1 transition-all active:scale-95"
                      >
                        Withdrew ↩
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleAdvancing(player.id)}
                          title={
                            isAdvancing
                              ? 'Click to knock them out instead'
                              : 'Click to send them through instead'
                          }
                          className={`text-xs font-medium rounded-lg px-2 py-1 border transition-all active:scale-95 ${
                            isAdvancing
                              ? 'text-green-400 border-green-500/40 bg-green-500/10 hover:bg-green-500/20'
                              : 'text-mk-red border-mk-red/40 bg-mk-red/10 hover:bg-mk-red/20'
                          }`}
                        >
                          {isAdvancing ? '✓ Advances' : 'Eliminated'}
                        </button>
                        <button
                          onClick={() => handleWithdraw(player.id)}
                          aria-label={`${player.name} dropped out`}
                          title="Dropped out"
                          className="shrink-0 text-white/25 hover:text-amber-400 transition-colors text-sm leading-none px-1"
                        >
                          ⊘
                        </button>
                      </>
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

          {/* Who qualifies */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Who goes through</label>
            <div className="flex gap-2">
              {RULES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => chooseRule(r.id)}
                  title={r.hint}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                    rule === r.id
                      ? 'bg-mk-yellow text-mk-dark'
                      : 'bg-mk-dark border border-mk-border text-white/60 hover:border-mk-yellow/50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/40">
              {RULES.find((r) => r.id === rule)!.hint}
            </p>
          </div>

          {/* How many */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <label className="text-sm text-white/60">
                {rule === 'perHeat' ? 'Advance per heat' : 'How many advance'}
              </label>
              {isCustomised && (
                <button
                  onClick={() => setAdvancing(seed(rule, count))}
                  className="text-xs text-mk-yellow/70 hover:text-mk-yellow transition-colors"
                >
                  ↺ Reset to the rule
                </button>
              )}
            </div>

            {rule === 'perHeat' ? (
              <div className="flex gap-2">
                {Array.from({ length: maxAdvance }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => choosePerHeatCount(n)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                      perHeatCount === n && !isCustomised
                        ? 'bg-mk-yellow text-mk-dark'
                        : 'bg-mk-dark border border-mk-border text-white/60 hover:border-mk-yellow/50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 max-w-[11rem]">
                <button
                  onClick={() => chooseTopCount(topCount - 1)}
                  disabled={topCount <= 1}
                  aria-label="One fewer advancing"
                  className="w-11 py-2.5 rounded-xl bg-mk-dark border border-mk-border text-white/60 font-bold text-lg leading-none disabled:opacity-30 hover:border-mk-yellow/50 transition-all active:scale-95"
                >
                  −
                </button>
                <span className="flex-1 text-center font-bold text-lg tabular-nums text-mk-yellow">
                  {topCount}
                </span>
                <button
                  onClick={() => chooseTopCount(topCount + 1)}
                  disabled={topCount >= field.length}
                  aria-label="One more advancing"
                  className="w-11 py-2.5 rounded-xl bg-mk-dark border border-mk-border text-white/60 font-bold text-lg leading-none disabled:opacity-30 hover:border-mk-yellow/50 transition-all active:scale-95"
                >
                  +
                </button>
              </div>
            )}

            <p className="text-xs text-white/40">
              {isCustomised
                ? `Hand-picked — ${advancingCount} player${advancingCount === 1 ? '' : 's'} going through`
                : rule === 'perHeat'
                ? `${completedRound.heats.length} heat${
                    completedRound.heats.length > 1 ? 's' : ''
                  } × up to ${perHeatCount} advancing = ${advancingCount} player${
                    advancingCount === 1 ? '' : 's'
                  }`
                : `Top ${advancingCount} of ${field.length} still racing`}
            </p>

            {tied.length > 1 && (
              <p className="text-xs text-amber-400/80">
                ⚠ {tied.map((p) => p.name).join(', ')} are level on{' '}
                {(rule === 'totalPoints'
                  ? cumulativeScores.get(tied[0].id)
                  : roundScores.get(tied[0].id)
                )?.toLocaleString()}{' '}
                at the cut — pick between them by hand.
              </p>
            )}
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
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              tooFewToContinue
                ? 'bg-mk-red/10 border border-mk-red/30 text-mk-red'
                : wouldBeFinal
                ? 'bg-mk-yellow/10 border border-mk-yellow/30 text-mk-yellow'
                : 'bg-mk-blue/10 border border-mk-blue/30 text-mk-blue'
            }`}
          >
            {tooFewToContinue
              ? `Pick at least 2 players to race another round — or end the tournament here.`
              : wouldBeFinal
              ? `🏆 This will be the FINAL round — all ${advancingCount} players in 1 heat!`
              : `Next round: ${advancingCount} players → ${nextHeatCount} heat${
                  nextHeatCount > 1 ? 's' : ''
                } (${nextHeatSizes.join(' + ')})`}
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
            onClick={() => onStartNextRound(nextHeatSize, count, [...advancing])}
            disabled={tooFewToContinue}
            className="flex-2 flex-grow-[2] py-3 rounded-xl bg-mk-red text-white font-bold text-sm disabled:opacity-30 hover:brightness-110 transition-all active:scale-95"
          >
            {wouldBeFinal ? '🏆 Start Final Round' : '▶ Start Next Round'}
          </button>
        </div>
      </div>
    </div>
  );
}
