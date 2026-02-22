'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { TextInputPanel, DEFAULT_PROMPT } from '@/components/TextInputPanel';
import { SpladeFlowDiagram } from '@/components/SpladeFlowDiagram';
import { TokenDistributionPanel } from '@/components/TokenDistributionPanel';
import { SparseVectorPanel } from '@/components/SparseVectorPanel';
import { useSpladeWorker } from '@/hooks/useSpladeWorker';
import { GloveSimilarityPanel } from '@/components/GloveSimilarityPanel';

export default function Home() {
  const { state, loadModel, runInference, hoverToken, lockToken } = useSpladeWorker();
  const [topK, setTopK] = useState(20);
  const autoRanRef = useRef(false);

  // Auto-run the default prompt once the model first loads
  useEffect(() => {
    if (state.loadStatus === 'loaded' && !autoRanRef.current) {
      autoRanRef.current = true;
      runInference(DEFAULT_PROMPT, topK);
    }
  }, [state.loadStatus, runInference, topK]);

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
        <div className='min-h-screen'>
        <TextInputPanel
          loadStatus={state.loadStatus}
          loadProgress={state.loadProgress}
          loadProgressFile={state.loadProgressFile}
          inferenceStatus={state.inferenceStatus}
          onAnalyze={runInference}
          modelId={state.modelId}
          onModelChange={(id) => { if (id !== state.modelId) loadModel(id); }}
          topK={topK}
          onTopKChange={setTopK}
        />

        {hasResults && (
          <>
            {/* <Separator /> */}
            <SpladeFlowDiagram
              tokens={state.tokens}
              tokenDistributions={state.tokenDistributions}
              hoveredIdx={state.hoveredTokenIdx}
              lockedIdx={state.lockedTokenIdx}
              onHover={hoverToken}
              onLock={lockToken}
            />
            <div className='my-6'></div>
            {state.lockedTokenIdx !== null && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
        {/* GloVe static embedding similarity section */}
        <div className="space-y-6">
          <div>
            <h2>Why SPLADE works</h2>
            <p>
              When SPLADE comes up in search engineering discussions, it's almost always framed around two concepts: <b>vocabulary mismatch</b> and <b>query expansion</b>. People like to say things like, "SPLADE is like better BM25" or "SPLADE solves the vocabulary mismatch problem." And while these are certainly the problems SPLADE solves, rarely does anyone actually explain <em>why</em> it works. It wasn't until recently that I had the epiphany that SPLADE's secret sauce is actually pretty simple: SPLADE leverages the fact that BERT encoder models are already really good at predicting masked tokens in a piece of text. By treating the query as a token prediction problem, SPLADE is able to leverage the contextual token predictions of BERT models to perform query expansion in a way that is much more effective than traditional methods. To motivate this from the ground up, let's start with a concrete example of the problem SPLADE is trying to solve.
            </p>
          </div>
          <div>
            <h2>A hospital internal document search system</h2>
            Imagine a hospital's internal document search system. A nurse searches for:
            <blockquote>"heart attack treatment protocol"</blockquote>

            But the actual clinical documents in the system consistently use terminology like:

            <blockquote>"myocardial infarction management guidelines"</blockquote>
            <blockquote>"STEMI intervention procedure"</blockquote>
            <blockquote>"acute coronary syndrome care pathway"</blockquote>

            A classic BM25 keyword search would largely fail here. The tokens "heart attack" don't overlap lexically with "myocardial infarction," so those documents score low or don't appear at all. A better system would take the individual tokens in our query and **expand** upon them to pull in other similarly related tokens that might be useful to our query. For example, if we could expand "heart attack" to also include "myocardial infarction," "STEMI," and "acute coronary syndrome," then we would have a much better chance of retrieving the relevant clinical documents. BM25 fails because it doesn't have a way to do this kind of expansion. It simply stems, lemmatizes, and tokenizes the query and documents and looks for lexical overlap.
          </div>
          <div>
            <h3 className='mb-0'>Static word embeddings (GloVe)</h3>
            <p className="text-sm text-muted-foreground">
              A naive approach to query expansion uses static word embeddings. Click{' '}
              <strong>Load embeddings</strong>, then click any token in your query to see
              its nearest neighbors in GloVe embedding space. Notice how context-free
              these neighbors are — <em>heart</em> pulls in <em>pain</em> and <em>blood</em>, not{' '}
              <em>myocardial</em>.
            </p>
          </div>
          <GloveSimilarityPanel />
        </div>
      </main>
      <footer className="border-t border-border px-6 py-3 text-center text-xs text-muted-foreground">
        Browser-only inference · transformers.js + WebAssembly · no data leaves your device
      </footer>
    </div>
  );
}
