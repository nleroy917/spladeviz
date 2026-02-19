import {
  AutoTokenizer,
  AutoModelForMaskedLM,
  env,
  type PreTrainedTokenizer,
  type PreTrainedModel,
} from '@huggingface/transformers';

import { topKInPlace, getTopK } from '@/lib/topk';
import type {
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
  TokenEntry,
  WeightEntry,
} from '@/types/worker';

// Prevent 404 HTML responses being parsed as JSON in dev
env.allowLocalModels = false;

let tokenizer: PreTrainedTokenizer | null = null;
let model: PreTrainedModel | null = null;
let currentModelId = '';
let vocabSize = 0;

function post(msg: WorkerOutgoingMessage) {
  self.postMessage(msg);
}

async function loadModel(
  modelId: string,
  dtype: 'q8' | 'fp32',
  device: 'wasm' | 'webgpu'
) {
  currentModelId = modelId;
  let anyProgress = false;

  const progressCallback = (progress: {
    file?: string;
    progress?: number;
    loaded?: number;
    total?: number;
    status?: string;
  }) => {
    anyProgress = true;
    post({
      type: 'MODEL_LOADING_PROGRESS',
      file: progress.file ?? '',
      progress: progress.progress ?? 0,
      loaded: progress.loaded ?? 0,
      total: progress.total ?? 0,
      status: progress.status ?? '',
      fromCache: false,
    });
  };

  try {
    tokenizer = await AutoTokenizer.from_pretrained(modelId, {
      progress_callback: progressCallback,
    });

    model = await AutoModelForMaskedLM.from_pretrained(modelId, {
      dtype: dtype,
      device: device,
      progress_callback: progressCallback,
    });

    // Determine vocab size from tokenizer
    // @ts-expect-error - accessing internal vocab
    const vocab = tokenizer.vocab ?? tokenizer.get_vocab?.();
    vocabSize = vocab ? Object.keys(vocab).length : 30522;

    post({
      type: 'MODEL_LOADED',
      modelId,
      fromCache: !anyProgress,
      vocabSize,
    });
  } catch (err) {
    post({
      type: 'MODEL_ERROR',
      message: err instanceof Error ? err.message : String(err),
      modelId,
    });
  }
}

async function runInference(text: string, topK: number, topM: number) {
  if (!tokenizer || !model) {
    post({ type: 'INFERENCE_ERROR', message: 'Model not loaded' });
    return;
  }

  post({ type: 'INFERENCE_RUNNING' });

  try {
    // 1. Tokenize
    const inputs = await tokenizer(text, {
      truncation: true,
      max_length: 512,
    });

    // 2. Forward pass
    const output = await model(inputs);
    const logits = output.logits; // [1, seqLen, vocabSize]
    const [, seqLen, vSize] = logits.dims;
    const raw = logits.data as Float32Array;

    // Use actual vocab size from logits
    const voc = vSize;

    // 3. SPLADE activation: log(1 + ReLU(x))
    const splade = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      splade[i] = raw[i] > 0 ? Math.log1p(raw[i]) : 0;
    }

    // 4. Per-token top-K (in-place, zero out non-top entries)
    for (let pos = 0; pos < seqLen; pos++) {
      topKInPlace(splade, topK, pos * voc, voc);
    }

    // 5. Max-pool → sparse vector
    const vec = new Float32Array(voc);
    for (let pos = 0; pos < seqLen; pos++) {
      for (let v = 0; v < voc; v++) {
        const val = splade[pos * voc + v];
        if (val > vec[v]) vec[v] = val;
      }
    }

    // 6. Decode tokens for the chip list
    // input_ids may be BigInt64Array
    const inputIds = inputs.input_ids.data;
    const tokens: TokenEntry[] = [];
    for (let i = 0; i < seqLen; i++) {
      const id = Number(inputIds[i]);
      const decoded = tokenizer!.decode([id], { skip_special_tokens: false });
      const token = decoded.trim();
      // Special tokens: [CLS], [SEP], [PAD], <s>, </s>, etc.
      const isSpecial =
        token.startsWith('[') ||
        token.startsWith('<') ||
        token === '' ||
        id === 0 ||
        id === 101 ||
        id === 102 ||
        id === 1 ||
        id === 2;
      tokens.push({ token: token || `[${id}]`, tokenId: id, isSpecial });
    }

    // 7. Build per-token distributions (top-K entries per position)
    const idxToWord = (idx: number): string => {
      try {
        const decoded = tokenizer!.decode([idx], { skip_special_tokens: false });
        return decoded.trim() || `[${idx}]`;
      } catch {
        return `[${idx}]`;
      }
    };

    const tokenDistributions: WeightEntry[][] = [];
    for (let pos = 0; pos < seqLen; pos++) {
      const dist = getTopK(splade, topK, idxToWord, pos * voc, voc);
      tokenDistributions.push(dist);
    }

    // 8. Top-M for sparse vector
    const sparseVector: WeightEntry[] = getTopK(vec, topM, idxToWord);

    post({
      type: 'INFERENCE_RESULT',
      modelId: currentModelId,
      tokens,
      tokenDistributions,
      sparseVector,
    });
  } catch (err) {
    post({
      type: 'INFERENCE_ERROR',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

self.addEventListener('message', (event: MessageEvent<WorkerIncomingMessage>) => {
  const msg = event.data;
  if (msg.type === 'LOAD_MODEL') {
    loadModel(msg.modelId, msg.dtype, msg.device);
  } else if (msg.type === 'RUN_INFERENCE') {
    runInference(msg.text, msg.topK, msg.topM);
  }
});
