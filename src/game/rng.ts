// Seeded random numbers. Every gameplay random call reads an Rng made from the run's seed, so the
// same seed always builds the same mountain (the Adventure levels rely on it, and so do the tests).

/** A random number generator: each call returns the next number in [0, 1). */
export type Rng = () => number;

/** A mulberry32 generator started from a seed. */
export function makeRng(seed: number): Rng {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number in [a, b). */
export function range(r: Rng, a: number, b: number): number {
  return a + r() * (b - a);
}

/** One element of a list. */
export function pick<T>(r: Rng, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)];
}

/** One key of a table of weights, in proportion to its weight. */
export function weighted<K extends string>(r: Rng, weights: Record<K, number>): K {
  const keys = Object.keys(weights) as K[];
  let total = 0;
  for (const k of keys) total += weights[k];
  let x = r() * total;
  for (const k of keys) { x -= weights[k]; if (x < 0) return k; }
  return keys[keys.length - 1];
}
