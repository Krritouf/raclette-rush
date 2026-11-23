// The game's languages. The game is written in French; every text it draws goes through tr():
// in English, tr() looks the French sentence up in EN, then in PATTERNS for sentences with
// numbers or names in them. A sentence missing here stays in French rather than going blank, and
// tests/unit/i18n.test.ts lists the sentences the game draws, so a missing one fails a test.

/** The languages the game speaks. */
export type Lang = 'fr' | 'en';

let lang: Lang = 'fr';

/** Switches the language; the next frame draws in it. */
export function setLang(l: Lang): void { lang = l; }

/** The language in use. */
export function getLang(): Lang { return lang; }

/** A new player's language: the device's, French or English. */
export function defaultLang(): Lang {
  return /^fr\b/i.test(navigator.language || '') ? 'fr' : 'en';
}

/** French sentence -> English. */
export const EN: Record<string, string> = {
  // title, menus
  'RACLETTE': 'RACLETTE', 'RUSH': 'RUSH',
  'JOUER': 'PLAY', 'BOUTIQUE': 'SHOP', 'MISSIONS': 'MISSIONS', 'PAUSE': 'PAUSE', 'REPRENDRE': 'RESUME',
  'RECOMMENCER': 'RESTART', 'RÉGLAGES': 'SETTINGS', 'MENU': 'MENU', 'REJOUER': 'PLAY AGAIN',
  // in play
  'TOUCHE !': 'TAP!', 'RESTE APPUYÉ !': 'HOLD!', 'pour sauter': 'to jump', 'pour un grand saut': 'for a big jump',
  'Meuh !': 'Moo!', 'Aïe !': 'Ouch!', 'Paré !': 'Blocked!', 'Boum !': 'Boom!', 'Hop !': 'Hup!',
  'Poêlon !': 'Pan!', 'Aimant !': 'Magnet!', 'Cornichon turbo !': 'Turbo pickle!', 'Une portion !': 'A slice back!',
  'Ta meule dévale la montagne !': 'Your cheese wheel races down the mountain!',
  'Saute par-dessus les obstacles': 'Jump over the obstacles',
  'Bien joué !': 'Well done!', 'Les pommes de terre se dépensent à la boutique': 'Spend your potatoes in the shop',
  'Mission accomplie !': 'Mission complete!',
  // the end of a run
  'La meule est en miettes !': 'Your wheel is in crumbs!', 'Coincée dans la barrière !': 'Stuck in the fence!',
  'Le sapin a gagné…': 'The fir tree won…', 'Une vache a eu ta meule…': 'A cow got your wheel…',
  'NOUVEAU RECORD !': 'NEW RECORD!',
  // the shop
  'Raclette du Valais': 'Valais Raclette', 'Tomme': 'Tomme', 'Emmental': 'Emmental', 'Gruyère': 'Gruyère', 'Tête de Moine': 'Tête de Moine',
  'La meule classique, bien équilibrée': 'The classic wheel, well balanced',
  'Petite et légère : elle saute plus haut': 'Small and light: it jumps higher',
  'Ses trous attirent les pommes de terre': 'Its holes pull potatoes in',
  'Solide : une portion de plus': 'Sturdy: one more slice',
  'La reine de la montagne : six portions': 'Queen of the mountain: six slices',
  'Portions': 'Slices', 'Saut': 'Jump', 'Aimant': 'Magnet', 'Taille': 'Size',
  'EN JEU': 'ROLLING', 'CHOISIR': 'CHOOSE',
  'Pas assez de pommes de terre': 'Not enough potatoes', 'Chaque descente en rapporte !': 'Every run brings some in!',
  // the missions
  'Attrape un bonus': 'Grab a bonus',
  'Les missions accomplies rapportent des pommes de terre à la fin de la descente': 'Completed missions pay potatoes at the end of the run',
  // the settings
  'Sons': 'Sounds', 'Musique': 'Music', 'Vibrations': 'Vibration', 'Langue': 'Language', 'Revoir le tutoriel': 'Replay the tutorial',
  'Activés': 'On', 'Désactivés': 'Off', 'Activée': 'On', 'Désactivée': 'Off', 'Activées': 'On', 'Désactivées': 'Off',
  'Français': 'Français', 'English': 'English',
  'Le tutoriel rejouera au prochain départ': 'The tutorial plays on the next run',
};

type Rule = [RegExp, (m: RegExpMatchArray) => string];
/** Sentences with numbers or names in them. */
const PATTERNS: Rule[] = [
  [/^Record : (\d+) m$/, m => `Best: ${m[1]} m`],
  [/^ACHETER (\d+)$/, m => `BUY ${m[1]}`],
  [/^Il te manque (\d+)$/, m => `${m[1]} more needed`],
  [/^(.+) : à toi !$/, m => `${tr(m[1])} is yours!`],
  [/^Tu peux acheter : (.+) !$/, m => `You can buy: ${tr(m[1])}!`],
  [/^Parcours (\S+) m en une descente$/, m => `Roll ${m[1]} m in one run`],
  [/^Ramasse (\S+) pommes de terre en une descente$/, m => `Pick up ${m[1]} potatoes in one run`],
  [/^Fais (\S+) m sans aucun choc$/, m => `Roll ${m[1]} m without a hit`],
  [/^Attrape (\S+) bonus en une descente$/, m => `Grab ${m[1]} bonuses in one run`],
  [/^Reste (\S+) s en l'air d'un seul saut$/, m => `Stay ${m[1]} s in the air in one jump`],
  [/^Saute (\S+) fois$/, m => `Jump ${m[1]} times`],
  [/^Saute par-dessus (\S+) vaches$/, m => `Jump over ${m[1]} cows`],
  [/^Saute par-dessus (\S+) sapins$/, m => `Jump over ${m[1]} fir trees`],
  [/^Parcours (\S+) m au total$/, m => `Roll ${m[1]} m in total`],
  [/^Joue (\S+) descentes$/, m => `Play ${m[1]} runs`],
];

/** The English of a French sentence, or null when there is none. */
export function english(s: string): string | null {
  if (EN[s] !== undefined) return EN[s];
  for (const [re, f] of PATTERNS) { const m = s.match(re); if (m) return f(m); }
  return null;
}

/** A text in the language in use (the French source when there is no translation). */
export function tr(s: string): string {
  if (lang === 'fr' || !s) return s;
  return english(s) ?? s;
}
