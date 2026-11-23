import { describe, expect, it } from 'vitest';
import { SAVE_KEY, buy, choose, defaults, load, store, type Store } from '../../src/game/save';
import { CHEESES } from './fixtures';

const memory = (init: Record<string, string> = {}): Store => {
  const m = new Map(Object.entries(init));
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe('save', () => {
  it('gives a new player the defaults', () => {
    expect(load(memory(), 'en')).toEqual(defaults('en'));
  });

  it('reads back what it wrote', () => {
    const s = memory(), d = defaults();
    d.bank = 321; d.best = 1234; d.tutorialDone = true; d.settings.music = false;
    store(s, d);
    expect(load(s)).toEqual(d);
  });

  it('survives a broken or tampered save', () => {
    expect(load(memory({ [SAVE_KEY]: '{not json' }))).toEqual(defaults());
    const bad = load(memory({ [SAVE_KEY]: JSON.stringify({ bank: -50, best: 'x', owned: ['gruyere', 3], cheese: 'tete', missions: { next: 1 } }) }));
    expect(bad.bank).toBe(0);
    expect(bad.best).toBe(0);
    expect(bad.owned).toEqual(['valais', 'gruyere']);
    expect(bad.cheese).toBe('valais');
    expect(bad.missions).toEqual(defaults().missions);
  });

  it('buys a cheese only with enough potatoes, then rolls it', () => {
    const d = defaults(), tomme = CHEESES.find(c => c.id === 'tomme')!;
    d.bank = tomme.price - 1;
    expect(buy(d, tomme)).toBe('poor');
    d.bank = tomme.price + 5;
    expect(buy(d, tomme)).toBe('bought');
    expect(d.bank).toBe(5);
    expect(d.cheese).toBe('tomme');
    expect(buy(d, tomme)).toBe('owned');
    expect(d.bank).toBe(5);
  });

  it('chooses only a cheese already bought', () => {
    const d = defaults();
    expect(choose(d, 'gruyere')).toBe(false);
    expect(choose(d, 'valais')).toBe(true);
  });
});
