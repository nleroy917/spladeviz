import { Badge } from '@/components/ui/badge';
import { MODELS } from '@/lib/models';
import type { LoadStatus } from '@/hooks/useSpladeWorker';

type Props = {
  modelId: string;
  loadStatus: LoadStatus;
  fromCache: boolean;
};

export function ModelStatusBadge({ modelId, loadStatus, fromCache }: Props) {
  const info = MODELS.find((m) => m.id === modelId);

  if (loadStatus === 'error') {
    return <Badge variant="destructive">Error</Badge>;
  }

  if (loadStatus === 'loading') {
    return (
      <Badge variant="secondary" className="animate-pulse">
        Loading…
      </Badge>
    );
  }

  if (loadStatus === 'loaded') {
    const label = info?.isSpladeNative ? 'SPLADE-trained' : 'Standard MLM';
    return (
      <div className="flex gap-1.5 items-center">
        <Badge
          variant={info?.isSpladeNative ? 'default' : 'secondary'}
          className={
            info?.isSpladeNative
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : ''
          }
        >
          {label}
        </Badge>
        {fromCache && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Cached
          </Badge>
        )}
      </div>
    );
  }

  return null;
}
