'use client';

import { useState } from 'react';
import { LeaderboardEntry } from '@/lib/types';
import { leaderboardKey } from '@/lib/leaderboard';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  /** Points each racer just earned, keyed by `leaderboardKey`, shown as "+N". */
  gains?: Map<string, number>;
  onClear?: () => void;
  title?: string;
}

const RANK_COLORS = ['text-mk-yellow', 'text-gray-300', 'text-amber-600'];

export default function Leaderboard({
  entries,
  gains,
  onClear,
  title = 'All-Time Leaderboard',
}: LeaderboardProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);

  if (entries.length === 0) {
    return (
      <div className="bg-mk-surface border border-mk-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-mk-border">
          <h2 className="font-bold text-sm text-white/70 tracking-wide uppercase">{title}</h2>
        </div>
        <p className="text-white/30 text-sm text-center py-6 px-5">
          No tournaments finished yet — results are banked here when one ends.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-mk-surface border border-mk-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-mk-border flex items-center justify-between gap-3">
        <h2 className="font-bold text-sm text-white/70 tracking-wide uppercase">{title}</h2>
        <span className="text-xs text-white/30">
          {entries.length} racer{entries.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Column headings */}
      <div className="px-5 py-2 bg-mk-surface2/60 border-b border-mk-border/60">
        <div className="flex items-center gap-3 text-[10px] font-semibold text-white/40 uppercase tracking-wide">
          <span className="w-5 text-center">#</span>
          <span className="flex-1">Racer</span>
          <span className="w-10 text-right" title="Tournaments won">
            Wins
          </span>
          <span className="w-10 text-right" title="Tournaments played">
            Played
          </span>
          <span className="w-20 text-right">Points</span>
        </div>
      </div>

      <div className="divide-y divide-mk-border/40 max-h-80 overflow-y-auto">
        {entries.map((entry, idx) => {
          const gained = gains?.get(leaderboardKey(entry.name));
          return (
            <div
              key={leaderboardKey(entry.name)}
              className={`px-5 py-2.5 flex items-center gap-3 ${
                gained !== undefined ? 'bg-mk-yellow/5' : ''
              }`}
            >
              <span
                className={`text-sm font-bold w-5 text-center tabular-nums ${
                  RANK_COLORS[idx] ?? 'text-white/30'
                }`}
              >
                {idx + 1}
              </span>
              <span className="flex-1 text-sm text-white truncate">{entry.name}</span>
              <span className="w-10 text-right text-sm tabular-nums text-white/60">
                {entry.wins > 0 ? entry.wins : '—'}
              </span>
              <span className="w-10 text-right text-sm tabular-nums text-white/40">
                {entry.tournamentsPlayed}
              </span>
              <span className="w-20 text-right">
                <span className="text-sm font-bold tabular-nums text-white">
                  {entry.totalScore.toLocaleString()}
                </span>
                {gained !== undefined && (
                  <span className="block text-[11px] font-medium tabular-nums text-green-400">
                    +{gained.toLocaleString()}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {onClear && (
        <div className="px-5 py-3 border-t border-mk-border">
          {confirmingClear ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs text-white/50">Erase all history?</span>
              <button
                onClick={() => setConfirmingClear(false)}
                className="text-xs text-white/40 hover:text-white/70 px-2 py-1 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClear();
                  setConfirmingClear(false);
                }}
                className="text-xs font-bold text-white bg-mk-red rounded-lg px-3 py-1.5 hover:brightness-110 transition-all active:scale-95"
              >
                Clear
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              className="text-xs text-white/30 hover:text-mk-red transition-colors"
            >
              Clear leaderboard
            </button>
          )}
        </div>
      )}
    </div>
  );
}
