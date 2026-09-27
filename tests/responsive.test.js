import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css=await readFile(new URL('../dist/styles.css',import.meta.url),'utf8');
const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
const card=await readFile(new URL('../dist/ui/card.js',import.meta.url),'utf8');

test('presentation defines compact-safe roomy portrait, landscape, wide, and short-window layouts',()=>{
  for(const condition of ['(min-width:600px) and (orientation:portrait)','(min-width:760px) and (min-aspect-ratio:11/10)','(min-width:1180px) and (min-aspect-ratio:13/10)','(min-width:760px) and (max-height:590px)']){
    assert.ok(css.includes(condition),`missing responsive condition ${condition}`);
  }
  assert.match(css,/\.app-shell\{max-width:none;container-type:inline-size/);
});

test('hand spacing is measured from the live container and recalculated after resize',()=>{
  assert.match(app,/function layoutHand\(\)/);
  assert.match(app,/hand\.clientWidth/);
  assert.match(app,/getBoundingClientRect\(\)\.width/);
  assert.match(app,/window\.addEventListener\('resize'/);
  assert.doesNotMatch(card,/Math\.min\(432/);
});

test('card travel resolves source and destination anchors from the live DOM',()=>{
  assert.match(app,/source\.getBoundingClientRect\(\),to=destination\.getBoundingClientRect\(\)/);
  assert.match(app,/data-draw-anchor/);
  assert.match(app,/data-discard-anchor/);
  assert.match(app,/data-hand-anchor/);
});
