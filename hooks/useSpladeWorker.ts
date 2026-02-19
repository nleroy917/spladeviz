'use client';

import { useEffect, useReducer, useRef, useCallback } from 'react';
import { DEFAULT_MODEL_ID } from '@/lib/models';
import type {
  WorkerOutgoingMessage,
  TokenEntry,
  WeightEntry,
} from '@/types/worker';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------
export type LoadStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'error';

export type InferenceStatus =
  | 'idle'
  | 'running'
  | 'done'
  | 'error';

export type SpladeState = {
  modelId: string;
  loadStatus: LoadStatus;
  loadError: string | null;
  loadProgress: number; // 0-100 overall
  loadProgressFile: string;
  fromCache: boolean;
  vocabSize: number;

  inferenceStatus: InferenceStatus;
  inferenceError: string | null;

  tokens: TokenEntry[];
  tokenDistributions: WeightEntry[][];
  sparseVector: WeightEntry[];
  hoveredTokenIdx: number | null;
  lockedTokenIdx: number | null;
};

const initialState: SpladeState = {
  modelId: DEFAULT_MODEL_ID,
  loadStatus: 'idle',
  loadError: null,
  loadProgress: 0,
  loadProgressFile: '',
  fromCache: false,
  vocabSize: 0,

  inferenceStatus: 'idle',
  inferenceError: null,

  tokens: [],
  tokenDistributions: [],
  sparseVector: [],
  hoveredTokenIdx: null,
  lockedTokenIdx: null,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
type Action =
  | { type: 'MODEL_LOADING'; modelId: string }
  | { type: 'LOAD_PROGRESS'; file: string; progress: number }
  | { type: 'MODEL_LOADED'; modelId: string; fromCache: boolean; vocabSize: number }
  | { type: 'MODEL_ERROR'; message: string }
  | { type: 'INFERENCE_RUNNING' }
  | {
      type: 'INFERENCE_DONE';
      modelId: string;
      tokens: TokenEntry[];
      tokenDistributions: WeightEntry[][];
      sparseVector: WeightEntry[];
    }
  | { type: 'INFERENCE_ERROR'; message: string }
  | { type: 'HOVER_TOKEN'; idx: number | null }
  | { type: 'LOCK_TOKEN'; idx: number | null }
  | { type: 'SET_MODEL'; modelId: string };

function reducer(state: SpladeState, action: Action): SpladeState {
  switch (action.type) {
    case 'MODEL_LOADING':
      return {
        ...state,
        modelId: action.modelId,
        loadStatus: 'loading',
        loadError: null,
        loadProgress: 0,
        loadProgressFile: '',
        fromCache: false,
        tokens: [],
        tokenDistributions: [],
        sparseVector: [],
        hoveredTokenIdx: null,
        lockedTokenIdx: null,
        inferenceStatus: 'idle',
        inferenceError: null,
      };
    case 'LOAD_PROGRESS':
      return {
        ...state,
        loadProgress: action.progress,
        loadProgressFile: action.file,
      };
    case 'MODEL_LOADED':
      return {
        ...state,
        loadStatus: 'loaded',
        modelId: action.modelId,
        fromCache: action.fromCache,
        vocabSize: action.vocabSize,
        loadProgress: 100,
      };
    case 'MODEL_ERROR':
      return {
        ...state,
        loadStatus: 'error',
        loadError: action.message,
      };
    case 'INFERENCE_RUNNING':
      return {
        ...state,
        inferenceStatus: 'running',
        inferenceError: null,
      };
    case 'INFERENCE_DONE': {
      const firstNonSpecial = action.tokens.findIndex((t) => !t.isSpecial);
      return {
        ...state,
        inferenceStatus: 'done',
        tokens: action.tokens,
        tokenDistributions: action.tokenDistributions,
        sparseVector: action.sparseVector,
        hoveredTokenIdx: null,
        lockedTokenIdx: firstNonSpecial >= 0 ? firstNonSpecial : null,
      };
    }
    case 'INFERENCE_ERROR':
      return {
        ...state,
        inferenceStatus: 'error',
        inferenceError: action.message,
      };
    case 'HOVER_TOKEN':
      return { ...state, hoveredTokenIdx: action.idx };
    case 'LOCK_TOKEN':
      return {
        ...state,
        lockedTokenIdx: action.idx === state.lockedTokenIdx ? null : action.idx,
      };
    case 'SET_MODEL':
      return { ...state, modelId: action.modelId };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useSpladeWorker() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const workerRef = useRef<Worker | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Create worker once
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/splade.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<WorkerOutgoingMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'MODEL_LOADING_PROGRESS':
          dispatch({
            type: 'LOAD_PROGRESS',
            file: msg.file,
            progress: msg.progress,
          });
          break;
        case 'MODEL_LOADED':
          dispatch({
            type: 'MODEL_LOADED',
            modelId: msg.modelId,
            fromCache: msg.fromCache,
            vocabSize: msg.vocabSize,
          });
          break;
        case 'MODEL_ERROR':
          dispatch({ type: 'MODEL_ERROR', message: msg.message });
          break;
        case 'INFERENCE_RUNNING':
          dispatch({ type: 'INFERENCE_RUNNING' });
          break;
        case 'INFERENCE_RESULT':
          dispatch({
            type: 'INFERENCE_DONE',
            modelId: msg.modelId,
            tokens: msg.tokens,
            tokenDistributions: msg.tokenDistributions,
            sparseVector: msg.sparseVector,
          });
          break;
        case 'INFERENCE_ERROR':
          dispatch({ type: 'INFERENCE_ERROR', message: msg.message });
          break;
      }
    };

    worker.onerror = (err) => {
      dispatch({ type: 'MODEL_ERROR', message: err.message ?? 'Worker error' });
    };

    workerRef.current = worker;

    // Auto-load default model
    dispatch({ type: 'MODEL_LOADING', modelId: DEFAULT_MODEL_ID });
    worker.postMessage({
      type: 'LOAD_MODEL',
      modelId: DEFAULT_MODEL_ID,
      dtype: 'q8',
      device: 'wasm',
    });

    return () => {
      worker.terminate();
    };
  }, []);

  const loadModel = useCallback((modelId: string) => {
    dispatch({ type: 'MODEL_LOADING', modelId });
    workerRef.current?.postMessage({
      type: 'LOAD_MODEL',
      modelId,
      dtype: 'q8',
      device: 'wasm',
    });
  }, []);

  const runInference = useCallback((text: string) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'RUN_INFERENCE',
      text,
      topK: 50,
      topM: 50,
    });
  }, []);

  const hoverToken = useCallback((idx: number | null) => {
    dispatch({ type: 'HOVER_TOKEN', idx });
  }, []);

  const lockToken = useCallback((idx: number | null) => {
    dispatch({ type: 'LOCK_TOKEN', idx });
  }, []);

  return { state, loadModel, runInference, hoverToken, lockToken };
}
