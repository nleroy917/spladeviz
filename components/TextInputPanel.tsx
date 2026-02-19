'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import type { LoadStatus, InferenceStatus } from '@/hooks/useSpladeWorker';

type Props = {
  loadStatus: LoadStatus;
  loadProgress: number;
  loadProgressFile: string;
  inferenceStatus: InferenceStatus;
  onAnalyze: (text: string) => void;
};

export function TextInputPanel({
  loadStatus,
  loadProgress,
  loadProgressFile,
  inferenceStatus,
  onAnalyze,
}: Props) {
  const [text, setText] = useState('the black cat sat on the mat');

  const isReady = loadStatus === 'loaded';
  const isRunning = inferenceStatus === 'running';
  const isLoading = loadStatus === 'loading';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isReady && text.trim() && !isRunning) {
      onAnalyze(text.trim());
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter query text…"
          disabled={!isReady || isRunning}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={!isReady || isRunning || !text.trim()}
        >
          {isRunning ? 'Analyzing…' : 'Analyze'}
        </Button>
      </form>

      {isLoading && (
        <div className="space-y-1">
          <Progress value={loadProgress} className="h-1.5" />
          <p className="text-xs text-muted-foreground truncate">
            {loadProgressFile
              ? `Downloading ${loadProgressFile.split('/').pop()}… ${Math.round(loadProgress)}%`
              : 'Initializing model…'}
          </p>
        </div>
      )}

      {loadStatus === 'error' && (
        <p className="text-xs text-destructive-foreground bg-destructive/20 rounded px-2 py-1">
          Failed to load model. Check console for details.
        </p>
      )}

      {inferenceStatus === 'error' && (
        <p className="text-xs text-destructive-foreground bg-destructive/20 rounded px-2 py-1">
          Inference failed. Check console for details.
        </p>
      )}
    </div>
  );
}
