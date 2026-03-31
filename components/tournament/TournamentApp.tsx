'use client';

import { useTournament } from '@/hooks/useTournament';
import SignupPhase from './SignupPhase';
import BracketView from './BracketView';
import Scoreboard from './Scoreboard';
import RoundTransition from './RoundTransition';
import { computeCumulativeScores } from '@/lib/tournament';

export default function TournamentApp() {
  const { state, dispatch } = useTournament();

  if (state.phase === 'signup') {
    return (
      <SignupPhase
        players={state.players}
        onAddPlayer={(name) => dispatch({ type: 'ADD_PLAYER', name })}
        onRemovePlayer={(id) => dispatch({ type: 'REMOVE_PLAYER', id })}
        onStartTournament={(heatSize) => dispatch({ type: 'START_TOURNAMENT', heatSize })}
      />
    );
  }

  if (state.phase === 'roundTransition') {
    const completedRound = state.rounds[state.currentRoundIndex];
    return (
      <RoundTransition
        completedRound={completedRound}
        allRounds={state.rounds}
        players={state.players}
        activePlayers={state.activePlayers}
        onStartNextRound={(heatSize, advanceCount) =>
          dispatch({ type: 'START_NEXT_ROUND', heatSize, advanceCount })
        }
        onFinalize={() => dispatch({ type: 'FINALIZE_TOURNAMENT' })}
      />
    );
  }

  if (state.phase === 'complete') {
    const cumulativeScores = computeCumulativeScores(state.rounds);
    const winner = [...state.players].sort(
      (a, b) => (cumulativeScores.get(b.id) ?? 0) - (cumulativeScores.get(a.id) ?? 0)
    )[0];

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-3">
            <div className="text-6xl">🏆</div>
            <h1 className="text-4xl font-bold text-mk-yellow">Tournament Complete!</h1>
            {winner && (
              <div className="bg-mk-yellow/10 border border-mk-yellow/30 rounded-2xl p-6">
                <p className="text-white/60 text-sm mb-1">Winner</p>
                <p className="text-3xl font-bold text-mk-yellow">{winner.name}</p>
                <p className="text-white/50 text-sm mt-1">
                  {(cumulativeScores.get(winner.id) ?? 0).toLocaleString()} points
                </p>
              </div>
            )}
          </div>

          <Scoreboard
            players={state.players}
            activePlayers={state.players}
            rounds={state.rounds}
          />

          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="w-full py-4 rounded-2xl bg-mk-red text-white font-bold text-lg hover:brightness-110 transition-all active:scale-95"
          >
            🏎️ New Tournament
          </button>
        </div>
      </div>
    );
  }

  // tournament phase
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main bracket area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-mk-border bg-mk-surface">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏎️</span>
            <span className="font-bold text-mk-yellow text-lg">Mario Kart Tournament</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-sm">
              Round {state.currentRoundIndex + 1} of{' '}
              {state.rounds[state.currentRoundIndex]?.isFinal ? 'Final' : '?'}
            </span>
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="text-xs text-white/30 hover:text-white/60 transition-colors border border-mk-border px-3 py-1.5 rounded-lg"
            >
              Reset
            </button>
          </div>
        </div>

        <BracketView
          rounds={state.rounds}
          currentRoundIndex={state.currentRoundIndex}
          onScoreChange={(heatId, playerId, score) =>
            dispatch({ type: 'UPDATE_SCORE', heatId, playerId, score })
          }
          onCompleteHeat={(heatId) => dispatch({ type: 'COMPLETE_HEAT', heatId })}
          onProceedToTransition={() => {
            const currentRound = state.rounds[state.currentRoundIndex];
            if (currentRound?.isFinal) {
              dispatch({ type: 'FINALIZE_TOURNAMENT' });
            } else {
              dispatch({ type: 'PROCEED_TO_TRANSITION' });
            }
          }}
        />
      </div>

      {/* Sidebar scoreboard */}
      <div className="w-56 shrink-0 border-l border-mk-border bg-mk-surface overflow-y-auto p-4">
        <Scoreboard
          players={state.players}
          activePlayers={state.activePlayers}
          rounds={state.rounds}
        />
      </div>
    </div>
  );
}
