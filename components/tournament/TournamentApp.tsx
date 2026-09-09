'use client';

import { useTournament } from '@/hooks/useTournament';
import SignupPhase from './SignupPhase';
import BracketView from './BracketView';
import Scoreboard from './Scoreboard';
import RoundTransition from './RoundTransition';
import AddPlayerPanel from './AddPlayerPanel';
import Leaderboard from './Leaderboard';
import { rankTournament, tournamentGains } from '@/lib/leaderboard';
import { describeTournament } from '@/lib/tournament';

export default function TournamentApp() {
  const { state, leaderboard, undo, dispatch, hydrated } = useTournament();

  // Rendered on the server and on the first client render alike, while any saved
  // tournament is read back from localStorage.
  if (!hydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="text-6xl animate-pulse">🏎️</div>
        <p className="text-white/30 text-sm">Loading tournament…</p>
      </div>
    );
  }

  if (state.phase === 'signup') {
    return (
      <SignupPhase
        players={state.players}
        leaderboard={leaderboard}
        undoDescription={undo ? describeTournament(undo) : null}
        onAddPlayer={(name) => dispatch({ type: 'ADD_PLAYER', name })}
        onRemovePlayer={(id) => dispatch({ type: 'REMOVE_PLAYER', id })}
        onStartTournament={(heatSize) => dispatch({ type: 'START_TOURNAMENT', heatSize })}
        onClearLeaderboard={() => dispatch({ type: 'CLEAR_LEADERBOARD' })}
        onUndoReset={() => dispatch({ type: 'UNDO_RESET' })}
        onDismissUndo={() => dispatch({ type: 'DISMISS_UNDO' })}
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
        onFinalize={() => dispatch({ type: 'FINALIZE_TOURNAMENT', at: new Date().toISOString() })}
      />
    );
  }

  if (state.phase === 'complete') {
    const results = rankTournament(state.players, state.rounds);
    const gains = tournamentGains(results);
    const winner = results[0];

    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-3">
            <div className="text-6xl">🏆</div>
            <h1 className="text-4xl font-bold text-mk-yellow">Tournament Complete!</h1>
            {winner && (
              <div className="bg-mk-yellow/10 border border-mk-yellow/30 rounded-2xl p-6">
                <p className="text-white/60 text-sm mb-1">Winner</p>
                <p className="text-3xl font-bold text-mk-yellow">{winner.player.name}</p>
                <p className="text-white/50 text-sm mt-1">
                  {winner.score.toLocaleString()} points
                </p>
              </div>
            )}
            <p className="text-green-400/80 text-sm">
              ✓ Results banked — every racer&apos;s points were added to the leaderboard.
            </p>
          </div>

          <Scoreboard
            players={state.players}
            activePlayers={state.players}
            rounds={state.rounds}
          />

          <Leaderboard entries={leaderboard} gains={gains} />

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
  const currentRound = state.rounds[state.currentRoundIndex];

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
              Round {state.currentRoundIndex + 1} of {currentRound?.isFinal ? 'Final' : '?'}
            </span>
            {currentRound && (
              <span className="text-white/30 text-sm border-l border-mk-border pl-3">
                {currentRound.heats.filter((h) => h.completed).length}/{currentRound.heats.length}{' '}
                heats locked · {state.activePlayers.length} racers
              </span>
            )}
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
          onSetActiveHeat={(heatId) => dispatch({ type: 'SET_ACTIVE_HEAT', heatId })}
          onProceedToTransition={() => {
            if (currentRound?.isFinal) {
              dispatch({ type: 'FINALIZE_TOURNAMENT', at: new Date().toISOString() });
            } else {
              dispatch({ type: 'PROCEED_TO_TRANSITION' });
            }
          }}
        />
      </div>

      {/* Sidebar: standings + mid-tournament entry */}
      <div className="w-64 shrink-0 border-l border-mk-border bg-mk-surface overflow-y-auto p-4 space-y-4">
        {currentRound && (
          <AddPlayerPanel
            round={currentRound}
            onAddLatePlayer={(name, placement) =>
              dispatch({ type: 'ADD_LATE_PLAYER', name, placement })
            }
            onRebalance={() => dispatch({ type: 'REBALANCE_HEATS' })}
          />
        )}

        <Scoreboard
          players={state.players}
          activePlayers={state.activePlayers}
          rounds={state.rounds}
        />
      </div>
    </div>
  );
}
