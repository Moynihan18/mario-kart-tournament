'use client';

import { useMemo, useState } from 'react';
import { Round, Placement } from '@/lib/types';
import { balancedHeatSizes, isHeatEditable } from '@/lib/tournament';

interface AddPlayerPanelProps {
  round: Round;
  onAddLatePlayer: (name: string, placement: Placement) => void;
  onRebalance: () => void;
}

type Mode = 'reconfigure' | 'heat';

export default function AddPlayerPanel({
  round,
  onAddLatePlayer,
  onRebalance,
}: AddPlayerPanelProps) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('reconfigure');
  const [heatId, setHeatId] = useState<string>('');

  // Heats whose line-up is still open: not running, not locked in.
  const openHeats = useMemo(
    () =>
      round.heats
        .map((heat, idx) => ({ heat, number: idx + 1 }))
        .filter(({ heat }) => isHeatEditable(heat, round.activeHeatId)),
    [round]
  );

  const openPlayerCount = openHeats.reduce((sum, { heat }) => sum + heat.players.length, 0);
  const frozenHeatCount = round.heats.length - openHeats.length;

  const selectedHeatId = openHeats.some((o) => o.heat.id === heatId)
    ? heatId
    : openHeats[0]?.heat.id ?? '';

  // What the open half of the round would look like after the new arrival.
  const previewSizes = balancedHeatSizes(openPlayerCount + 1, round.heatSize);
  const currentSizes = openHeats.map(({ heat }) => heat.players.length);
  const rebalanceSizes = balancedHeatSizes(openPlayerCount, round.heatSize);
  const rebalanceWouldChange =
    openPlayerCount > 0 &&
    (rebalanceSizes.length !== currentSizes.length ||
      rebalanceSizes.some((size, i) => size !== currentSizes[i]));

  const canAdd = name.trim().length > 0 && (mode === 'reconfigure' || selectedHeatId !== '');

  function handleAdd() {
    if (!canAdd) return;
    const placement: Placement =
      mode === 'heat' && selectedHeatId
        ? { mode: 'heat', heatId: selectedHeatId }
        : { mode: 'reconfigure' };
    onAddLatePlayer(name.trim(), placement);
    setName('');
  }

  return (
    <div className="bg-mk-surface border border-mk-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-mk-border">
        <h2 className="font-bold text-sm text-white/70 tracking-wide uppercase">Late Entry</h2>
      </div>

      <div className="p-4 space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Player name..."
          className="w-full bg-mk-dark border border-mk-border rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-mk-yellow transition-colors"
        />

        {/* Placement mode */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setMode('reconfigure')}
            className={`py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
              mode === 'reconfigure'
                ? 'bg-mk-yellow text-mk-dark'
                : 'bg-mk-dark border border-mk-border text-white/50 hover:border-mk-yellow/50'
            }`}
          >
            Reshuffle
          </button>
          <button
            onClick={() => setMode('heat')}
            disabled={openHeats.length === 0}
            className={`py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-30 ${
              mode === 'heat'
                ? 'bg-mk-yellow text-mk-dark'
                : 'bg-mk-dark border border-mk-border text-white/50 hover:border-mk-yellow/50'
            }`}
          >
            Pick heat
          </button>
        </div>

        {mode === 'heat' ? (
          openHeats.length > 0 ? (
            <div className="space-y-1.5">
              <select
                value={selectedHeatId}
                onChange={(e) => setHeatId(e.target.value)}
                className="w-full bg-mk-dark border border-mk-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mk-yellow transition-colors"
              >
                {openHeats.map(({ heat, number }) => (
                  <option key={heat.id} value={heat.id}>
                    Heat {number} — {heat.players.length}/{round.heatSize}
                    {heat.players.length >= round.heatSize ? ' (full)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-white/40 leading-snug">
                Drops them into that heat only. Every other heat stays as it is.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-white/40 leading-snug">
              No open heats — every heat is running or locked in.
            </p>
          )
        ) : (
          <div className="space-y-1.5">
            <p className="text-[11px] text-white/40 leading-snug">
              Rebuilds the {openHeats.length || 'remaining'} open heat
              {openHeats.length === 1 ? '' : 's'} around {openPlayerCount + 1} racer
              {openPlayerCount === 0 ? '' : 's'} →{' '}
              <span className="text-white/70 font-medium">
                {previewSizes.join(' + ') || '—'}
              </span>
            </p>
            {frozenHeatCount > 0 && (
              <p className="text-[11px] text-mk-yellow/60 leading-snug">
                {frozenHeatCount} running/locked heat{frozenHeatCount === 1 ? '' : 's'} untouched.
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="w-full py-2.5 rounded-xl bg-mk-red text-white font-bold text-sm disabled:opacity-30 hover:brightness-110 transition-all active:scale-95"
        >
          🏎️ Add to Round {round.roundNumber}
        </button>

        {rebalanceWouldChange && (
          <button
            onClick={onRebalance}
            className="w-full py-2 rounded-xl border border-mk-border text-white/50 font-medium text-xs hover:border-white/40 hover:text-white transition-all"
          >
            Rebalance open heats ({currentSizes.join('+')} → {rebalanceSizes.join('+')})
          </button>
        )}
      </div>
    </div>
  );
}
