import type { WeightEntry } from '@/types/worker';

type Props = {
  entries: WeightEntry[];
  maxWeight?: number;
  /** When provided, words in this set are highlighted; all others are dimmed. */
  highlightWords?: Set<string>;
};

export function WeightBarChart({ entries, maxWeight, highlightWords }: Props) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No data.</p>;
  }

  const max = maxWeight ?? Math.max(...entries.map((e) => e.weight), 1e-9);
  const hasHighlight = highlightWords !== undefined;

  return (
    <div className="space-y-1">
      {entries.map((entry, i) => {
        const pct = Math.max((entry.weight / max) * 100, 0.5);
        const isWinner = !hasHighlight || highlightWords!.has(entry.word);

        return (
          <div key={i} className="flex items-center gap-2 text-sm font-mono">
            {/* Winner indicator dot */}
            <span className="w-3 shrink-0 text-center text-[10px] text-primary">
              {isWinner && hasHighlight ? '◆' : ''}
            </span>

            <span
              className="w-24 shrink-0 truncate text-right"
              style={{ opacity: isWinner ? 1 : 0.35 }}
            >
              {entry.word}
            </span>

            <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  opacity: isWinner ? 1 : 0.25,
                  backgroundColor: 'hsl(var(--primary) / 0.75)',
                }}
              />
            </div>

            <span
              className="w-12 shrink-0 text-right text-xs text-muted-foreground"
              style={{ opacity: isWinner ? 1 : 0.35 }}
            >
              {entry.weight.toFixed(3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
