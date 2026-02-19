/**
 * Extract top-K entries from a Float32Array segment, zeroing out the rest.
 * @param arr   The full array
 * @param k     Number of top entries to keep
 * @param offset Start index of the segment (default 0)
 * @param length Length of the segment (default arr.length - offset)
 */
export function topKInPlace(
  arr: Float32Array,
  k: number,
  offset = 0,
  length?: number
): void {
  const len = length ?? arr.length - offset;
  const end = offset + len;

  if (k >= len) return; // nothing to prune

  // Collect (index, value) pairs with non-zero values
  const nonzero: Array<[number, number]> = [];
  for (let i = offset; i < end; i++) {
    if (arr[i] > 0) nonzero.push([i, arr[i]]);
  }

  if (nonzero.length <= k) return; // already sparse enough

  // Partial sort: find the k-th largest value
  nonzero.sort((a, b) => b[1] - a[1]);
  const threshold = nonzero[k - 1][1];

  // Zero out everything below threshold
  let kept = 0;
  for (let i = offset; i < end; i++) {
    if (arr[i] > threshold) {
      kept++;
    } else if (arr[i] === threshold) {
      if (kept < k) {
        kept++;
      } else {
        arr[i] = 0;
      }
    } else {
      arr[i] = 0;
    }
  }
}

/**
 * Extract top-K entries as sorted WeightEntry array from a Float32Array.
 */
export function getTopK(
  arr: Float32Array,
  k: number,
  idxToWord: (idx: number) => string,
  offset = 0,
  length?: number
): Array<{ word: string; weight: number }> {
  const len = length ?? arr.length - offset;
  const end = offset + len;

  const pairs: Array<[number, number]> = [];
  for (let i = offset; i < end; i++) {
    if (arr[i] > 0) pairs.push([i, arr[i]]);
  }

  pairs.sort((a, b) => b[1] - a[1]);

  return pairs.slice(0, k).map(([idx, weight]) => ({
    word: idxToWord(idx - offset),
    weight,
  }));
}
