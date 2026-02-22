'use client';

import { useState, useMemo, useEffect } from 'react';
import { useGloveEmbeddings, type GloveVocabSize } from '@/hooks/useGloveEmbeddings';
import { cn } from '@/lib/utils';

const VOCAB_OPTIONS: { n: GloveVocabSize; label: string; approxMB: string }[] = [
  { n: 10, label: '10k words', approxMB: '~2 MB' },
  { n: 20, label: '20k words', approxMB: '~4 MB' },
  { n: 30, label: '30k words', approxMB: '~6 MB' },
];

const DEFAULT_QUERY = 'heart attack treatment protocol';
const TOP_K = 15;

export function GloveSimilarityPanel() {
  const { state, load, findNearest } = useGloveEmbeddings();
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [selectedVocab, setSelectedVocab] = useState<GloveVocabSize>(10);
  const [activeToken, setActiveToken] = useState<string | null>(null);

  // Tokenize by splitting on whitespace, lowercasing
  const tokens = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );

  // Auto-load 10k embeddings on mount
  useEffect(() => {
    load(10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select first token once loaded, or when the query changes after loading
  useEffect(() => {
    if (state.status === 'loaded' && tokens.length > 0) {
      setActiveToken(tokens[0]);
    }
  }, [state.status, tokens]);

  // Nearest neighbors for the active token
  const neighbors = useMemo(() => {
    if (!activeToken || state.status !== 'loaded') return [];
    return findNearest(activeToken, TOP_K);
  }, [activeToken, state.status, findNearest]);

  const maxScore = neighbors[0]?.score ?? 1;

  const isLoaded = state.status === 'loaded';
  const isLoading = state.status === 'loading';

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-border overflow-hidden text-sm">
          {VOCAB_OPTIONS.map(({ n, label, approxMB }) => (
            <button
              key={n}
              onClick={() => setSelectedVocab(n)}
              disabled={isLoading}
              className={cn(
                'px-3 py-1.5 transition-colors border-r border-border last:border-r-0',
                selectedVocab === n
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
              title={approxMB}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => load(selectedVocab)}
          disabled={isLoading}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
            isLoading
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {isLoading ? 'Loading…' : isLoaded ? 'Reload' : 'Load embeddings'}
        </button>

        {isLoaded && (
          <span className="text-xs text-muted-foreground">
            {state.numWords.toLocaleString()} words loaded
            {' · '}cached in browser
          </span>
        )}
        {state.status === 'error' && (
          <span className="text-xs text-destructive">{state.error}</span>
        )}
      </div>

      {isLoaded && (
        <>
          {/* Query input */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">
              Query
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveToken(null);
              }}
              placeholder="Enter a query…"
              className={cn(
                'w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
                'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
              )}
            />
          </div>

          {/* Token chips */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Click a token to explore its GloVe neighbors
            </p>
            <div className="flex flex-wrap gap-2">
              {tokens.map((token) => {
                const isActive = token === activeToken;
                return (
                  <button
                    key={token}
                    onClick={() => setActiveToken(isActive ? null : token)}
                    className={cn(
                      'inline-flex items-center rounded px-2 py-1 text-sm font-mono transition-colors',
                      'border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-primary/5 hover:border-primary/40',
                    )}
                  >
                    {token}
                  </button>
                );
              })}
              {tokens.length === 0 && (
                <span className="text-sm text-muted-foreground italic">
                  Type a query above.
                </span>
              )}
            </div>
          </div>

          {/* Similarity results */}
          {activeToken !== null && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Most similar words to{' '}
                <span className="font-mono text-primary">&ldquo;{activeToken}&rdquo;</span>
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  (cosine similarity, static GloVe 6B 50d)
                </span>
              </p>

              {neighbors.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  &ldquo;{activeToken}&rdquo; is not in the {state.vocabSize}k vocabulary.
                  Try a larger vocab size or a simpler word.
                </p>
              ) : (
                <div className="space-y-1">
                  {neighbors.map(({ word, score }) => {
                    const pct = Math.max((score / maxScore) * 100, 0.5);
                    return (
                      <div key={word} className="flex items-center gap-2 text-sm font-mono">
                        <span className="w-28 shrink-0 truncate text-right text-foreground">
                          {word}
                        </span>
                        <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm transition-all duration-200"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: 'hsl(var(--primary) / 0.65)',
                            }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
                          {score.toFixed(3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}