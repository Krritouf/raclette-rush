# Raclette Rush — Game Brief

*Last updated: 2026-11-23 (the Adventure)*

## The pitch

A cheese wheel breaks loose from an Alpine chalet and races down the mountain. One button:
jump. Every rock, fence, fir tree and cow knocks a slice off the wheel; lose them all and
it's over. Pick up potatoes on the way down (a raclette needs them) and spend them on new
cheeses.

## Player fantasy

The joyful chaos of a runaway wheel: speed, close calls, and the slapstick of a cow
taking a slice. The player should laugh when they fail and want to go again right away.

## Platform and audience

- **Android (Play Store)** first, and playable in a browser. Landscape is recommended;
  portrait works.
- Short sessions (a run lasts 15 to 60 s), for everyone. The humour is about Swiss and
  French cheese, in French and English.

## Pillars

1. **One button, deep timing.** A tap gives a small hop, a long press a big jump. No other
   control, ever.
2. **The wheel is the health bar.** Damage shows on the hero itself, a slice at a time.
3. **Alpine and cheesy.** Every object, bonus and joke comes from the mountain and the
   raclette table (pan, pickle, potatoes, Hérens cows).

## Modes

| Mode | Status | What it is |
|------|--------|------------|
| **Adventure** (the main mode) | built | 10 fixed levels (`data/levels.json`), 500 m to 2,000 m, harder one after the other. Each ends at a finish arch; past it, the wheel rolls to a feast table where the guests raise their arms in time. 1 to 3 stars; finishing a level opens the next. |
| **Quick Game** | built | The endless mountain from a random seed, harder the further you go. Goal: the record. |

### The Adventure

- **Fixed levels.** Each level is a seed, a length, a difficulty, the obstacles it allows, how often kickers and cliffs come, and the space between obstacles. The same seed builds the same mountain every time. A new level is one line in `data/levels.json`.
- **Fair by proof.** `src/game/solver.ts` searches each level for a way through without a single hit (every jump moment and length, going back when stuck); a unit test fails if any level has a spot that cannot be cleared. Levels 3 and 10 had such a spot with their first seed and were given another.
- **Stars.** One for reaching the feast, one for half the level's potatoes, one for losing no slice (a hit the pan blocks does not count). A replay never takes stars away.
- **Losing.** The wheel breaks: the level starts again from the top.
- **The guests.** Seven friends of the owner, drawn after a photo (`src/render/guests.ts`, sheet `design/art/convives-v2.png`), stand behind a table for seven. They are described by their looks in the code, never by name.
- **The finish.** The slope eases off before the line and lies flat after it; nothing to dodge or pick up near the line. The camera frames the arch and the table and comes closer while the guests cheer (`finish.celebrate` seconds), then the end screen shows the stars.
- **Shared with the Quick Game.** Potatoes and missions count in both; the record is the Quick Game's.
- **Difficulty, from the bot** (`npm run sim`): an imperfect bot clears levels 1–7 every time and levels 8–10 5 % to 45 % of the time.

## The loop

Run → potatoes + mission rewards → shop (new cheese) → run with new strengths → longer
runs → harder missions.

## Systems

| System | Where | Notes |
|--------|-------|-------|
| Terrain | `src/game/terrain.ts` | Seeded; slopes, kickers, cliffs, flats; obstacles, potatoes and bonuses along the way |
| Run | `src/game/run.ts` | Physics from the prototype, unchanged in feel; variable jump; jump buffer and coyote time |
| Levels | `src/game/levels.ts`, `src/game/solver.ts`, `data/levels.json` | Stars, unlocking, the fairness solver |
| Fair terrain | `src/game/terrain.ts` | A landing zone after each kicker or cliff, a smooth run-up before each obstacle, a least gap after tall and short obstacles |
| Bonuses | `src/game/run.ts` | Pan (absorbs one hit), magnet (8 s), turbo pickle (3 s, smashes obstacles), wedge (+1 slice, or +10 potatoes when the wheel is whole) |
| Cheeses | `data/cheeses.json` | Valais (start), Tomme, Emmental, Gruyère, Tête de Moine: slices, size, jump, magnet |
| Missions | `src/game/missions.ts`, `data/missions.json` | 3 active; per run or cumulative; the list loops with bigger targets |
| Tutorial | `src/game/run.ts` | The first run: three obstacles placed by hand, time slows until the player jumps |
| Save | `src/game/save.ts` | localStorage; a broken save falls back to defaults |
| Sound | `src/audio.ts` | All synthesised: rumble, effects, a Ländler in 3/4 |

Every value is in `data/config.json`.

## Balance — first numbers

**Landing zones (decided 2026-11-23).** A wheel thrown by a kicker or a cliff flies for up
to 2.6 s and cannot jump, so an obstacle where it lands was a hit nobody could avoid:
23–27 % of the bot's hits. After every kicker or cliff the terrain now makes a calm
slope of `spawn.landingZone` units (700: about 9 landings in 10 at full speed) with no
obstacle and no new launch. Unavoidable hits fell to 4–8 %.

From `npm run sim` (a bot, 40 runs per level), with the landing zones: about
**1,700 m and 48 potatoes a run**. Shop prices (150 / 400 / 700 / 1200) therefore mean
about 3, 8, 15 and 25 runs, mission rewards aside. A bot is not a player: check these
in playtests before raising the prices.

## Out of scope for now

Online leaderboards, ads, in-app purchases, multiplayer.
