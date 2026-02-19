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

export type WorkerIncomingMessage = LoadModelMessage | RunInferenceMessage;

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

export type WorkerOutgoingMessage =
  | ModelLoadingProgressMessage
  | ModelLoadedMessage
  | ModelErrorMessage
  | InferenceRunningMessage
  | InferenceResultMessage
  | InferenceErrorMessage;
