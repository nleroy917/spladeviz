// Shared types for the worker ↔ main thread message protocol

export type TokenEntry = {
  token: string;
  tokenId: number;
  isSpecial: boolean;
};

export type WeightEntry = {
  word: string;
  weight: number;
};

// Main → Worker messages
export type LoadModelMessage = {
  type: 'LOAD_MODEL';
  modelId: string;
  dtype: 'q8' | 'fp32';
  device: 'wasm' | 'webgpu';
};

export type RunInferenceMessage = {
  type: 'RUN_INFERENCE';
  text: string;
  topK: number;
  topM: number;
};

export type RunMlmMessage = {
  type: 'RUN_MLM';
  /** Full query text (unmasked). */
  text: string;
  /** Index of the space-split word to replace with [MASK]. */
  maskedWordIdx: number;
  topK: number;
};

export type WorkerIncomingMessage = LoadModelMessage | RunInferenceMessage | RunMlmMessage;

// Worker → Main messages
export type ModelLoadingProgressMessage = {
  type: 'MODEL_LOADING_PROGRESS';
  file: string;
  progress: number;
  loaded: number;
  total: number;
  status: string;
  fromCache: boolean;
};

export type ModelLoadedMessage = {
  type: 'MODEL_LOADED';
  modelId: string;
  fromCache: boolean;
  vocabSize: number;
};

export type ModelErrorMessage = {
  type: 'MODEL_ERROR';
  message: string;
  modelId: string;
};

export type InferenceRunningMessage = {
  type: 'INFERENCE_RUNNING';
};

export type InferenceResultMessage = {
  type: 'INFERENCE_RESULT';
  modelId: string;
  tokens: TokenEntry[];
  tokenDistributions: WeightEntry[][];
  sparseVector: WeightEntry[];
};

export type InferenceErrorMessage = {
  type: 'INFERENCE_ERROR';
  message: string;
};

export type MlmRunningMessage = {
  type: 'MLM_RUNNING';
};

export type MlmResultMessage = {
  type: 'MLM_RESULT';
  /** Top-K predicted tokens, sorted by probability desc. weight = probability (0–1). */
  predictions: WeightEntry[];
  /** The original word that was replaced by [MASK]. */
  maskedWord: string;
};

export type MlmErrorMessage = {
  type: 'MLM_ERROR';
  message: string;
};

export type WorkerOutgoingMessage =
  | ModelLoadingProgressMessage
  | ModelLoadedMessage
  | ModelErrorMessage
  | InferenceRunningMessage
  | InferenceResultMessage
  | InferenceErrorMessage
  | MlmRunningMessage
  | MlmResultMessage
  | MlmErrorMessage;
