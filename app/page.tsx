'use client';

import { useMemo } from 'react';
import { Separator } from '@/components/ui/separator';
import { Header } from '@/components/Header';
import { TextInputPanel } from '@/components/TextInputPanel';
import { SpladeFlowDiagram } from '@/components/SpladeFlowDiagram';
import { TokenDistributionPanel } from '@/components/TokenDistributionPanel';
import { SparseVectorPanel } from '@/components/SparseVectorPanel';
import { useSpladeWorker } from '@/hooks/useSpladeWorker';

export default function Home() {
  const { state, loadModel, runInference, hoverToken, lockToken } = useSpladeWorker();

  const hasResults = state.tokens.length > 0;

  // For each vocabulary word that appears in any token's distribution,
  // track which token index scored highest (the max-pool "winner").
  const contributorMap = useMemo((): Map<string, number> => {
    const best = new Map<string, { w: number; idx: number }>();
    state.tokenDistributions.forEach((dist, i) => {
      dist.forEach((entry) => {
        const cur = best.get(entry.word);
        if (!cur || entry.weight > cur.w) {
          best.set(entry.word, { w: entry.weight, idx: i });
        }
      });
    });
    return new Map([...best.entries()].map(([word, v]) => [word, v.idx]));
  }, [state.tokenDistributions]);

  // Words where the locked token specifically won the max-pool.
  const winnerWords = useMemo((): Set<string> | undefined => {
    const idx = state.lockedTokenIdx;
    if (idx === null || !state.tokenDistributions[idx]) return undefined;
    return new Set(
      state.tokenDistributions[idx]
        .filter((e) => contributorMap.get(e.word) === idx)
        .map((e) => e.word)
    );
  }, [state.lockedTokenIdx, state.tokenDistributions, contributorMap]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        modelId={state.modelId}
        loadStatus={state.loadStatus}
        fromCache={state.fromCache}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        <TextInputPanel
          loadStatus={state.loadStatus}
          loadProgress={state.loadProgress}
          loadProgressFile={state.loadProgressFile}
          inferenceStatus={state.inferenceStatus}
          onAnalyze={runInference}
          modelId={state.modelId}
          onModelChange={(id) => { if (id !== state.modelId) loadModel(id); }}
        />

        {hasResults && (
          <>
            <Separator />
            <SpladeFlowDiagram
              tokens={state.tokens}
              tokenDistributions={state.tokenDistributions}
              hoveredIdx={state.hoveredTokenIdx}
              lockedIdx={state.lockedTokenIdx}
              onHover={hoverToken}
              onLock={lockToken}
            />

            {state.lockedTokenIdx !== null && (
              <div className="grid grid-cols-2 gap-4">
                <TokenDistributionPanel
                  activeIdx={state.lockedTokenIdx}
                  isLocked={true}
                  tokens={state.tokens}
                  tokenDistributions={state.tokenDistributions}
                  inferenceRunning={false}
                  winnerWords={winnerWords}
                />
                <SparseVectorPanel
                  sparseVector={state.sparseVector}
                  modelId={state.modelId}
                  inferenceRunning={state.inferenceStatus === 'running'}
                  contributorMap={contributorMap}
                  tokens={state.tokens}
                  lockedTokenIdx={state.lockedTokenIdx}
                />
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border px-6 py-3 text-center text-xs text-muted-foreground">
        Browser-only inference · transformers.js + WebAssembly · no data leaves your device
      </footer>
    </div>
  );
}
