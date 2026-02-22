'use client';

import { useCallback, useReducer, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GloveVocabSize = 10 | 20 | 30;

export type GloveStatus = 'idle' | 'loading' | 'loaded' | 'error';

export type SimilarWord = { word: string; score: number };

type GloveData = {
  words: string[];
  /** Flat Float32Array, length = numWords × dim, row-major. */
  vectors: Float32Array;
  /** Precomputed L2 norms, length = numWords. */
  norms: Float32Array;
  wordIndex: Map<string, number>;
  dim: number;
};

type GloveState = {
  status: GloveStatus;
  error: string | null;
  vocabSize: GloveVocabSize | null;
  numWords: number;
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const initialState: GloveState = {
  status: 'idle',
  error: null,
  vocabSize: null,
  numWords: 0,
};

type Action =
  | { type: 'LOADING'; vocabSize: GloveVocabSize }
  | { type: 'LOADED'; numWords: number; vocabSize: GloveVocabSize }
  | { type: 'ERROR'; message: string };

function reducer(state: GloveState, action: Action): GloveState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: 'loading', error: null, vocabSize: action.vocabSize };
    case 'LOADED':
      return { ...state, status: 'loaded', numWords: action.numWords, vocabSize: action.vocabSize };
    case 'ERROR':
      return { ...state, status: 'error', error: action.message };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Binary parsing
// ---------------------------------------------------------------------------
// Format written by scripts/build-glove.mjs:
//   [0-3]   magic "GLVE"
//   [4-7]   num_words uint32 LE
//   [8-11]  dim uint32 LE
//   [12-15] words_json_byte_len uint32 LE
//   [16 ..] words JSON (UTF-8)
//   [pad]   0-3 bytes to align to 4 bytes
//   [...]   Float32Array, num_words × dim values, LE

function parseBinary(buffer: ArrayBuffer): GloveData {
  const view = new DataView(buffer);

  const magic = String.fromCharCode(
    view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3),
  );
  if (magic !== 'GLVE') throw new Error('Invalid GloVe binary file (bad magic)');

  const numWords = view.getUint32(4, true);
  const dim = view.getUint32(8, true);
  const wordsBytesLen = view.getUint32(12, true);

  const wordsBytes = new Uint8Array(buffer, 16, wordsBytesLen);
  const words: string[] = JSON.parse(new TextDecoder().decode(wordsBytes));

  const padLen = (4 - (wordsBytesLen % 4)) % 4;
  const vecsOffset = 16 + wordsBytesLen + padLen;

  // Zero-copy view into the ArrayBuffer
  const vectors = new Float32Array(buffer, vecsOffset, numWords * dim);

  // Precompute L2 norms so cosine similarity is just a dot product
  const norms = new Float32Array(numWords);
  for (let i = 0; i < numWords; i++) {
    let sum = 0;
    const base = i * dim;
    for (let j = 0; j < dim; j++) {
      const v = vectors[base + j];
      sum += v * v;
    }
    norms[i] = Math.sqrt(sum);
  }

  const wordIndex = new Map<string, number>(words.map((w, i) => [w, i]));

  return { words, vectors, norms, wordIndex, dim };
}

// ---------------------------------------------------------------------------
// Fetch + Cache API
// ---------------------------------------------------------------------------

/**
 * Base URL for GloVe binary files.
 *
 * Development:  Set NEXT_PUBLIC_GLOVE_BASE_URL to e.g. "/glove/" in .env.local
 *               (files served from public/glove/ by Next.js dev server).
 *
 * Production:   Set NEXT_PUBLIC_GLOVE_BASE_URL to your HuggingFace dataset
 *               resolve URL, e.g.:
 *               https://huggingface.co/datasets/<user>/<repo>/resolve/main/
 */
const GLOVE_BASE_URL = process.env.NEXT_PUBLIC_GLOVE_BASE_URL ?? '/glove/';

function gloveUrl(n: GloveVocabSize): string {
  return `${GLOVE_BASE_URL}glove-${n}k.bin`;
}

async function fetchWithCache(url: string): Promise<ArrayBuffer> {
  // Prefer Cache API so subsequent page loads are instant
  if (typeof caches !== 'undefined') {
    const cache = await caches.open('glove-embeddings-v1');
    const cached = await cache.match(url);
    if (cached) return cached.arrayBuffer();

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    await cache.put(url, response.clone());
    return response.arrayBuffer();
  }

  // Fallback (e.g. server-side render path, though this hook is client-only)
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  return response.arrayBuffer();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGloveEmbeddings() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const dataRef = useRef<GloveData | null>(null);

  const load = useCallback(async (n: GloveVocabSize) => {
    dispatch({ type: 'LOADING', vocabSize: n });
    try {
      const buffer = await fetchWithCache(gloveUrl(n));
      const data = parseBinary(buffer);
      dataRef.current = data;
      dispatch({ type: 'LOADED', numWords: data.words.length, vocabSize: n });
    } catch (err) {
      dispatch({ type: 'ERROR', message: (err as Error).message });
    }
  }, []);

  /**
   * Returns the top-k most similar words to `word` by cosine similarity.
   * The query word itself is excluded from results.
   * Words not in the vocabulary return an empty array.
   */
  const findNearest = useCallback((word: string, k = 10): SimilarWord[] => {
    const data = dataRef.current;
    if (!data) return [];

    const { vectors, norms, words, wordIndex, dim } = data;
    const queryIdx = wordIndex.get(word.toLowerCase());
    if (queryIdx === undefined) return [];

    const queryNorm = norms[queryIdx];
    if (queryNorm === 0) return [];

    const queryBase = queryIdx * dim;
    const results: SimilarWord[] = [];

    for (let i = 0; i < words.length; i++) {
      if (i === queryIdx) continue;
      const iNorm = norms[i];
      if (iNorm === 0) continue;

      let dot = 0;
      const base = i * dim;
      for (let j = 0; j < dim; j++) {
        dot += vectors[queryBase + j] * vectors[base + j];
      }
      results.push({ word: words[i], score: dot / (queryNorm * iNorm) });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }, []);

  return { state, load, findNearest };
}