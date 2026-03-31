'use client';

import { useState } from 'react';
import { Player } from '@/lib/types';

interface SignupPhaseProps {
  players: Player[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onStartTournament: (heatSize: 2 | 3 | 4) => void;
}

export default function SignupPhase({
  players,
  onAddPlayer,
  onRemovePlayer,
  onStartTournament,
}: SignupPhaseProps) {
  const [input, setInput] = useState('');
  const [heatSize, setHeatSize] = useState<2 | 3 | 4>(4);

  function handleAdd() {
    if (!input.trim()) return;
    onAddPlayer(input.trim());
    setInput('');
  }

  const hasOddRemainder = players.length > 0 && players.length % heatSize === 1;
  const canStart = players.length >= 4 && players.length >= heatSize;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">🏎️</div>
        <h1 className="text-5xl font-bold text-mk-yellow tracking-wide">Mario Kart</h1>
        <p className="text-xl text-white/60 mt-2">Tournament Bracket</p>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Player input */}
        <div className="bg-mk-surface border border-mk-border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white/80">Add Players</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Player name..."
              className="flex-1 bg-mk-dark border border-mk-border rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-mk-yellow transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim()}
              className="bg-mk-yellow text-mk-dark font-bold px-5 py-2.5 rounded-xl disabled:opacity-40 hover:brightness-110 transition-all active:scale-95"
            >
              Add
            </button>
          </div>

          {/* Player list */}
          {players.length > 0 && (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {players.map((player, idx) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between bg-mk-dark rounded-xl px-4 py-2.5"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-mk-yellow font-bold text-sm w-5 text-center">
                      {idx + 1}
                    </span>
                    <span className="text-white">{player.name}</span>
                  </span>
                  <button
                    onClick={() => onRemovePlayer(player.id)}
                    className="text-white/30 hover:text-mk-red transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {players.length === 0 && (
            <p className="text-white/30 text-sm text-center py-2">No players yet — add at least 4</p>
          )}
        </div>

        {/* Heat size */}
        <div className="bg-mk-surface border border-mk-border rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-white/80">Players per Heat</h2>
          <div className="flex gap-3">
            {([2, 3, 4] as const).map((size) => (
              <button
                key={size}
                onClick={() => setHeatSize(size)}
                className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all active:scale-95 ${
                  heatSize === size
                    ? 'bg-mk-yellow text-mk-dark'
                    : 'bg-mk-dark border border-mk-border text-white/60 hover:border-mk-yellow/50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {hasOddRemainder && (
            <p className="text-mk-yellow/80 text-sm">
              ⚠️ {players.length} players with heat size {heatSize} leaves 1 leftover — they&apos;ll
              be added to the last heat.
            </p>
          )}
        </div>

        {/* Start button */}
        <button
          onClick={() => onStartTournament(heatSize)}
          disabled={!canStart}
          className="w-full py-4 rounded-2xl bg-mk-red text-white font-bold text-xl tracking-wide disabled:opacity-40 hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-mk-red/20"
        >
          {canStart ? '🏁 Start Tournament' : `Add ${Math.max(0, 4 - players.length)} more player${4 - players.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
