// The Adventure's rules: the stars a level gives, and which levels are open. The levels
// themselves are in data/levels.json.

/** How a level went. */
export interface LevelResult {
  /** The wheel crossed the finish line. */
  won: boolean;
  /** Potatoes picked up, and potatoes laid in the level. */
  potatoes: number;
  total: number;
  /** Hits that cost a slice (a hit the pan blocked does not count). */
  hits: number;
}

/** The three stars of a level, each one earned or not: the finish, half the potatoes, no slice lost. */
export function starParts(r: LevelResult): [boolean, boolean, boolean] {
  if (!r.won) return [false, false, false];
  return [true, r.total === 0 || r.potatoes * 2 >= r.total, r.hits === 0];
}

/** The stars a level gives, 0 to 3. */
export function starsFor(r: LevelResult): number {
  return starParts(r).filter(Boolean).length;
}

/** True when level i (from 0) can be played: the first one, or one whose previous level is done. */
export function isUnlocked(stars: readonly number[], i: number): boolean {
  return i === 0 || (stars[i - 1] ?? 0) > 0;
}

/** Every star earned. */
export function totalStars(stars: readonly number[]): number {
  return stars.reduce((n, s) => n + s, 0);
}

/** Keeps the best result of a level: a replay never takes stars away. */
export function recordStars(stars: number[], i: number, earned: number): number[] {
  const out = [...stars];
  while (out.length <= i) out.push(0);
  out[i] = Math.max(out[i], earned);
  return out;
}
