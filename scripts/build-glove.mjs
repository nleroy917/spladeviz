#!/usr/bin/env node
/**
 * Converts GloVe 6B 50d subsample .txt files into compact binary files for
 * browser delivery. Output goes to public/glove/.
 *
 * Usage:
 *   node scripts/build-glove.mjs
 *
 * Binary format:
 *   [0-3]   magic: "GLVE" (4 bytes ASCII)
 *   [4-7]   num_words: uint32 LE
 *   [8-11]  dim: uint32 LE
 *   [12-15] words_json_byte_len: uint32 LE
 *   [16 .. 16+len-1]  words: UTF-8 encoded JSON array of strings
 *   [... 0-3 bytes padding to align to 4-byte boundary ...]
 *   [...]   vectors: num_words × dim × float32 LE (flat, row-major)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SOURCES = [
  { n: 10, path: '/Users/nathanleroy/Desktop/glove.6B.50d.10k.txt' },
  { n: 20, path: '/Users/nathanleroy/Desktop/glove.6B.50d.20k.txt' },
  { n: 30, path: '/Users/nathanleroy/Desktop/glove.6B.50d.30k.txt' },
];

const OUT_DIR = 'public/glove';
mkdirSync(OUT_DIR, { recursive: true });

for (const { n, path } of SOURCES) {
  console.log(`\nProcessing ${n}k words from ${path}...`);

  const text = readFileSync(path, 'utf-8');
  const lines = text.trim().split('\n');

  const words = [];
  let dim = 0;

  // First pass: determine dim and collect words
  for (const line of lines) {
    const spaceIdx = line.indexOf(' ');
    words.push(line.slice(0, spaceIdx));
    if (dim === 0) {
      dim = line.slice(spaceIdx + 1).split(' ').length;
    }
  }

  console.log(`  ${words.length} words, dim=${dim}`);

  // Build Float32Array of all vectors (flat, row-major)
  const vectors = new Float32Array(words.length * dim);
  for (let i = 0; i < lines.length; i++) {
    const spaceIdx = lines[i].indexOf(' ');
    const nums = lines[i].slice(spaceIdx + 1).split(' ');
    const base = i * dim;
    for (let j = 0; j < dim; j++) {
      vectors[base + j] = parseFloat(nums[j]);
    }
  }

  // Encode words as JSON
  const wordsJson = JSON.stringify(words);
  const wordsBytes = Buffer.from(wordsJson, 'utf-8');
  const wordsBytesLen = wordsBytes.length;

  // Padding to align vectors to 4-byte boundary
  const padLen = (4 - (wordsBytesLen % 4)) % 4;

  const headerSize = 16;
  const totalSize = headerSize + wordsBytesLen + padLen + vectors.byteLength;
  const buf = Buffer.allocUnsafe(totalSize);

  let offset = 0;

  // Magic
  buf.write('GLVE', offset, 'ascii');
  offset += 4;

  // num_words
  buf.writeUInt32LE(words.length, offset);
  offset += 4;

  // dim
  buf.writeUInt32LE(dim, offset);
  offset += 4;

  // words_json_byte_len
  buf.writeUInt32LE(wordsBytesLen, offset);
  offset += 4;

  // words JSON bytes
  wordsBytes.copy(buf, offset);
  offset += wordsBytesLen;

  // padding
  buf.fill(0, offset, offset + padLen);
  offset += padLen;

  // vectors (Float32Array as raw LE bytes)
  Buffer.from(vectors.buffer).copy(buf, offset);

  const outPath = join(OUT_DIR, `glove-${n}k.bin`);
  writeFileSync(outPath, buf);

  const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
  console.log(`  Written to ${outPath} (${sizeMB} MB)`);
}

console.log('\nDone! Files written to public/glove/');
console.log(
  'To host on HuggingFace, upload the .bin files to a dataset repo and set:\n' +
  '  NEXT_PUBLIC_GLOVE_BASE_URL=https://huggingface.co/datasets/<user>/<repo>/resolve/main/\n' +
  'in your .env.local or GitHub Actions environment.'
);