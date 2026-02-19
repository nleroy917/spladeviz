import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MODELS, ONNX_CONVERSION_CMD } from '@/lib/models';
import { ModelStatusBadge } from './ModelStatusBadge';
import type { LoadStatus } from '@/hooks/useSpladeWorker';

type Props = {
  modelId: string;
  loadStatus: LoadStatus;
  fromCache: boolean;
  onModelChange: (modelId: string) => void;
};

export function Header({ modelId, loadStatus, fromCache, onModelChange }: Props) {
  return (
    <header className="border-b border-border px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            SPLADE Visualizer
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sparse lexical expansion in the browser via transformers.js
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ModelStatusBadge
            modelId={modelId}
            loadStatus={loadStatus}
            fromCache={fromCache}
          />

          <TooltipProvider>
            <Select value={modelId} onValueChange={onModelChange}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) =>
                  m.hasOnnxWeights ? (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ) : (
                    <Tooltip key={m.id}>
                      <TooltipTrigger asChild>
                        <div className="relative flex w-full cursor-not-allowed items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-muted-foreground outline-none select-none">
                          {m.label}{' '}
                          <span className="ml-1.5 text-xs opacity-60">
                            (No ONNX)
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="font-medium mb-1">
                          No ONNX weights on the Hub
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Convert locally with:
                        </p>
                        <code className="block text-xs bg-muted rounded px-2 py-1 font-mono break-all">
                          {ONNX_CONVERSION_CMD(m.id)}
                        </code>
                      </TooltipContent>
                    </Tooltip>
                  )
                )}
              </SelectContent>
            </Select>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}
