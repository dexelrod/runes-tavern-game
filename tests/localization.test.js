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
  assert.equal(cardLabel(reverse,'en'),'Riposte');
  assert.match(cardHTML(reverse,{language:'en'}),/aria-label="Riposte"/);
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
  const css=await readFile(new URL('../dist/styles.css',import.meta.url),'utf8');
  assert.match(source,/resolveBrammReaction\(reaction,settings\.language\)/);
  assert.match(source,/locale:localized\.locale/);
  assert.match(source,/brammCaptionLocale==='he'\?'rtl':'ltr'/);
  assert.match(source,/settings\.captions&&brammCaptionLine/);
  assert.match(source,/if\(isBrammDuel\(\)\)void audioSystem\.preloadVoice\(language\)/);
  assert.match(css,/\.bramm-speech\[dir="rtl"\]/);
});

test('settings copy and structure are localized without mirroring the controls', async () => {
  const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  const css=await readFile(new URL('../dist/styles.css',import.meta.url),'utf8');
  assert.match(source,/תגובות יריבים/);
  assert.match(source,/הדגשת קלפים זמינים/);
  assert.match(source,/Opponent reactions/);
  assert.match(source,/data-volume="\$\{volumeKey\}"/);
  assert.match(source,/role="dialog" aria-modal="true"/);
  assert.match(source,/event\.key==='Escape'/);
  assert.match(css,/\.setting-row\{direction:ltr/);
  assert.match(css,/html\[lang="en"\] \.setting-row label/);
});
