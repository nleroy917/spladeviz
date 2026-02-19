import { ModelStatusBadge } from './ModelStatusBadge';
import type { LoadStatus } from '@/hooks/useSpladeWorker';

type Props = {
  modelId: string;
  loadStatus: LoadStatus;
  fromCache: boolean;
};

export function Header({ modelId, loadStatus, fromCache }: Props) {
  return (
    <header className="border-b border-border px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">SPLADE Visualizer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sparse lexical expansion in the browser via transformers.js
          </p>
        </div>
        <ModelStatusBadge modelId={modelId} loadStatus={loadStatus} fromCache={fromCache} />
      </div>
    </header>
  );
}