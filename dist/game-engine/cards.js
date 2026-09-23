export const COLORS = ['red', 'blue', 'green', 'yellow'];
export const WILD = 'wild';
export const TYPES = Object.freeze({ NUMBER:'number', STOP:'stop', PLUS2:'plus2', REVERSE:'reverse', PLUS:'plus', TAKI:'taki', CHANGE_COLOR:'changeColor', SUPER_TAKI:'superTaki', KING:'king', PLUS3:'plus3', BROKEN3:'brokenPlus3' });

export const TYPE_LABEL = {
  number:'', stop:'STOP', plus2:'+2', reverse:'↻', plus:'+', taki:'TAKI', changeColor:'COLOR', superTaki:'SUPER TAKI', king:'KING', plus3:'+3', brokenPlus3:'BREAK 3'
};

export function makeCard(type, color = WILD, value = null, id = '') { return { id, type, color, value }; }

// One official 58-card set: 36 numbers, 16 colored commands and 6 colorless cards.
export function createDeckSet(setIndex = 0) {
  const cards = [];
  for (const color of COLORS) {
    for (let value = 1; value <= 9; value++) cards.push(makeCard(TYPES.NUMBER, color, value, `s${setIndex}-${color}-${value}`));
    for (const type of [TYPES.STOP, TYPES.REVERSE, TYPES.PLUS, TYPES.TAKI]) cards.push(makeCard(type, color, null, `s${setIndex}-${color}-${type}`));
  }
  cards.push(makeCard(TYPES.CHANGE_COLOR, WILD, null, `s${setIndex}-change-0`), makeCard(TYPES.CHANGE_COLOR, WILD, null, `s${setIndex}-change-1`));
  cards.push(makeCard(TYPES.SUPER_TAKI, WILD, null, `s${setIndex}-super`));
  cards.push(makeCard(TYPES.KING, WILD, null, `s${setIndex}-king`));
  cards.push(makeCard(TYPES.PLUS3, WILD, null, `s${setIndex}-plus3`));
  cards.push(makeCard(TYPES.BROKEN3, WILD, null, `s${setIndex}-broken3`));
  return cards;
}

export function createDeck() { return [...createDeckSet(0), ...createDeckSet(1)]; }

export function cardMatches(a, b) {
  if (!a || !b) return false;
  if (a.color !== WILD && b.color !== WILD && a.color === b.color) return true;
  if (a.type === TYPES.NUMBER && b.type === TYPES.NUMBER) return a.value === b.value;
  return a.type === b.type;
}

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function shuffled(cards, seed = Date.now()) {
  const result = cards.slice(); const random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
