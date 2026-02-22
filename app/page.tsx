'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { TextInputPanel, DEFAULT_PROMPT } from '@/components/TextInputPanel';
import { SpladeFlowDiagram } from '@/components/SpladeFlowDiagram';
import { TokenDistributionPanel } from '@/components/TokenDistributionPanel';
import { SparseVectorPanel } from '@/components/SparseVectorPanel';
import { useSpladeWorker } from '@/hooks/useSpladeWorker';
import { GloveSimilarityPanel } from '@/components/GloveSimilarityPanel';
import { TokenExpansionDiagram } from '@/components/TokenExpansionDiagram';
import { MaskedLMPanel } from '@/components/MaskedLMPanel';
import { SpladeAggregationDiagram } from '@/components/SpladeAggregationDiagram';

export default function Home() {
  const { state, loadModel, runInference, hoverToken, lockToken, runMlm } = useSpladeWorker();
  const [topK, setTopK] = useState(30);
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
        .map((e) => e.word),
    );
  }, [state.lockedTokenIdx, state.tokenDistributions, contributorMap]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header modelId={state.modelId} loadStatus={state.loadStatus} fromCache={state.fromCache} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-8">
        <div className="min-h-screen">
          <TextInputPanel
            loadStatus={state.loadStatus}
            loadProgress={state.loadProgress}
            loadProgressFile={state.loadProgressFile}
            inferenceStatus={state.inferenceStatus}
            onAnalyze={runInference}
            modelId={state.modelId}
            onModelChange={(id) => {
              if (id !== state.modelId) loadModel(id);
            }}
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
              <div className="my-6"></div>
              {state.lockedTokenIdx !== null && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <div className="space-y-10">
          {/* ── Introduction ── */}
          <div className="space-y-3">
            <h2>Why SPLADE works</h2>
            <p>
              SPLADE comes up constantly in search engineering, usually framed around{' '}
              <strong>vocabulary mismatch</strong> and <strong>query expansion</strong>—people say
              things like "SPLADE is better BM25" or "SPLADE solves the vocabulary mismatch
              problem." That's true, but it doesn't explain <em>how</em>. The core insight is
              simple: SPLADE repurposes the masked language modeling objective that BERT was already
              trained on. By running a forward pass over the query and reading the token-prediction
              distributions at every position, SPLADE gets contextually-grounded query expansion for
              free—no fine-tuning required to get the basic behavior.
            </p>
            <p>
              The rest of this page builds that intuition from the ground up, starting with the
              problem and ending with the math.
            </p>
          </div>

          {/* ── The problem: vocabulary mismatch ── */}
          <div className="space-y-3">
            <h2>The vocabulary mismatch problem</h2>
            <p>Imagine a developer documentation search system. A programmer searches for:</p>
            <blockquote>"python memory management"</blockquote>
            <p>But the relevant documents use more specific terminology:</p>
            <blockquote>"garbage collection in CPython"</blockquote>
            <blockquote>"reference counting implementation"</blockquote>
            <blockquote>"PyObject allocation and deallocation"</blockquote>
            <p>
              BM25 partially works here—it matches on "python" and "memory"—but misses any document
              that describes the concept without using those exact words. For example, a page about
              "garbage collection" might be highly relevant to the user's information need, but BM25
              won't rank it well because it doesn't contain the token "memory." This is the
              vocabulary mismatch problem: the words in the query don't exactly match the words in
              relevant documents, even though they're semantically related. To address this problem,
              we need to introduce <strong>query expansion</strong>: augment each query token with
              semantically related terms so the search can bridge the lexical gap.
            </p>
            <TokenExpansionDiagram />
          </div>

          {/* ── Naive approach: static embeddings ── */}
          <div className="space-y-3">
            <h2>A naive approach: static word embeddings</h2>
            <p>
              One way to expand a query is to look up each token in a static word embedding space
              (like GloVe) and retrieve its nearest neighbors. The problem is that static embeddings
              have no notion of context—each word gets a single fixed vector regardless of how it's
              used. The embedding for "python" is a weighted average of every context it appears in
              across the training corpus: the programming language, <em>and</em> the snake.
              Depending on the corpus, that can pull in genuinely unhelpful neighbors. Use the
              word-similarity finder below to see for yourself: click any token in the query and see
              its nearest neighbors in GloVe space. Notice how the neighbors for "python" largely
              include other anmials, with a single "donwloadable" neighbor that happens to co-occur
              in the same contexts as "python" but isn't actually a programming language at all.
            </p>
            <GloveSimilarityPanel />
          </div>

          {/* ── BERT MLM ── */}
          <div className="space-y-3">
            <h2>Contextual predictions with BERT</h2>
            <p>
              BERT was trained to predict masked tokens from surrounding context—the masked language
              modeling (MLM) objective. This means it doesn't look at "python" in isolation; it sees
              "python" in the context of "memory management" and predicts accordingly. When the word
              "python" is masked in "documentation for memory management for the{' '}
              <span className="rounded bg-amber-50 px-0.5 font-mono text-amber-800">[MASK]</span>{' '}
              programming language," BERT should strongly predict <em>python</em>—and its runner-up
              predictions will be other programming languages and related terms, not snakes.
            </p>
            <p>Click any token below to mask it and see BERT's top predictions in real time.</p>
            <MaskedLMPanel
              modelLoadStatus={state.loadStatus}
              mlmStatus={state.mlmStatus}
              mlmMaskedWord={state.mlmMaskedWord}
              mlmPredictions={state.mlmPredictions}
              mlmError={state.mlmError}
              onRunMlm={runMlm}
            />
          </div>

          {/* ── From MLM to SPLADE ── */}
          <div className="space-y-3">
            <h2>From BERT predictions to a sparse vector</h2>
            <p>
              The demo above runs one forward pass and reads the prediction distribution at a single
              masked position. SPLADE does something slightly different: it runs{' '}
              <strong>one forward pass over the full, unmasked query</strong> and reads the logit
              distribution at <em>every</em> token position simultaneously. For a three-word query,
              that means three parallel distributions—one for "python," one for "memory," one for
              "management."
            </p>
            <p>
              Each raw logit <em>x</em> is then passed through the SPLADE activation function:
            </p>
            <div className="my-2 rounded-md border border-border bg-muted/40 px-5 py-4 font-mono text-sm">
              <span className="text-muted-foreground">score(v, t) = </span>
              <span className="font-semibold">log</span>
              <span>(1 + </span>
              <span className="font-semibold">ReLU</span>
              <span>(h</span>
              <sub>t</sub>
              <span>(v)))</span>
            </div>
            <p>
              where <em>v</em> is a vocabulary token and <em>t</em> is an input token position. ReLU
              clips negative logits to zero—most vocabulary entries score zero, giving the vector
              its sparsity. The <code className="font-mono text-sm">log(1 + ·)</code> compresses the
              remaining values so no single high-confidence prediction overwhelms the rest.
            </p>
            <p>
              After activating all positions, SPLADE takes the <strong>maximum</strong> across
              positions for each vocabulary dimension:
            </p>
            <div className="my-2 rounded-md border border-border bg-muted/40 px-5 py-4 font-mono text-sm">
              <span className="text-muted-foreground">SPLADE(v) = </span>
              <span>max</span>
              <sub className="mr-1">t</sub>
              <span>[ score(v, t) ]</span>
            </div>
            <p>
              If "allocation" scores highly under "memory" and modestly under "management," the
              max-pool preserves the higher value. The result is a single sparse vector that
              represents the union of all per-position expansions, weighted by BERT's contextual
              confidence.
            </p>
            <SpladeAggregationDiagram />
            <p>
              This sparse vector is the SPLADE representation. Its nonzero dimensions are vocabulary
              tokens that BERT considered relevant at some position in the query, and their weights
              reflect how strongly. Because the vector is sparse (most entries are zero), it can be
              stored and queried using a standard inverted index—the same infrastructure as
              BM25—while carrying the contextual signal of a transformer model. That's the full
              picture: a single forward pass, a nonlinear activation, and a max-pool, built on top
              of a model that was already trained to understand context.
            </p>
          </div>
        </div>
      </main>
      <footer className="border-t border-border px-6 py-3 text-center text-xs text-muted-foreground">
        Browser-only inference · transformers.js + WebAssembly · no data leaves your device
      </footer>
    </div>
  );
}
