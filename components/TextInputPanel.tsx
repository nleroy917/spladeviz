'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { MODELS } from '@/lib/models';
import type { LoadStatus, InferenceStatus } from '@/hooks/useSpladeWorker';

type Props = {
  loadStatus: LoadStatus;
  loadProgress: number;
  loadProgressFile: string;
  inferenceStatus: InferenceStatus;
  onAnalyze: (text: string, topK: number) => void;
  modelId: string;
  onModelChange: (modelId: string) => void;
  topK: number;
  onTopKChange: (topK: number) => void;
};

export const DEFAULT_PROMPT = 'documentation on python memory management';

const availableModels = MODELS.filter((m) => m.hasOnnxWeights);

export function TextInputPanel({
  loadStatus,
  loadProgress,
  loadProgressFile,
  inferenceStatus,
  onAnalyze,
  modelId,
  onModelChange,
  topK,
  onTopKChange,
}: Props) {
  const [text, setText] = useState('documentation on python memory management');

  const isReady = loadStatus === 'loaded';
  const isRunning = inferenceStatus === 'running';
  const isLoading = loadStatus === 'loading';

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (isReady && text.trim() && !isRunning) {
      onAnalyze(text.trim(), topK);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit}>
        {/* Unified pill: [Model ▾] | [text input] | [Analyze] */}
        <div className="flex items-stretch overflow-hidden rounded-lg border border-border bg-card">
          {/* Model selector */}
          <div className="relative flex shrink-0 items-center border-r border-border">
            <select
              value={modelId}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={isRunning}
              className="cursor-pointer appearance-none bg-transparent py-3 pl-4 pr-8 text-sm font-medium text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Text input */}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter query text…"
            disabled={!isReady || isRunning}
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />

          {/* Top-K slider */}
          <div className="flex shrink-0 items-center gap-2 border-l border-border px-3">
            <label className="whitespace-nowrap text-xs text-muted-foreground">top-k</label>
            <input
              type="range"
              min={1}
              max={100}
              value={topK}
              onChange={(e) => onTopKChange(Number(e.target.value))}
              disabled={!isReady || isRunning}
              className="w-32 accent-foreground disabled:opacity-50"
            />
            <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">
              {topK}
            </span>
          </div>

          {/* Analyze button */}
          <button
            type="submit"
            disabled={!isReady || isRunning || !text.trim()}
            className="shrink-0 border-l border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isRunning ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="space-y-1">
          <Progress value={loadProgress} className="h-1" />
          <p className="truncate text-xs text-muted-foreground">
            {loadProgressFile
              ? `Downloading ${loadProgressFile.split('/').pop()}… ${Math.round(loadProgress)}%`
              : 'Initializing model…'}
          </p>
        </div>
      )}

      {loadStatus === 'error' && (
        <p className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
          Failed to load model. Check console for details.
        </p>
      )}

      {inferenceStatus === 'error' && (
        <p className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
          Inference failed. Check console for details.
        </p>
      )}
    </div>
  );
}
