import { ModelStatusBadge } from './ModelStatusBadge';
import type { LoadStatus } from '@/hooks/useSpladeWorker';

type Props = {
  modelId: string;
  loadStatus: LoadStatus;
  fromCache: boolean;
};

export function Header({ modelId, loadStatus, fromCache }: Props) {
  return (
    <header className="px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">SPLADE Visualizer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sparse lexical expansion in the browser via transformers.js
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ModelStatusBadge modelId={modelId} loadStatus={loadStatus} fromCache={fromCache} />
          <a
            href="https://github.com/nleroy917/spladeviz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </header>
  );
}