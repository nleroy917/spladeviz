import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WeightBarChart } from './WeightBarChart';
import type { TokenEntry, WeightEntry } from '@/types/worker';

type Props = {
  activeIdx: number | null;
  isLocked: boolean;
  tokens: TokenEntry[];
  tokenDistributions: WeightEntry[][];
  inferenceRunning: boolean;
  /** Words where this token won the max-pool → highlighted in the chart. */
  winnerWords?: Set<string>;
};

export function TokenDistributionPanel({
  activeIdx,
  isLocked,
  tokens,
  tokenDistributions,
  inferenceRunning,
  winnerWords,
}: Props) {
  const hasData = tokens.length > 0;
  const activeToken = activeIdx !== null && tokens[activeIdx] ? tokens[activeIdx] : null;
  const distribution = activeIdx !== null && tokenDistributions[activeIdx]
    ? tokenDistributions[activeIdx]
    : null;

  const winnerCount = winnerWords?.size ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium">
            {activeToken
              ? <>Token &ldquo;{activeToken.token}&rdquo; — vocabulary weights</>
              : 'Token Distribution'}
          </CardTitle>
          {winnerWords && winnerCount > 0 && (
            <span className="shrink-0 text-xs text-primary font-mono">
              ◆ {winnerCount} in sparse vector
            </span>
          )}
        </div>
        {winnerWords && (
          <p className="text-xs text-muted-foreground mt-1">
            ◆ = this token&apos;s score was the max across all positions
          </p>
        )}
      </CardHeader>
      <CardContent className="overflow-y-auto">
        {inferenceRunning ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : !hasData ? (
          <p className="text-sm text-muted-foreground">
            Run inference then click a token to see its vocabulary weight distribution.
          </p>
        ) : activeToken === null ? (
          <p className="text-sm text-muted-foreground">
            Click a token to see its top-K vocabulary weights.
          </p>
        ) : distribution ? (
          <WeightBarChart entries={distribution} highlightWords={winnerWords} />
        ) : (
          <p className="text-sm text-muted-foreground italic">No weights for this token.</p>
        )}
      </CardContent>
    </Card>
  );
}
