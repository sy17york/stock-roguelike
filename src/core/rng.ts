// Seedable random number generator (mulberry32).
// state() returns the current seed so a save can resume the same sequence.

export interface Rng {
  next(): number // float in [0, 1)
  state(): number // store this in RunState.rngSeed
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
    state() {
      return a
    },
  }
}

// Integer in [0, maxExclusive)
export function randInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng.next() * maxExclusive)
}