import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaults } from '../dist/platform/storage.js';
import { makeCard, TYPES } from '../dist/game-engine/cards.js';
import { cardHTML, cardLabel } from '../dist/ui/card.js';
import { getDuelOpponent, localizeDuelOpponent } from '../dist/duel/opponents.js';

test('Hebrew remains the default language', () => {
  assert.equal(defaults.language, 'he');
});

test('card labels and accessibility text localize to English', () => {
  const reverse=makeCard(TYPES.REVERSE,'red',null,'reverse');
  assert.equal(cardLabel(reverse,'en'),'Turnabout');
  assert.match(cardHTML(reverse,{language:'en'}),/aria-label="Turnabout burgundy"/);
  assert.match(cardHTML(null,{hidden:true,language:'en'}),/aria-label="Face-down RUNES card"/);
});

test('duel opponents expose English identity and dialogue', () => {
  const ron=localizeDuelOpponent(getDuelOpponent('ron'),'en');
  assert.equal(ron.name,'Ron');
  assert.match(ron.descriptor,/The Bard/);
  assert.ok(ron.dialoguePools.pleased.every(line=>!/[א-ת]/.test(line)));
});

test('the application offers both language choices and updates document direction', async () => {
  const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(source,/data-language="he"/);
  assert.match(source,/data-language="en"/);
  assert.match(source,/document\.documentElement\.dir=direction\(\)/);
});

test('Bramm bubbles and voice share a captured locale while future lines follow language changes',async()=>{
  const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(source,/resolveBrammReaction\(reaction,settings\.language\)/);
  assert.match(source,/locale:localized\.locale/);
  assert.match(source,/brammCaptionLocale==='he'\?'rtl':'ltr'/);
  assert.match(source,/settings\.captions&&brammCaptionLine/);
  assert.match(source,/if\(isBrammDuel\(\)\)void audioSystem\.preloadVoice\(language\)/);
});

test('settings copy and structure are localized and controls state their value',async()=>{
  const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(source,/קולות ותגובות של דמויות/);
  assert.match(source,/Character voices & reactions/);
  assert.match(source,/data-volume="\$\{volumeKey\}"/);
  assert.match(source,/role="switch"/);
  assert.match(source,/aria-checked="\$\{!!settings\[key\]\}"/);
  assert.match(source,/role="dialog" aria-modal="true"/);
  assert.match(source,/event\.key==='Escape'/);
});

test('player-facing copy uses the RUNES vocabulary',async()=>{
  const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  for(const stale of [/Riposte/,/קוויקסטפ/,/Tavern Game/,/Done — close/,/'(Red|Yellow|Green|Blue)'/])assert.doesNotMatch(source,stale);
  for(const term of ['Crossbow loaded','קשת דרוכה','Keep playing ${color} cards','אפשר להמשיך עם קלפי ${color}','Fire','לירות'])assert.ok(source.includes(term),`missing ${term}`);
  assert.match(source,/ניצחתם בסיבוב/,'Hebrew addresses the player in the plural');
  assert.doesNotMatch(source,/'ניצחת בסיבוב'/);
});

test('Hebrew round announcements use natural verbs and gender',async()=>{
  const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(source,/verb\(penalty\.playerId,'לקח','לקחה'\)/);
  assert.match(source,/הקללה עלתה ל־\+/);
  assert.doesNotMatch(source,/לידכם/);
});
