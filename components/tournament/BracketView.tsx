'use client';

import { Round } from '@/lib/types';
import HeatCard from './HeatCard';

interface BracketViewProps {
  rounds: Round[];
  currentRoundIndex: number;
  onScoreChange: (heatId: string, playerId: string, score: number) => void;
  onCompleteHeat: (heatId: string) => void;
  onSetActiveHeat: (heatId: string | null) => void;
  onProceedToTransition: () => void;
}

export default function BracketView({
  rounds,
  currentRoundIndex,
  onScoreChange,
  onCompleteHeat,
  onSetActiveHeat,
  onProceedToTransition,
}: BracketViewProps) {
  const currentRound = rounds[currentRoundIndex];
  const allHeatsComplete = currentRound?.heats.every((h) => h.completed) ?? false;

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable bracket */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 px-6 py-6 min-h-full" style={{ minWidth: 'max-content' }}>
          {rounds.map((round, roundIdx) => {
            const isCurrent = roundIdx === currentRoundIndex;
            const isPast = roundIdx < currentRoundIndex;
            const runningIdx = round.heats.findIndex((h) => h.id === round.activeHeatId);
            const runningHeatNumber = isCurrent && runningIdx >= 0 ? runningIdx + 1 : null;

            return (
              <div
                key={round.id}
                className={`flex flex-col gap-3 w-64 shrink-0 ${isPast ? 'opacity-50' : ''}`}
              >
                {/* Round header */}
                <div
                  className={`rounded-xl px-4 py-2 text-center ${
                    isCurrent
                      ? 'bg-mk-yellow text-mk-dark font-bold'
                      : isPast
                      ? 'bg-mk-surface text-white/50 font-medium'
                      : 'bg-mk-surface text-white/30 font-medium border border-mk-border border-dashed'
                  }`}
                >
                  <span className="text-sm">
                    {round.isFinal ? '🏆 FINAL' : `Round ${round.roundNumber}`}
                  </span>
                  {isCurrent && (
                    <span className="block text-xs font-normal opacity-70">
                      {runningHeatNumber
                        ? `Heat ${runningHeatNumber} running`
                        : 'Pick the heat you’re running'}
                    </span>
                  )}
                </div>

                {/* Heat cards */}
                {round.heats.map((heat, heatIdx) => (
                  <HeatCard
                    key={heat.id}
                    heat={heat}
                    heatNumber={heatIdx + 1}
                    roundNumber={round.roundNumber}
                    isActive={isCurrent}
                    isPast={isPast}
                    isRunning={isCurrent && round.activeHeatId === heat.id}
                    otherHeatRunning={
                      isCurrent && round.activeHeatId !== null && round.activeHeatId !== heat.id
                    }
                    onScoreChange={(playerId, score) => onScoreChange(heat.id, playerId, score)}
                    onComplete={() => onCompleteHeat(heat.id)}
                    onToggleRunning={() =>
                      onSetActiveHeat(round.activeHeatId === heat.id ? null : heat.id)
                    }
                  />
                ))}

                {/* Proceed button at bottom of current round column */}
                {isCurrent && allHeatsComplete && (
                  <button
                    onClick={onProceedToTransition}
                    className="mt-2 w-full py-3 rounded-xl bg-mk-blue text-white font-bold text-sm hover:brightness-110 transition-all active:scale-95 shadow-lg"
                  >
                    {round.isFinal ? '🏆 View Final Results' : '➜ Next Round'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
