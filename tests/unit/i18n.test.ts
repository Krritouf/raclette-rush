import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { describe as sentence, missionDef } from '../../src/game/missions';
import { EN, english } from '../../src/i18n';
import levels from '../../data/levels.json';
import { CHEESES, MISSIONS } from './fixtures';

const LEVELS: { name: string }[] = levels;

describe('English', () => {
  it('translates every mission', () => {
    for (let i = 0; i < MISSIONS.length * 2; i++) {
      const s = sentence(missionDef(MISSIONS, i));
      expect(english(s), s).not.toBeNull();
    }
  });

  it('translates every cheese name and description', () => {
    for (const c of CHEESES) { expect(EN[c.name], c.name).toBeDefined(); expect(EN[c.desc], c.desc).toBeDefined(); }
  });

  it('translates every level name', () => {
    for (const lv of LEVELS) expect(EN[lv.name], lv.name).toBeDefined();
  });

  it('translates every French sentence written in the screens and the game', () => {
    // every quoted text with a space or a capital word in it, minus code (colours, fonts, ids)
    const missing: string[] = [];
    for (const f of ['src/screens.ts', 'src/main.ts']) {
      const src = readFileSync(resolve(f), 'utf8');
      for (const m of src.matchAll(/'([^'\n]{2,})'/g)) {
        const s = m[1];
        if (!/[A-ZÉ]{2}|[a-zé] [a-zé]|!$|…$/.test(s)) continue;
        if (/px|rgba|#|\$\{|\b(Space|Arrow|Key|Escape|Enter)\b|system-ui|Segoe/.test(s)) continue;
        if (english(s) === null) missing.push(s);
      }
    }
    expect(missing).toEqual([]);
  });

  it('fills the numbers and names into the sentences', () => {
    expect(english('Record : 1234 m')).toBe('Best: 1234 m');
    expect(english('Tomme : à toi !')).toBe('Tomme is yours!');
    expect(english('ACHETER 150')).toBe('BUY 150');
  });
});
