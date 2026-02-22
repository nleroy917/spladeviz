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

export const DEFAULT_PROMPT = 'the black cat sat on the mat';

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
  const [text, setText] = useState('the black cat sat on the mat');

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
        <div className="flex items-stretch border border-border rounded-lg bg-card overflow-hidden">

          {/* Model selector */}
          <div className="relative flex items-center border-r border-border shrink-0">
            <select
              value={modelId}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={isRunning}
              className="appearance-none bg-transparent text-sm font-medium pl-4 pr-8 py-3 cursor-pointer focus:outline-none text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Text input */}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter query text…"
            disabled={!isReady || isRunning}
            className="flex-1 min-w-0 px-4 py-3 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />

          {/* Top-K slider */}
          <div className="flex items-center gap-2 border-l border-border px-3 shrink-0">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              top-k
            </label>
            <input
              type="range"
              min={1}
              max={100}
              value={topK}
              onChange={(e) => onTopKChange(Number(e.target.value))}
              disabled={!isReady || isRunning}
              className="w-32 accent-foreground disabled:opacity-50"
            />
            <span className="text-xs tabular-nums text-muted-foreground w-5 text-right">
              {topK}
            </span>
          </div>

          {/* Analyze button */}
          <button
            type="submit"
            disabled={!isReady || isRunning || !text.trim()}
            className="border-l border-border px-5 py-3 text-sm font-medium shrink-0 transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="space-y-1">
          <Progress value={loadProgress} className="h-1" />
          <p className="text-xs text-muted-foreground truncate">
            {loadProgressFile
              ? `Downloading ${loadProgressFile.split('/').pop()}… ${Math.round(loadProgress)}%`
              : 'Initializing model…'}
          </p>
        </div>
      )}

      {loadStatus === 'error' && (
        <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
          Failed to load model. Check console for details.
        </p>
      )}

      {inferenceStatus === 'error' && (
        <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
          Inference failed. Check console for details.
        </p>
      )}
    </div>
  );
}