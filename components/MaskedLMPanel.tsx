'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { LoadStatus } from '@/hooks/useSpladeWorker';
import type { WeightEntry } from '@/types/worker';

const DEFAULT_QUERY = 'documentation for memory management for the python language';
// "python" is the 7th word (index 6) — the contextually interesting token to mask
const DEFAULT_MASK_IDX = 6;
const TOP_K = 15;

type Props = {
  modelLoadStatus: LoadStatus;
  mlmStatus: 'idle' | 'running' | 'done' | 'error';
  mlmMaskedWord: string | null;
  mlmPredictions: WeightEntry[];
  mlmError: string | null;
  onRunMlm: (text: string, maskedWordIdx: number, topK: number) => void;
};

export function MaskedLMPanel({
  modelLoadStatus,
  mlmStatus,
  mlmMaskedWord,
  mlmPredictions,
  mlmError,
  onRunMlm,
}: Props) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [maskedIdx, setMaskedIdx] = useState<number | null>(null);
  const autoRanRef = useRef(false);

  const words = useMemo(() => query.trim().split(/\s+/).filter(Boolean), [query]);

  // Auto-mask DEFAULT_MASK_IDX once the model finishes loading
  useEffect(() => {
    if (modelLoadStatus === 'loaded' && !autoRanRef.current && words.length > DEFAULT_MASK_IDX) {
      autoRanRef.current = true;
      setMaskedIdx(DEFAULT_MASK_IDX);
      onRunMlm(query, DEFAULT_MASK_IDX, TOP_K);
    }
  }, [modelLoadStatus, words.length, query, onRunMlm]);

  const handleTokenClick = (idx: number) => {
    if (maskedIdx === idx) {
      setMaskedIdx(null);
      return;
    }
    setMaskedIdx(idx);
    onRunMlm(query, idx, TOP_K);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setMaskedIdx(null);
  };

  // Original word's rank in predictions (1-based; 0 = not in top-K)
  const originalRank =
    mlmMaskedWord && mlmPredictions.length > 0
      ? mlmPredictions.findIndex((p) => p.word.toLowerCase() === mlmMaskedWord.toLowerCase()) + 1
      : 0;

  const maxProb = mlmPredictions[0]?.weight ?? 1;
  const isModelLoading = modelLoadStatus === 'loading' || modelLoadStatus === 'idle';
  const isRunning = mlmStatus === 'running';
  const hasPredictions = mlmPredictions.length > 0;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      {/* Query input */}
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Query</label>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Enter a query…"
          className={cn(
            'w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
          )}
        />
      </div>

      {/* Token chips */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {isModelLoading ? 'Waiting for model…' : 'Click a token to mask it'}
        </p>
        <div className="flex flex-wrap gap-2">
          {words.map((word, idx) => {
            const isMasked = idx === maskedIdx;
            return (
              <button
                key={idx}
                onClick={() => handleTokenClick(idx)}
                disabled={isModelLoading}
                className={cn(
                  'inline-flex items-center rounded px-2 py-1 font-mono text-sm transition-colors',
                  'border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  isMasked
                    ? 'border-amber-400 bg-amber-50 font-semibold text-amber-800'
                    : isModelLoading
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:border-primary/40 hover:bg-primary/5',
                )}
              >
                {isMasked ? '[MASK]' : word}
              </button>
            );
          })}
          {words.length === 0 && (
            <span className="text-sm italic text-muted-foreground">Type a query above.</span>
          )}
        </div>
      </div>

      {/* Results */}
      {maskedIdx !== null && (
        <div className="space-y-3 border-t border-border pt-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Top predictions for{' '}
                <span className="rounded bg-amber-50 px-1 font-mono text-amber-800">[MASK]</span>
              </p>
              {mlmMaskedWord && mlmStatus !== 'idle' && !isRunning && (
                <p className="text-xs text-muted-foreground">
                  Original word:{' '}
                  <span className="font-mono font-medium text-foreground">
                    &ldquo;{mlmMaskedWord}&rdquo;
                  </span>
                  {originalRank > 0 && (
                    <span className="ml-1 text-primary">ranks #{originalRank}</span>
                  )}
                  {originalRank === 0 && ` · not in top ${TOP_K}`}
                </p>
              )}
            </div>
            {isRunning && (
              <span className="animate-pulse rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Running…
              </span>
            )}
          </div>

          {mlmError && <p className="text-sm text-destructive">{mlmError}</p>}

          {/* Probability bars */}
          {hasPredictions && (
            <div className={cn('space-y-1', isRunning && 'opacity-40 transition-opacity')}>
              {mlmPredictions.map(({ word, weight }) => {
                const pct = Math.max((weight / maxProb) * 100, 0.5);
                const isOriginal =
                  !!mlmMaskedWord && word.toLowerCase() === mlmMaskedWord.toLowerCase();
                return (
                  <div key={word} className="flex items-center gap-2 font-mono text-sm">
                    <span
                      className={cn(
                        'w-28 shrink-0 truncate text-right',
                        isOriginal ? 'font-semibold text-primary' : 'text-foreground',
                      )}
                    >
                      {word}
                      {isOriginal && (
                        <span className="ml-1 font-sans text-[10px] font-normal text-primary">
                          ✓
                        </span>
                      )}
                    </span>
                    <div className="h-4 flex-1 overflow-hidden rounded-sm bg-muted">
                      <div
                        className="h-full rounded-sm transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isOriginal
                            ? 'hsl(var(--primary) / 0.85)'
                            : 'hsl(var(--primary) / 0.35)',
                        }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                      {(weight * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}