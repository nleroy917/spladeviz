export type ModelInfo = {
  id: string;
  label: string;
  isSpladeNative: boolean;
  hasOnnxWeights: boolean;
};

export const MODELS: ModelInfo[] = [
  {
    id: 'Xenova/bert-base-uncased',
    label: 'BERT Base',
    isSpladeNative: false,
    hasOnnxWeights: true,
  },
  {
    id: 'Xenova/distilbert-base-uncased',
    label: 'DistilBERT Base',
    isSpladeNative: false,
    hasOnnxWeights: true,
  },
  {
    id: 'naver/splade-cocondenser-ensembledistil',
    label: 'SPLADE CoCo Distil',
    isSpladeNative: true,
    hasOnnxWeights: false,
  },
  {
    id: 'naver/splade-v3',
    label: 'SPLADE v3',
    isSpladeNative: true,
    hasOnnxWeights: false,
  },
];

export const DEFAULT_MODEL_ID = 'Xenova/distilbert-base-uncased';

export const ONNX_CONVERSION_CMD = (modelId: string) =>
  `optimum-cli export onnx --model ${modelId} --task fill-mask ./out/`;
