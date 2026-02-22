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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            SPLADE Visualizer (<span className="line-through">How</span> why SPLADE works)
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Sparse lexical expansion in the browser via transformers.js
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ModelStatusBadge modelId={modelId} loadStatus={loadStatus} fromCache={fromCache} />
          <a
            href="https://github.com/nleroy917/spladeviz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 transition-colors hover:text-slate-700"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
