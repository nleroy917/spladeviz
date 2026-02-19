import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { TokenEntry, WeightEntry } from '@/types/worker';

type Props = {
  sparseVector: WeightEntry[];
  modelId: string;
  inferenceRunning: boolean;
  /** word → index of the token that scored highest for that word */
  contributorMap?: Map<string, number>;
  tokens?: TokenEntry[];
  lockedTokenIdx?: number | null;
};

export function SparseVectorPanel({
  sparseVector,
  modelId,
  inferenceRunning,
  contributorMap,
  tokens,
  lockedTokenIdx,
}: Props) {
  const max = sparseVector.length > 0
    ? Math.max(...sparseVector.map((e) => e.weight), 1e-9)
    : 1;

  const hasContrib = !!contributorMap && !!tokens;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-medium">Final Sparse Vector</CardTitle>
          {sparseVector.length > 0 && (
            <Badge variant="outline" className="text-xs font-mono">
              {sparseVector.length} non-zero dims
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Max-pooled across all token positions · log(1 + ReLU(logits))
        </p>
      </CardHeader>
      <CardContent className="overflow-y-auto">
        {inferenceRunning ? (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : sparseVector.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Run inference to see the final max-pooled sparse retrieval vector.
          </p>
        ) : (
          <div className="space-y-1">
            {sparseVector.map((entry, i) => {
              const pct = Math.max((entry.weight / max) * 100, 0.5);
              const contribIdx = contributorMap?.get(entry.word);
              const contribToken = hasContrib && contribIdx !== undefined
                ? tokens![contribIdx]
                : null;
              const isFromLocked =
                lockedTokenIdx !== null &&
                lockedTokenIdx !== undefined &&
                contribIdx === lockedTokenIdx;

              return (
                <div key={i} className="flex items-center gap-2 text-sm font-mono">
                  <span
                    className="w-24 shrink-0 truncate text-right"
                    style={{ opacity: isFromLocked ? 1 : 0.7 }}
                  >
                    {entry.word}
                  </span>

                  <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isFromLocked
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--primary) / 0.45)',
                      }}
                    />
                  </div>

                  <span
                    className="w-12 shrink-0 text-right text-xs text-muted-foreground"
                    style={{ opacity: isFromLocked ? 1 : 0.7 }}
                  >
                    {entry.weight.toFixed(3)}
                  </span>

                  {/* Contributing token badge */}
                  <span
                    className="w-12 shrink-0 truncate text-xs font-mono text-right"
                    style={{
                      color: isFromLocked
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--muted-foreground) / 0.5)',
                    }}
                    title={contribToken ? `contributed by "${contribToken.token}"` : undefined}
                  >
                    {contribToken?.token ?? ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
